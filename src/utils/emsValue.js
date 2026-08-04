/**
 * @param {unknown} value
 * @returns {boolean}
 */
export function isEmsPresentValue(value) {
    if (value == null || value === '') {
        return false
    }

    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase()
        return normalized !== 'null' && normalized !== 'n/a'
    }

    return true
}

/**
 * @param {unknown} value
 * @returns {number}
 */
export function parseEmsNumeric(value) {
    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : NaN
    }
    if (typeof value === 'string') {
        const trimmed = value.trim().replace(',', '.')
        if (!/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(trimmed)) {
            return NaN
        }
        const numeric = Number(trimmed)
        return Number.isFinite(numeric) ? numeric : NaN
    }
    return NaN
}

/**
 * @param {unknown} value
 * @returns {string|null}
 */
export function formatEmsValue(value) {
    if (!isEmsPresentValue(value)) {
        return null
    }

    return String(value)
}

/** EMS Object IDs shown to at most 1 decimal place in the data preview. */
export const EMS_PREVIEW_ONE_DECIMAL_KEYS = new Set([
    'ACCD', // AC current drawn by the appliance
    'ACSV', // AC supply voltage to the appliance
    'BLOG', // Logger battery remaining
    'CMPR', // Compressor runtime
    'TAMB', // Ambient temperature
    'TVC', // Vaccine Compartment Temperature
])

/**
 * Round a value to one decimal place when it is numeric.
 * @param {unknown} value
 * @returns {number|null}
 */
export function roundEmsToOneDecimal(value) {
    const numeric = parseEmsNumeric(value)
    if (Number.isNaN(numeric)) {
        return null
    }
    return Math.round(numeric * 10) / 10
}

/**
 * Format an EMS value for UI preview. Selected numeric fields are capped at 1 decimal.
 * @param {string} fieldKey
 * @param {unknown} value
 * @returns {string|null}
 */
export function formatEmsPreviewValue(fieldKey, value) {
    if (!isEmsPresentValue(value)) {
        return null
    }

    const key = String(fieldKey || '').trim().toUpperCase()
    if (EMS_PREVIEW_ONE_DECIMAL_KEYS.has(key)) {
        const rounded = roundEmsToOneDecimal(value)
        if (rounded != null) {
            return rounded.toFixed(1)
        }
    }

    return String(value)
}
