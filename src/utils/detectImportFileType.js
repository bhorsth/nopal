/** @typedef {'fridgeTag' | 'ems'} ImportDeviceType */

const EMS_HEADER_KEYS = ['LSER', 'AMFR', 'AMOD', 'LMFR', 'LMOD']
const EMS_RECORD_KEYS = ['RELT', 'TVC', 'TAMB', 'RTCW']

/**
 * @param {unknown} data
 * @returns {boolean}
 */
export function isEmsJson(data) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
        return false
    }

    const hasHeader = EMS_HEADER_KEYS.some((key) => key in data)
    const records = data.records
    const hasRecords =
        Array.isArray(records) &&
        records.length > 0 &&
        records.some(
            (record) =>
                record &&
                typeof record === 'object' &&
                EMS_RECORD_KEYS.some((key) => key in record)
        )

    return hasHeader && hasRecords
}

/**
 * @param {unknown} data
 * @returns {boolean}
 */
export function isFridgeTagJson(data) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
        return false
    }

    if (Array.isArray(data.historyRecords)) {
        return true
    }

    if (data.configuration?.serialNumber) {
        return true
    }

    const deviceType = String(data.deviceType || '').toLowerCase()
    return deviceType.includes('fridge') || deviceType.includes('q-tag')
}

/**
 * @param {string} content
 * @returns {boolean}
 */
export function isFridgeTagText(content) {
    const sample = content.slice(0, 4000).toLowerCase()
    return (
        sample.includes('fridge-tag') ||
        sample.includes('fridgetag') ||
        sample.includes('q-tag') ||
        (sample.includes('serial') && sample.includes('history'))
    )
}

/**
 * @param {string} fileName
 * @param {string} content
 * @returns {ImportDeviceType}
 */
export function detectImportFileType(fileName, content) {
    const trimmed = content.trim()
    if (!trimmed) {
        throw new Error('EMPTY_FILE')
    }

    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        let data
        try {
            data = JSON.parse(trimmed)
        } catch {
            throw new Error('INVALID_JSON')
        }

        if (isEmsJson(data)) {
            return 'ems'
        }

        if (isFridgeTagJson(data)) {
            return 'fridgeTag'
        }

        throw new Error('UNKNOWN_JSON')
    }

    if (isFridgeTagText(trimmed)) {
        return 'fridgeTag'
    }

    const lowerName = (fileName || '').toLowerCase()
    if (lowerName.endsWith('.txt')) {
        return 'fridgeTag'
    }

    throw new Error('UNKNOWN_FORMAT')
}
