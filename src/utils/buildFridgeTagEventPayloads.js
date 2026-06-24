import {
    buildExistingEventIdIndex,
    partitionPlannedEventsForSync,
    todayIsoDate,
} from './trackerEventSync'
import { buildEventDataValues } from './buildEventDataValues'

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

/**
 * Build planned Fridge-tag tracker event payloads and partition for sync.
 */
export function buildFridgeTagEventPayloads({
    parsedData,
    fieldMappings,
    programId,
    programStageId,
    trackedEntity,
    enrollment,
    orgUnit,
    existingEvents = [],
    referenceDate,
}) {
    const alarmThresholds = parsedData?.config?.alarmThresholds ?? []
    const validRecords = (parsedData?.history?.records ?? []).filter((record) => {
        const date = record.date?.trim()
        return date && DATE_PATTERN.test(date)
    })

    const existingEventIdsByKey = buildExistingEventIdIndex(
        existingEvents,
        (evt) => (evt.occurredAt ? String(evt.occurredAt).slice(0, 10) : null)
    )

    const todayDate = todayIsoDate(referenceDate)
    const eventPayloads = validRecords.map((record) => ({
        date: record.date.trim(),
        orgUnit,
        occurredAt: record.date.trim(),
        status: 'ACTIVE',
        program: programId,
        programStage: programStageId,
        trackedEntity,
        enrollment,
        dataValues: buildEventDataValues(record, fieldMappings, alarmThresholds),
    }))

    const { creates, updates, skippedPastDuplicates } = partitionPlannedEventsForSync(
        eventPayloads,
        existingEventIdsByKey,
        todayDate,
        (item) => item.date
    )

    return {
        creates,
        updates,
        skippedPastDuplicates,
        validRecords,
        planned: eventPayloads,
    }
}

/**
 * Label planned sync action for a date.
 */
export function getPlannedSyncAction(date, existingEventIdsByKey, todayDate) {
    const existingEventId = existingEventIdsByKey.get(date)
    if (!existingEventId) return 'create'
    if (date === todayDate) return 'update'
    return 'skip'
}
