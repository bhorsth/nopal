/**
 * @param {Date} [referenceDate]
 * @returns {string}
 */
export function todayIsoDate(referenceDate = new Date()) {
    return referenceDate.toISOString().slice(0, 10)
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
 * Split planned daily events into creates, updates (today only), and skipped past duplicates.
 * @param {Array<{ date: string }>} plannedItems
 * @param {Map<string, string>} existingEventIdsByKey
 * @param {string} todayDate
 * @param {(item: object) => string} getKey
 */
export function partitionPlannedEventsForSync(
    plannedItems,
    existingEventIdsByKey,
    todayDate,
    getKey
) {
    const creates = []
    const updates = []
    let skippedPastDuplicates = 0

    plannedItems.forEach((item) => {
        const key = getKey(item)
        const existingEventId = existingEventIdsByKey.get(key)

        if (existingEventId) {
            if (item.date === todayDate) {
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
