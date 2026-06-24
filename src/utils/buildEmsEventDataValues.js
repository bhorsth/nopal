import { EMS_FIELD_MAPPING_FIELDS } from '../config/emsFieldMappingDefinitions'
import { formatEmsValue, isEmsPresentValue } from './emsValue'

const EMS_DATA_ELEMENT_FIELDS = EMS_FIELD_MAPPING_FIELDS.filter((field) => field.kind === 'dataElement')

/**
 * Build tracker event dataValues from an EMS record using configured field mappings.
 * Only includes mapped data elements with present values in the record.
 * @param {Record<string, unknown>} record
 * @param {Record<string, string>} mappings
 */
export function buildEmsEventDataValues(record, mappings) {
    const dataValues = []

    EMS_DATA_ELEMENT_FIELDS.forEach((field) => {
        const dataElement = mappings[field.key]
        if (!dataElement) {
            return
        }

        const rawValue = record[field.key]
        if (!isEmsPresentValue(rawValue)) {
            return
        }

        const value = formatEmsValue(rawValue)
        if (value != null) {
            dataValues.push({ dataElement, value })
        }
    })

    return dataValues
}

/**
 * Group EMS record data values by program stage name from the EMS spec.
 * @param {Record<string, unknown>} record
 * @param {Record<string, string>} mappings
 * @returns {Record<string, Array<{ dataElement: string, value: string }>>}
 */
export function groupEmsRecordDataValuesByStage(record, mappings) {
    /** @type {Record<string, Array<{ dataElement: string, value: string }>>} */
    const byStage = {}

    EMS_DATA_ELEMENT_FIELDS.forEach((field) => {
        const dataElement = mappings[field.key]
        if (!dataElement) {
            return
        }

        const rawValue = record[field.key]
        if (!isEmsPresentValue(rawValue)) {
            return
        }

        const value = formatEmsValue(rawValue)
        if (value == null) {
            return
        }

        const stageName = field.stageOrAttribute || 'Other'
        if (!byStage[stageName]) {
            byStage[stageName] = []
        }
        byStage[stageName].push({ dataElement, value })
    })

    return byStage
}

/**
 * @param {Array<{ id: string, displayName: string }>} stages
 * @returns {Record<string, string>}
 */
export function buildStageNameToIdMap(stages) {
    return Object.fromEntries((stages ?? []).map((stage) => [stage.displayName, stage.id]))
}

/**
 * Build one event payload per calendar day and program stage from daily EMS records.
 * Program stage is inferred from each field's stageOrAttribute in the EMS spec.
 * @param {Array<{ date: string, fields: Record<string, unknown> }>} dailyRecords
 * @param {Record<string, string>} mappings
 * @param {Record<string, string>} stageNameToId
 * @returns {Array<{ date: string, stageName: string, programStageId: string | null, dataValues: Array<{ dataElement: string, value: string }> }>}
 */
export function buildEmsDailyEventsByStage(dailyRecords, mappings, stageNameToId) {
    const events = []

    dailyRecords.forEach((dailyRecord) => {
        const byStage = groupEmsRecordDataValuesByStage(dailyRecord.fields, mappings)

        Object.entries(byStage).forEach(([stageName, dataValues]) => {
            if (dataValues.length === 0) {
                return
            }

            events.push({
                date: dailyRecord.date,
                stageName,
                programStageId: stageNameToId[stageName] || null,
                dataValues,
            })
        })
    })

    return events
}

/**
 * Build TEI attribute values from EMS file header metadata.
 * @param {Record<string, unknown>} metadata
 * @param {Record<string, string>} mappings
 */
export function buildEmsAttributeValues(metadata, mappings) {
    const attributes = []

    EMS_FIELD_MAPPING_FIELDS.forEach((field) => {
        if (field.kind !== 'attribute') {
            return
        }

        const attributeId = mappings[field.key]
        if (!attributeId) {
            return
        }

        const rawValue = metadata[field.key]
        if (!isEmsPresentValue(rawValue)) {
            return
        }

        const value = formatEmsValue(rawValue)
        if (value != null) {
            attributes.push({ attribute: attributeId, value })
        }
    })

    return attributes
}
