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
 * @returns {string|null}
 */
export function formatEmsValue(value) {
    if (!isEmsPresentValue(value)) {
        return null
    }

    return String(value)
}
