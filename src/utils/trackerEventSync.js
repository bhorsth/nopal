/**
 * @param {Date} [referenceDate]
 * @returns {string}
 */
export function todayIsoDate(referenceDate = new Date()) {
    return referenceDate.toISOString().slice(0, 10)
}

/**
 * Latest calendar date among planned sync items (YYYY-MM-DD).
 * For EMS this is the current/incomplete day in the file, not wall-clock today.
 * @param {Array<{ date?: string }>} items
 * @returns {string}
 */
export function latestPlannedIsoDate(items) {
    if (!Array.isArray(items) || items.length === 0) {
        return ''
    }

    return items.reduce((latest, item) => {
        const date = item?.date ? String(item.date).slice(0, 10) : ''
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return latest
        }
        return !latest || date > latest ? date : latest
    }, '')
}

/**
 * @param {Array<{ occurredAt?: string, programStage?: string, event?: string }>} events
 * @param {(event: object) => string | null | undefined} getKey
 * @returns {Map<string, string>}
 */
export function buildExistingEventIdIndex(events, getKey) {
    const index = new Map()
    if (!Array.isArray(events)) {
        return index
    }

    events.forEach((evt) => {
        const key = getKey(evt)
        if (key && evt.event) {
            index.set(key, evt.event)
        }
    })

    return index
}

/**
 * Split planned daily events into creates, updates (current import day only),
 * and skipped past duplicates.
 * @param {Array<{ date: string }>} plannedItems
 * @param {Map<string, string>} existingEventIdsByKey
 * @param {string} updatableDate - Date that may still receive more readings
 * @param {(item: object) => string} getKey
 */
export function partitionPlannedEventsForSync(
    plannedItems,
    existingEventIdsByKey,
    updatableDate,
    getKey
) {
    const creates = []
    const updates = []
    let skippedPastDuplicates = 0

    plannedItems.forEach((item) => {
        const key = getKey(item)
        const existingEventId = existingEventIdsByKey.get(key)

        if (existingEventId) {
            if (item.date === updatableDate) {
                updates.push({ ...item, event: existingEventId })
            } else {
                skippedPastDuplicates += 1
            }
            return
        }

        creates.push(item)
    })

    return { creates, updates, skippedPastDuplicates }
}

/**
 * @param {Array<{ status?: string, stats?: { created?: number, updated?: number, total?: number } }>} results
 */
export function mergeTrackerImportResults(results) {
    if (!Array.isArray(results) || results.length === 0) {
        return null
    }

    if (results.length === 1) {
        return results[0]
    }

    return {
        status: results.every((result) => result.status === 'OK')
            ? 'OK'
            : results[results.length - 1].status,
        stats: {
            created: results.reduce((sum, result) => sum + (result.stats?.created || 0), 0),
            updated: results.reduce((sum, result) => sum + (result.stats?.updated || 0), 0),
            total: results.reduce((sum, result) => sum + (result.stats?.total || 0), 0),
        },
    }
}
