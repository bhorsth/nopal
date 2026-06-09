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
