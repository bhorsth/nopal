import { EMS_DAILY_AGGREGATION_BY_SOURCE, EMS_INTERVAL_HOURS } from '../config/emsDailyAggregation'
import { isEmsPresentValue, parseEmsNumeric } from './emsValue'
import { computeEmsOccurredAtTimes } from './isoDuration'

const ALARM_TOKEN_ALIASES = {
    HEAT: ['HEAT'],
    FRZE: ['FRZE', 'FREZ'],
    DOOR: ['DOOR'],
    POWR: ['POWR'],
    DCNT: ['DCNT'],
}

const HEX_VALUE = /^0x[0-9a-f]+$/i

/**
 * @param {unknown[]} values
 * @returns {number[]}
 */
const numericValues = (values) =>
    values.map((value) => parseEmsNumeric(value)).filter((value) => !Number.isNaN(value))

/**
 * @param {unknown} value
 * @returns {boolean}
 */
export const isMswOnValue = (value) => {
    if (value === true) {
        return true
    }
    if (typeof value === 'string' && value.trim().toLowerCase() === 'true') {
        return true
    }
    return false
}

/**
 * @param {unknown} value
 * @param {string} token
 * @returns {number}
 */
export const countAlarmTokenInValue = (value, token) => {
    if (!isEmsPresentValue(value)) {
        return 0
    }
    const text = String(value).trim()
    if (!text || HEX_VALUE.test(text)) {
        return 0
    }
    const aliases = ALARM_TOKEN_ALIASES[token] || [token]
    const parts = text
        .split(/[\s,;]+/)
        .map((part) => part.trim().toUpperCase())
        .filter(Boolean)
    return parts.some((part) => aliases.includes(part)) ? 1 : 0
}

/**
 * @param {number} temperature
 * @param {'frz' | 'low' | 'nrm' | 'hig'} range
 * @returns {boolean}
 */
export const isTvcInRange = (temperature, range) => {
    switch (range) {
        case 'frz':
            return temperature < 0
        case 'low':
            return temperature >= 0 && temperature < 2
        case 'nrm':
            return temperature >= 2 && temperature <= 8
        case 'hig':
            return temperature > 8
        default:
            return false
    }
}

/**
 * @param {{ op: string, token?: string, range?: string }} output
 * @param {unknown[]} rawValues
 * @returns {unknown}
 */
export function applyEmsDailyAggregationOp(output, rawValues) {
    switch (output.op) {
        case 'avg': {
            const numbers = numericValues(rawValues)
            if (numbers.length === 0) {
                return undefined
            }
            return numbers.reduce((total, value) => total + value, 0) / numbers.length
        }
        case 'min': {
            const numbers = numericValues(rawValues)
            if (numbers.length === 0) {
                return undefined
            }
            return Math.min(...numbers)
        }
        case 'max': {
            const numbers = numericValues(rawValues)
            if (numbers.length === 0) {
                return undefined
            }
            return Math.max(...numbers)
        }
        case 'sum': {
            const numbers = numericValues(rawValues)
            if (numbers.length === 0) {
                return undefined
            }
            return numbers.reduce((total, value) => total + value, 0)
        }
        case 'mswOnHours': {
            if (rawValues.length === 0) {
                return undefined
            }
            const onCount = rawValues.filter(isMswOnValue).length
            return onCount * EMS_INTERVAL_HOURS
        }
        case 'concat': {
            const unique = []
            const seen = new Set()
            rawValues.forEach((value) => {
                const text = String(value).trim()
                if (!text || seen.has(text)) {
                    return
                }
                seen.add(text)
                unique.push(text)
            })
            return unique.length > 0 ? unique.join(' ') : undefined
        }
        case 'alarmCount': {
            if (rawValues.length === 0) {
                return undefined
            }
            return rawValues.reduce(
                (total, value) => total + countAlarmTokenInValue(value, output.token),
                0
            )
        }
        case 'tvcRangeHours': {
            const numbers = numericValues(rawValues)
            if (numbers.length === 0) {
                return undefined
            }
            const matching = numbers.filter((value) => isTvcInRange(value, output.range)).length
            return matching * EMS_INTERVAL_HOURS
        }
        case 'first':
            return rawValues.length > 0 ? rawValues[0] : undefined
        default:
            return undefined
    }
}

/**
 * Aggregate EMS interval readings into daily OUTPUT keys (TVC_MIN, ALRM_DLY, …).
 * @param {Array<Record<string, unknown>>} dayRecords
 * @returns {Record<string, unknown>}
 */
export function aggregateEmsFieldsForDay(dayRecords) {
    /** @type {Record<string, unknown>} */
    const aggregated = {}

    Object.entries(EMS_DAILY_AGGREGATION_BY_SOURCE).forEach(([sourceKey, outputs]) => {
        const rawValues = dayRecords.map((record) => record[sourceKey]).filter(isEmsPresentValue)
        outputs.forEach((output) => {
            const value = applyEmsDailyAggregationOp(output, rawValues)
            if (value !== undefined && isEmsPresentValue(value)) {
                aggregated[output.outputKey] = value
            }
        })
    })

    return aggregated
}

/**
 * Group EMS interval records by calendar day.
 * Uses ABST when present, otherwise RELT counted from ADOP at 00:00 UTC.
 * @param {Array<Record<string, unknown>>} records
 * @param {{ adop?: string|Date }} [options]
 * @returns {Array<{ date: string, fields: Record<string, unknown>, readingCount: number }>}
 */
export function aggregateEmsRecordsByDay(records, options = {}) {
    if (!Array.isArray(records) || records.length === 0) {
        return []
    }

    const occurredAtTimes = computeEmsOccurredAtTimes(records, options)
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
