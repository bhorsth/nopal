import { deriveAlarmStatus, enrichAlarmsWithStatus } from '../fridgeTagAlarmStatus'

describe('fridgeTagAlarmStatus', () => {
    it('returns ok when no accumulated time', () => {
        expect(deriveAlarmStatus({ level: 0, accumulatedMinutes: 0 }, { durationMinutes: 60 })).toEqual({
            status: 'ok',
            numeric: 0,
        })
    })

    it('returns in progress when below threshold', () => {
        expect(deriveAlarmStatus({ level: 0, accumulatedMinutes: 30 }, { durationMinutes: 60 })).toEqual({
            status: 'in progress',
            numeric: 1,
        })
    })

    it('returns alarm when threshold met', () => {
        expect(deriveAlarmStatus({ level: 1, accumulatedMinutes: 633 }, { durationMinutes: 600 })).toEqual({
            status: 'alarm',
            numeric: 1,
        })
    })

    it('enriches alarms with status fields', () => {
        const alarms = enrichAlarmsWithStatus(
            [{ level: 0, accumulatedMinutes: 75 }],
            [{ level: 0, durationMinutes: 60 }]
        )
        expect(alarms[0]).toMatchObject({ status: 'alarm', statusNumeric: 1 })
    })
})
