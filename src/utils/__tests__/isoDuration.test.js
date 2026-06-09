import { computeEmsOccurredAtTimes, parseIsoDurationToSeconds } from '../isoDuration'

describe('isoDuration', () => {
    it('parses ISO 8601 durations to seconds', () => {
        expect(parseIsoDurationToSeconds('P0DT0H0M0S')).toBe(0)
        expect(parseIsoDurationToSeconds('P7DT18H31M45S')).toBe(7 * 86400 + 18 * 3600 + 31 * 60 + 45)
        expect(parseIsoDurationToSeconds('PT15M')).toBe(900)
    })

    it('computes occurredAt timestamps from RELT values', () => {
        const referenceTime = new Date('2026-06-09T12:00:00.000Z')
        const records = [{ RELT: 'PT30M' }, { RELT: 'PT15M' }, { RELT: 'PT0S' }]
        const times = computeEmsOccurredAtTimes(records, referenceTime)

        expect(times).toHaveLength(3)
        expect(new Date(times[0]).getTime()).toBe(referenceTime.getTime())
        expect(new Date(times[1]).getTime()).toBe(referenceTime.getTime() - 15 * 60 * 1000)
        expect(new Date(times[2]).getTime()).toBe(referenceTime.getTime() - 30 * 60 * 1000)
    })
})
