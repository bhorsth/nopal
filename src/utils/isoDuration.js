/**
 * Parse ISO 8601 duration (e.g. P7DT18H31M45S) to total seconds.
 * @param {string} duration
 * @returns {number}
 */
export function parseIsoDurationToSeconds(duration) {
    if (!duration || typeof duration !== 'string') {
        return 0
    }

    const trimmed = duration.trim()
    const match = trimmed.match(
        /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/i
    )
    if (match) {
        const days = Number(match[1] || 0)
        const hours = Number(match[2] || 0)
        const minutes = Number(match[3] || 0)
        const seconds = Number(match[4] || 0)
        return days * 86400 + hours * 3600 + minutes * 60 + seconds
    }

    // PQS shorthand: PT1 == PT24H (1 day), PT2 == PT48H, ...
    const pqsDays = trimmed.match(/^PT(\d+)$/i)
    if (pqsDays) {
        return Number(pqsDays[1]) * 86400
    }

    return 0
}

/**
 * Parse EMS absolute time (ABST) to an ISO timestamp.
 * Accepts YYYYMMDDThhmmssZ and ISO-8601 date/datetime strings.
 * @param {string} abst
 * @returns {string|null}
 */
export function parseEmsAbsoluteTime(abst) {
    if (!abst || typeof abst !== 'string') {
        return null
    }

    const trimmed = abst.trim()
    const compactDate = trimmed.match(/^(\d{4})(\d{2})(\d{2})$/)
    if (compactDate) {
        const [, year, month, day] = compactDate
        const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)))
        return Number.isNaN(date.getTime()) ? null : date.toISOString()
    }

    const compact = trimmed.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z?$/i)
    if (compact) {
        const [, year, month, day, hour, minute, second] = compact
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

    const iso = trimmed.match(
        /^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?)?Z?$/i
    )
    if (iso) {
        const [, year, month, day, hour, minute, second] = iso
        const date = new Date(
            Date.UTC(
                Number(year),
                Number(month) - 1,
                Number(day),
                Number(hour || 0),
                Number(minute || 0),
                Number(second || 0)
            )
        )
        return Number.isNaN(date.getTime()) ? null : date.toISOString()
    }

    return null
}

/**
 * Parse appliance date of production (ADOP) to UTC midnight milliseconds.
 * @param {string|Date} adop
 * @returns {number|null}
 */
export function parseEmsProductionDate(adop) {
    if (adop instanceof Date && !Number.isNaN(adop.getTime())) {
        return Date.UTC(adop.getUTCFullYear(), adop.getUTCMonth(), adop.getUTCDate())
    }

    const parsed = parseEmsAbsoluteTime(typeof adop === 'string' ? adop : String(adop ?? ''))
    if (!parsed) {
        return null
    }

    const date = new Date(parsed)
    return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
}

/**
 * Compute occurredAt timestamps for EMS records.
 * Uses ABST when present. Otherwise RELT is counted from ADOP at 00:00 UTC
 * (PT0S belongs to the production date; the next 24 hours to ADOP+1, and so on).
 * @param {Array<{ RELT?: string, ABST?: string }>} records
 * @param {{ adop?: string|Date }} [options]
 * @returns {Array<string|null>}
 */
export function computeEmsOccurredAtTimes(records, options = {}) {
    if (!Array.isArray(records) || records.length === 0) {
        return []
    }

    const startMs = parseEmsProductionDate(options?.adop)

    return records.map((record) => {
        if (record.ABST) {
            const parsed = parseEmsAbsoluteTime(record.ABST)
            if (parsed) {
                return parsed
            }
        }

        if (startMs == null) {
            return null
        }

        const seconds = parseIsoDurationToSeconds(record.RELT)
        return new Date(startMs + seconds * 1000).toISOString()
    })
}
