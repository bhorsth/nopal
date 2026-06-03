import formatMinutesToHHMM from './timeFormat'

/**
 * Build tracker event dataValues from a parsed history record using configured field mappings.
 * @param {object} record - Parsed history record
 * @param {Record<string, string>} mappings - Field key → data element id
 */
export function buildEventDataValues(record, mappings) {
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

    const coldTime = coldAlarm?.accumulatedMinutes
        ? formatMinutesToHHMM(coldAlarm.accumulatedMinutes)
        : '00:00'
    push('timeBelowThreshold', coldTime)
    push('totalLowAlarmTime', coldTime)

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

    const hotTime = hotAlarm?.accumulatedMinutes
        ? formatMinutesToHHMM(hotAlarm.accumulatedMinutes)
        : '00:00'
    push('timeAboveThreshold', hotTime)
    push('totalHighAlarmTime', hotTime)

    push('faults', record.sensorTimeoutMinutes != null ? record.sensorTimeoutMinutes : '0')
    push('alarmCondition', alarmCondition)

    return dataValues
}
