/**
 * DHIS2 Tracker lookup and registration helpers (browser / app-runtime).
 */

export async function lookupTrackedEntitiesBySerial(engine, { serial, programId, serialAttributeId }) {
    const result = await engine.query({
        trackedEntities: {
            resource: 'tracker/trackedEntities',
            params: {
                filter: `${serialAttributeId}:like:${serial}`,
                fields: 'trackedEntity,trackedEntityType,orgUnit[id,name],attributes[attribute,displayName,value],enrollments[enrollment,orgUnit,program]',
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
                fields: 'trackedEntity,trackedEntityType,orgUnit[id,name],attributes[attribute,displayName,value],enrollments[enrollment,program,orgUnit]',
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
    attributes: attributesOverride,
}) {
    const today = todayIsoDate()
    const attributes =
        attributesOverride ??
        [{ attribute: serialAttributeId, value: serial }]

    return engine.mutate({
        resource: 'tracker',
        type: 'create',
        params: { async: false },
        data: {
            trackedEntities: [
                {
                    trackedEntityType: teTypeId,
                    orgUnit: orgUnitId,
                    attributes,
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
    trackedEntityType,
    orgUnit,
    programId,
    serialAttributeId,
    serial,
    enrollments = [],
    attributes: attributesOverride,
}) {
    const today = todayIsoDate()
    const hasProgramEnrollment = enrollments.some((e) => e.program === programId)

    const attributes =
        attributesOverride ??
        [{ attribute: serialAttributeId, value: serial }]

    const payload = {
        trackedEntity,
        trackedEntityType,
        orgUnit,
        attributes,
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

export const getTeiOrgUnitId = (tei) => {
    const orgUnit = tei?.orgUnit
    if (!orgUnit) {
        return null
    }

    return typeof orgUnit === 'object' ? orgUnit.id : orgUnit
}

export const getTeiFacilityName = (tei) => {
    const facilityAttribute = getTeiAttributeByName(tei, 'Facility name')
    if (facilityAttribute?.value) {
        return facilityAttribute.value
    }

    const orgUnit = tei?.orgUnit
    if (orgUnit && typeof orgUnit === 'object') {
        return orgUnit.name || orgUnit.displayName || null
    }

    return null
}

export const getTeiOrgUnitDisplay = (tei) => {
    const orgUnit = tei?.orgUnit
    if (!orgUnit) {
        return { id: null, name: null }
    }
    if (typeof orgUnit === 'object') {
        return {
            id: orgUnit.id || null,
            name: orgUnit.name || orgUnit.displayName || null,
        }
    }
    return { id: orgUnit, name: null }
}

export const getTeiSummaryInfo = (tei) => ({
    orgUnit: getTeiOrgUnitDisplay(tei),
    facilityName: getTeiFacilityName(tei),
    manufacturer: getTeiAttributeByName(tei, 'Appliance Manufacturer'),
    manufacturerSerial: getTeiAttributeByName(tei, 'Appliance Manufacturer Serial Number'),
    model: getTeiAttributeByName(tei, 'Appliance Model'),
})

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
