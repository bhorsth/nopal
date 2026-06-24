export const formatMinutesToHHMM = (minutes) => {
    const mins = Number(minutes) || 0
    // DHIS2 time format requires hours to be 0-23, so cap at 23:59 (1439 minutes)
    const maxMinutes = 1439
    const cappedMins = Math.min(mins, maxMinutes)
    const h = Math.floor(cappedMins / 60)
    const m = cappedMins % 60
    const hh = String(h).padStart(2, '0')
    const mm = String(m).padStart(2, '0')
    return `${hh}:${mm}`
}

/**
 * Parse HH:mm strings or numeric minute values into total minutes.
 * @param {string|number|null|undefined} value
 * @returns {number|null}
 */
export const parseHmToMinutes = (value) => {
    if (value == null || value === '') {
        return null
    }

    if (typeof value === 'number' && !Number.isNaN(value)) {
        return value
    }

    const trimmed = String(value).trim()
    const hmMatch = trimmed.match(/^(\d+):(\d{2})$/)
    if (hmMatch) {
        return Number(hmMatch[1]) * 60 + Number(hmMatch[2])
    }

    const numeric = Number(trimmed)
    return Number.isNaN(numeric) ? null : numeric
}

export default formatMinutesToHHMM
