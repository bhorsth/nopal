import { parseHmToMinutes } from './timeFormat'
import { enrichAlarmsWithStatus } from './fridgeTagAlarmStatus'

/**
 * Parse Fridge-tag JSON export (e.g. Q-tag app export) into the same shape as fridgeTagParser.toJson().
 * @param {Record<string, unknown>} raw
 */
export function parseFridgeTagJson(raw) {
    const configuration = raw.configuration || {}
    const historyRecords = Array.isArray(raw.historyRecords) ? raw.historyRecords : []

    const alarmThresholds = []
    const alarmSettings = configuration.alarmSettings || {}
    Object.entries(alarmSettings).forEach(([level, settings]) => {
        if (!settings || typeof settings !== 'object') return
        const levelNum = Number(level)
        alarmThresholds.push({
            level: levelNum,
            type: levelNum === 0 ? 'cold' : 'hot',
            temperatureLimit: settings.temperatureLimit ?? null,
            durationMinutes: settings.timeLimit ?? null,
        })
    })

    const records = historyRecords.map((record, index) => {
        const alarms = Object.entries(record.alarms || {}).map(([level, alarm]) => {
            const levelNum = Number(level)
            return {
                level: levelNum,
                type: levelNum === 0 ? 'cold' : 'hot',
                accumulatedMinutes: parseHmToMinutes(alarm?.accumulatedTime),
                triggerTime: alarm?.alarmTimestamp || null,
                eventCount: alarm?.alarmCount ?? null,
            }
        })

        return {
            day: index + 1,
            date: record.date || null,
            temperature: {
                min: record.minTemperature ?? null,
                minTime: record.timestampMinTemperature ?? null,
                max: record.maxTemperature ?? null,
                maxTime: record.timestampMaxTemperature ?? null,
                avg: record.averageTemperature ?? null,
            },
            alarms: enrichAlarmsWithStatus(
                alarms.sort((a, b) => a.level - b.level),
                alarmThresholds
            ),
            sensorTimeoutMinutes: parseHmToMinutes(
                record.internalSensorTimeout?.accumulatedSensorTimeout
            ),
            events: record.eventCount ?? null,
            verified: null,
        }
    })

    return {
        deviceType: 'fridgeTag',
        device: {
            name: raw.deviceType || null,
            version: raw.softwareVersion || null,
            firmwareVersion: raw.firmwareVersion || null,
            sensorCount: raw.sensorType ?? null,
        },
        config: {
            serial: configuration.serialNumber || null,
            pcb: configuration.pcbVersion || null,
            cid: configuration.customerId || null,
            lot: configuration.lotNumber || null,
            zone: configuration.timeZoneOffsetHours ?? null,
            alarmThresholds: alarmThresholds.sort((a, b) => a.level - b.level),
        },
        history: {
            activationTimestamp: null,
            reportCreationTimestamp: null,
            recordCount: records.length,
            records,
        },
        certificate: raw.certificate || null,
        signatures: null,
    }
}
