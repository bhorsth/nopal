import { mergeTrackerImportResults } from '../utils/trackerEventSync'

const TRACKER_EVENTS_FIELDS =
    'trackedEntity,enrollments[enrollment,events[event,occurredAt,status,programStage,dataValues[dataElement,value]]]'

/**
 * @param {import('@dhis2/app-runtime').DataEngine} engine
 * @param {{ serial: string, programId: string, serialAttributeId: string, limit?: number }} options
 */
export async function fetchTrackerEventsBySerial(
    engine,
    { serial, programId, serialAttributeId, limit = 60 }
) {
    const result = await engine.query({
        trackedEntities: {
            resource: 'tracker/trackedEntities',
            params: {
                filter: `${serialAttributeId}:like:${serial}`,
                fields: TRACKER_EVENTS_FIELDS,
                program: programId,
                orgUnitMode: 'ACCESSIBLE',
            },
        },
    })

    const entities = result?.trackedEntities?.trackedEntities ?? []
    const allEvents = []

    entities.forEach((tei) => {
        if (!Array.isArray(tei.enrollments)) {
            return
        }

        tei.enrollments.forEach((enrollment) => {
            if (!Array.isArray(enrollment.events)) {
                return
            }

            allEvents.push(
                ...enrollment.events.map((evt) => ({
                    ...evt,
                    trackedEntity: tei.trackedEntity,
                    enrollment: enrollment.enrollment,
                }))
            )
        })
    })

    const sortedEvents = allEvents
        .sort((a, b) => new Date(b.occurredAt || 0) - new Date(a.occurredAt || 0))
        .slice(0, limit)

    return { serial, events: sortedEvents }
}

/**
 * @param {import('@dhis2/app-runtime').DataEngine} engine
 * @param {{ eventsToCreate?: object[], eventsToUpdate?: object[] }} payload
 */
export async function syncTrackerEventPayloads(engine, { eventsToCreate = [], eventsToUpdate = [] }) {
    const results = []

    if (eventsToCreate.length > 0) {
        results.push(
            await engine.mutate({
                resource: 'tracker',
                type: 'create',
                params: { async: false },
                data: { events: eventsToCreate },
            })
        )
    }

    if (eventsToUpdate.length > 0) {
        results.push(
            await engine.mutate({
                resource: 'tracker',
                type: 'update',
                params: { async: false },
                data: { events: eventsToUpdate },
            })
        )
    }

    return mergeTrackerImportResults(results)
}
