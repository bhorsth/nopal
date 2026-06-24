import { buildEventDataValues } from '../buildEventDataValues'

const mappings = {
    timeBelowThreshold: 'de-below',
    totalLowAlarmTime: 'de-low',
    timeAboveThreshold: 'de-above',
    totalHighAlarmTime: 'de-high',
    minTemp: 'de-min',
    maxTemp: 'de-max',
    avgStorageTemp: 'de-avg',
    avgAmbientTemp: 'de-ambient',
    status: 'de-status',
    faults: 'de-faults',
    alarmCondition: 'de-alarm',
}

describe('buildEventDataValues', () => {
    it('posts alarm durations as total minutes', () => {
        const record = {
            date: '2024-01-15',
            temperature: { min: -1.2, max: 9.5, avg: 4.1 },
            alarms: [
                { level: 0, accumulatedMinutes: 75 },
                { level: 1, accumulatedMinutes: 150 },
            ],
            sensorTimeoutMinutes: 5,
        }

        const dataValues = buildEventDataValues(record, mappings)

        expect(dataValues).toEqual(
            expect.arrayContaining([
                { dataElement: 'de-below', value: '75' },
                { dataElement: 'de-low', value: '75' },
                { dataElement: 'de-above', value: '150' },
                { dataElement: 'de-high', value: '150' },
                { dataElement: 'de-faults', value: '5' },
                { dataElement: 'de-status', value: 'ALARM' },
                { dataElement: 'de-alarm', value: 'BOTH' },
            ])
        )
    })

    it('posts zero minutes when no alarm time accumulated', () => {
        const record = {
            date: '2024-01-15',
            temperature: { avg: 4.1 },
            alarms: [],
            sensorTimeoutMinutes: null,
        }

        const dataValues = buildEventDataValues(record, mappings)

        expect(dataValues).toEqual(
            expect.arrayContaining([
                { dataElement: 'de-below', value: '0' },
                { dataElement: 'de-low', value: '0' },
                { dataElement: 'de-above', value: '0' },
                { dataElement: 'de-high', value: '0' },
                { dataElement: 'de-faults', value: '0' },
                { dataElement: 'de-status', value: 'OK' },
                { dataElement: 'de-alarm', value: 'OK' },
            ])
        )
    })

    it('posts lower and upper alarm status fields when mapped', () => {
        const record = {
            date: '2024-01-15',
            temperature: { avg: 4.1 },
            alarms: [
                { level: 0, accumulatedMinutes: 30, status: 'in progress', statusNumeric: 1 },
                { level: 1, accumulatedMinutes: 0, status: 'ok', statusNumeric: 0 },
            ],
        }

        const dataValues = buildEventDataValues(record, {
            ...mappings,
            lowerAlarmStatus: 'de-low-status',
            upperAlarmStatus: 'de-high-status',
            lowerAlarmStatusNumeric: 'de-low-num',
            upperAlarmStatusNumeric: 'de-high-num',
        })

        expect(dataValues).toEqual(
            expect.arrayContaining([
                { dataElement: 'de-low-status', value: 'in progress' },
                { dataElement: 'de-high-status', value: 'ok' },
                { dataElement: 'de-low-num', value: '1' },
                { dataElement: 'de-high-num', value: '0' },
            ])
        )
    })
})
