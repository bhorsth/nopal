/**
 * DHIS2 Tracker lookup and registration helpers (browser / app-runtime).
 */

export async function lookupTrackedEntitiesBySerial(engine, { serial, programId, serialAttributeId }) {
    const result = await engine.query({
        trackedEntities: {
            resource: 'tracker/trackedEntities',
            params: {
                filter: `${serialAttributeId}:like:${serial}`,
                fields: 'trackedEntity,orgUnit,attributes[attribute,displayName,value],enrollments[enrollment,orgUnit,program]',
                program: programId,
                orgUnitMode: 'ACCESSIBLE',
            },
        },
    })
    return result?.trackedEntities?.trackedEntities ?? []
}

export async function listProgramTrackedEntities(engine, { programId, pageSize = 100 }) {
    const result = await engine.query({
        trackedEntities: {
            resource: 'tracker/trackedEntities',
            params: {
                fields: 'trackedEntity,orgUnit,attributes[attribute,displayName,value],enrollments[enrollment,program,orgUnit]',
                program: programId,
                orgUnitMode: 'ACCESSIBLE',
                pageSize,
            },
        },
    })
    return result?.trackedEntities?.trackedEntities ?? []
}

const todayIsoDate = () => new Date().toISOString().slice(0, 10)

export async function registerNewAppliance(engine, {
    programId,
    orgUnitId,
    teTypeId,
    serialAttributeId,
    serial,
}) {
    const today = todayIsoDate()
    return engine.mutate({
        resource: 'tracker',
        type: 'create',
        params: { async: false },
        data: {
            trackedEntities: [
                {
                    trackedEntityType: teTypeId,
                    orgUnit: orgUnitId,
                    attributes: [{ attribute: serialAttributeId, value: serial }],
                    enrollments: [
                        {
                            program: programId,
                            orgUnit: orgUnitId,
                            enrolledAt: today,
                            occurredAt: today,
                        },
                    ],
                },
            ],
        },
    })
}

export async function linkLoggerToExistingAppliance(engine, {
    trackedEntity,
    orgUnit,
    programId,
    serialAttributeId,
    serial,
    enrollments = [],
}) {
    const today = todayIsoDate()
    const hasProgramEnrollment = enrollments.some((e) => e.program === programId)

    const payload = {
        trackedEntity,
        orgUnit,
        attributes: [{ attribute: serialAttributeId, value: serial }],
    }

    if (!hasProgramEnrollment) {
        payload.enrollments = [
            {
                program: programId,
                orgUnit,
                enrolledAt: today,
                occurredAt: today,
            },
        ]
    }

    return engine.mutate({
        resource: 'tracker',
        type: 'create',
        params: { async: false },
        data: {
            trackedEntities: [payload],
        },
    })
}

export const getTeiAttributeByName = (tei, nameFragment) => {
    const attributes = Array.isArray(tei?.attributes) ? tei.attributes : []
    const needle = nameFragment.toLowerCase()
    return attributes.find(
        (attr) =>
            attr.displayName === nameFragment ||
            attr.displayName?.toLowerCase().includes(needle)
    )
}

export const formatTeiOptionLabel = (tei, serialAttributeId) => {
    const serialAttr = tei.attributes?.find((a) => a.attribute === serialAttributeId)
    const manufacturer = getTeiAttributeByName(tei, 'Appliance Manufacturer')
    const model = getTeiAttributeByName(tei, 'Appliance Model')
    const manufacturerSerial = getTeiAttributeByName(tei, 'Appliance Manufacturer Serial Number')

    const parts = [
        serialAttr?.value && `Logger: ${serialAttr.value}`,
        manufacturer?.value && manufacturer.value,
        model?.value && model.value,
        manufacturerSerial?.value && `S/N: ${manufacturerSerial.value}`,
    ].filter(Boolean)

    return parts.length > 0 ? parts.join(' · ') : tei.trackedEntity
}
