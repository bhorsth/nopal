import { EMS_FIELD_MAPPING_FIELDS } from '../config/emsFieldMappingDefinitions'

/**
 * Build TEI attributes for registration from parsed device data and field mappings.
 * @param {object} params
 * @param {'fridgeTag' | 'ems'} params.deviceType
 * @param {object} params.parsedData
 * @param {Record<string, string>} params.fieldMappings
 * @param {string} params.serialAttributeId
 * @param {string} params.serial
 */
export function buildRegistrationAttributes({
    deviceType,
    parsedData,
    fieldMappings,
    serialAttributeId,
    serial,
}) {
    const attributes = []
    const seen = new Set()

    const pushAttribute = (attributeId, value) => {
        if (!attributeId || value == null || value === '' || seen.has(attributeId)) {
            return
        }
        seen.add(attributeId)
        attributes.push({ attribute: attributeId, value: String(value) })
    }

    pushAttribute(serialAttributeId, serial)

    if (deviceType === 'ems') {
        const metadata = parsedData?.metadata ?? {}
        EMS_FIELD_MAPPING_FIELDS.filter((field) => field.kind === 'attribute').forEach((field) => {
            pushAttribute(fieldMappings[field.key], metadata[field.key])
        })
    } else if (deviceType === 'fridgeTag') {
        const config = parsedData?.config ?? {}
        const device = parsedData?.device ?? {}
        const fridgeTagAttributeSources = {
            pcb: config.pcb,
            lot: config.lot,
            cid: config.cid,
        }
        Object.entries(fridgeTagAttributeSources).forEach(([key, value]) => {
            pushAttribute(fieldMappings[key], value)
        })
        if (fieldMappings.firmwareVersion) {
            pushAttribute(fieldMappings.firmwareVersion, device.firmwareVersion)
        }
    }

    return attributes
}

/**
 * Preview attributes that will be written vs skipped during registration.
 */
export function previewRegistrationAttributes(params) {
    const attributes = buildRegistrationAttributes(params)
    const written = attributes.map((attr) => ({
        attributeId: attr.attribute,
        value: attr.value,
    }))
    return { written, skipped: [] }
}
