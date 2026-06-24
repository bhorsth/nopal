import { deriveAlarmStatus, getThresholdForLevel } from './fridgeTagAlarmStatus'

/**
 * Build tracker event dataValues from a parsed history record using configured field mappings.
 * @param {object} record - Parsed history record
 * @param {Record<string, string>} mappings - Field key → data element id
 * @param {Array<{ level: number, durationMinutes?: number|null }>} [alarmThresholds]
 */
export function buildEventDataValues(record, mappings, alarmThresholds = []) {
    const coldAlarm = record.alarms?.find((a) => a.level === 0)
    const hotAlarm = record.alarms?.find((a) => a.level === 1)

    const hasAlarms =
        (coldAlarm?.accumulatedMinutes && coldAlarm.accumulatedMinutes > 0) ||
        (hotAlarm?.accumulatedMinutes && hotAlarm.accumulatedMinutes > 0)
    const status = hasAlarms ? 'ALARM' : 'OK'

    let alarmCondition = 'OK'
    if (coldAlarm?.accumulatedMinutes && coldAlarm.accumulatedMinutes > 0) {
        alarmCondition =
            hotAlarm?.accumulatedMinutes && hotAlarm.accumulatedMinutes > 0 ? 'BOTH' : 'COLD'
    } else if (hotAlarm?.accumulatedMinutes && hotAlarm.accumulatedMinutes > 0) {
        alarmCondition = 'HEAT'
    }

    const dataValues = []
    const push = (mappingKey, value) => {
        const dataElement = mappings[mappingKey]
        if (dataElement && value != null && value !== '') {
            dataValues.push({ dataElement, value: String(value) })
        }
    }

    const coldMinutes = coldAlarm?.accumulatedMinutes ?? 0
    push('timeBelowThreshold', coldMinutes)
    push('totalLowAlarmTime', coldMinutes)

    if (record.temperature?.min != null) {
        push('minTemp', record.temperature.min)
    }

    push('status', status)

    if (record.temperature?.avg != null) {
        push('avgStorageTemp', record.temperature.avg)
        push('avgAmbientTemp', record.temperature.avg)
    }

    if (record.temperature?.max != null) {
        push('maxTemp', record.temperature.max)
    }

    const hotMinutes = hotAlarm?.accumulatedMinutes ?? 0
    push('timeAboveThreshold', hotMinutes)
    push('totalHighAlarmTime', hotMinutes)

    push('faults', record.sensorTimeoutMinutes != null ? record.sensorTimeoutMinutes : '0')
    push('alarmCondition', alarmCondition)

    const coldStatus =
        coldAlarm?.status ??
        deriveAlarmStatus(coldAlarm, getThresholdForLevel(alarmThresholds, 0)).status
    const hotStatus =
        hotAlarm?.status ??
        deriveAlarmStatus(hotAlarm, getThresholdForLevel(alarmThresholds, 1)).status
    const coldNumeric =
        coldAlarm?.statusNumeric ??
        deriveAlarmStatus(coldAlarm, getThresholdForLevel(alarmThresholds, 0)).numeric
    const hotNumeric =
        hotAlarm?.statusNumeric ??
        deriveAlarmStatus(hotAlarm, getThresholdForLevel(alarmThresholds, 1)).numeric

    push('lowerAlarmStatus', coldStatus)
    push('upperAlarmStatus', hotStatus)
    push('lowerAlarmStatusNumeric', coldNumeric)
    push('upperAlarmStatusNumeric', hotNumeric)

    return dataValues
}
