/**
 * Parse ISO 8601 duration (e.g. P7DT18H31M45S) to total seconds.
 * @param {string} duration
 * @returns {number}
 */
export function parseIsoDurationToSeconds(duration) {
    if (!duration || typeof duration !== 'string') {
        return 0
    }

    const match = duration.match(
        /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/i
    )
    if (!match) {
        return 0
    }

    const days = Number(match[1] || 0)
    const hours = Number(match[2] || 0)
    const minutes = Number(match[3] || 0)
    const seconds = Number(match[4] || 0)

    return days * 86400 + hours * 3600 + minutes * 60 + seconds
}

/**
 * Compute occurredAt timestamps for EMS records from RELT values.
 * Uses the maximum RELT as the newest reading aligned to referenceTime.
 * @param {Array<{ RELT?: string }>} records
 * @param {Date} [referenceTime]
 * @returns {string[]}
 */
export function computeEmsOccurredAtTimes(records, referenceTime = new Date()) {
    if (!Array.isArray(records) || records.length === 0) {
        return []
    }

    const relSeconds = records.map((record) => parseIsoDurationToSeconds(record.RELT))
    const maxSeconds = Math.max(...relSeconds, 0)
    const refMs = referenceTime.getTime()

    return records.map((record, index) => {
        if (record.ABST) {
            const parsed = parseEmsAbsoluteTime(record.ABST)
            if (parsed) return parsed
        }

        const seconds = relSeconds[index] ?? 0
        const offsetMs = (maxSeconds - seconds) * 1000
        return new Date(refMs - offsetMs).toISOString()
    })
}

/**
 * @param {string} abst - YYYYMMDDThhmmssZ format
 * @returns {string|null}
 */
export function parseEmsAbsoluteTime(abst) {
    if (!abst || typeof abst !== 'string') {
        return null
    }

    const match = abst.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z?$/i)
    if (!match) {
        return null
    }

    const [, year, month, day, hour, minute, second] = match
    const date = new Date(
        Date.UTC(
            Number(year),
            Number(month) - 1,
            Number(day),
            Number(hour),
            Number(minute),
            Number(second)
        )
    )

    return Number.isNaN(date.getTime()) ? null : date.toISOString()
}
