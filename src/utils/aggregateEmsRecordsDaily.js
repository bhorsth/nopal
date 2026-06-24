import { computeEmsOccurredAtTimes } from './isoDuration'
import { isEmsPresentValue } from './emsValue'

/**
 * @param {unknown} value
 * @returns {boolean}
 */
const isNumericAggregateValue = (value) => {
    if (typeof value === 'number' && !Number.isNaN(value)) {
        return true
    }
    if (typeof value === 'string') {
        const trimmed = value.trim()
        if (trimmed === '' || /^0x[0-9a-f]+$/i.test(trimmed)) {
            return false
        }
        return /^-?\d+(\.\d+)?$/.test(trimmed)
    }
    return false
}

/**
 * Aggregate EMS interval readings into one set of field values per calendar day.
 * Numeric fields use the daily average; other fields use the last reading of the day.
 * @param {Array<Record<string, unknown>>} dayRecords
 * @returns {Record<string, unknown>}
 */
export function aggregateEmsFieldsForDay(dayRecords) {
    const fieldKeys = new Set()
    dayRecords.forEach((record) => {
        Object.keys(record).forEach((key) => fieldKeys.add(key))
    })

    /** @type {Record<string, unknown>} */
    const aggregated = {}

    fieldKeys.forEach((key) => {
        const values = dayRecords.map((record) => record[key]).filter(isEmsPresentValue)
        if (values.length === 0) {
            return
        }

        if (values.every(isNumericAggregateValue)) {
            const numbers = values.map((value) => Number(value))
            const sum = numbers.reduce((total, value) => total + value, 0)
            aggregated[key] = sum / numbers.length
            return
        }

        aggregated[key] = values[values.length - 1]
    })

    return aggregated
}

/**
 * Group EMS interval records by calendar day using RELT relative to upload time.
 * @param {Array<Record<string, unknown>>} records
 * @param {Date} [referenceTime] - Upload time; newest RELT aligns to this moment
 * @returns {Array<{ date: string, fields: Record<string, unknown>, readingCount: number }>}
 */
export function aggregateEmsRecordsByDay(records, referenceTime = new Date()) {
    if (!Array.isArray(records) || records.length === 0) {
        return []
    }

    const occurredAtTimes = computeEmsOccurredAtTimes(records, referenceTime)
    /** @type {Map<string, Array<Record<string, unknown>>>} */
    const recordsByDay = new Map()

    records.forEach((record, index) => {
        const occurredAt = occurredAtTimes[index]
        if (!occurredAt) {
            return
        }

        const date = occurredAt.slice(0, 10)
        if (!recordsByDay.has(date)) {
            recordsByDay.set(date, [])
        }
        recordsByDay.get(date).push(record)
    })

    return [...recordsByDay.entries()]
        .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
        .map(([date, dayRecords]) => ({
            date,
            fields: aggregateEmsFieldsForDay(dayRecords),
            readingCount: dayRecords.length,
        }))
}
