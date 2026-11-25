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
 * Round posted aggregation numbers: integers stay integers; other values 1 decimal.
 * @param {unknown} value
 * @returns {number|null}
 */
export function roundEmsAggregatedNumber(value) {
    const numeric = parseEmsNumeric(value)
    if (Number.isNaN(numeric)) {
        return null
    }
    const rounded = Math.round(numeric * 10) / 10
    return Object.is(rounded, -0) ? 0 : rounded
}

/**
 * @param {unknown} value
 * @returns {string|null}
 */
export function formatEmsAggregatedNumber(value) {
    const rounded = roundEmsAggregatedNumber(value)
    if (rounded == null) {
        return null
    }
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
}

/**
 * @param {unknown} value
 * @returns {string|null}
 */
export function formatEmsValue(value) {
    if (!isEmsPresentValue(value)) {
        return null
    }

    const aggregated = formatEmsAggregatedNumber(value)
    if (aggregated != null) {
        return aggregated
    }

    return String(value)
}

/** @deprecated Use roundEmsAggregatedNumber; kept for callers that expect 1-decimal rounding. */
export function roundEmsToOneDecimal(value) {
    return roundEmsAggregatedNumber(value)
}

/**
 * Format an EMS value for UI preview. Numeric aggregation outputs use integer-or-1-decimal rounding.
 * @param {string} fieldKey
 * @param {unknown} value
 * @returns {string|null}
 */
export function formatEmsPreviewValue(fieldKey, value) {
    if (!isEmsPresentValue(value)) {
        return null
    }

    const aggregated = formatEmsAggregatedNumber(value)
    if (aggregated != null) {
        return aggregated
    }

    return String(value)
}
