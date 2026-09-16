import {
    computeEmsOccurredAtTimes,
    parseEmsAbsoluteTime,
    parseEmsProductionDate,
    parseIsoDurationToSeconds,
} from '../isoDuration'

describe('isoDuration', () => {
    it('parses ISO 8601 durations to seconds', () => {
        expect(parseIsoDurationToSeconds('P0DT0H0M0S')).toBe(0)
        expect(parseIsoDurationToSeconds('P7DT18H31M45S')).toBe(7 * 86400 + 18 * 3600 + 31 * 60 + 45)
        expect(parseIsoDurationToSeconds('PT15M')).toBe(900)
        expect(parseIsoDurationToSeconds('PT24H')).toBe(86400)
        expect(parseIsoDurationToSeconds('PT1')).toBe(86400)
        expect(parseIsoDurationToSeconds('PT2')).toBe(2 * 86400)
    })

    it('parses compact ABST and ISO date strings', () => {
        expect(parseEmsAbsoluteTime('20260505T183145Z')).toBe('2026-05-05T18:31:45.000Z')
        expect(parseEmsAbsoluteTime('2026-04-28')).toBe('2026-04-28T00:00:00.000Z')
        expect(parseEmsProductionDate('2026-04-28')).toBe(Date.UTC(2026, 3, 28))
        expect(parseEmsProductionDate('20260428')).toBe(Date.UTC(2026, 3, 28))
    })

    it('uses ABST as an absolute timestamp when present', () => {
        const times = computeEmsOccurredAtTimes(
            [{ ABST: '20260505T183145Z', RELT: 'PT0S' }],
            { adop: '2026-04-28' }
        )

        expect(times).toEqual(['2026-05-05T18:31:45.000Z'])
    })

    it('anchors RELT to ADOP at 00:00 UTC so the first 24 hours stay on the production date', () => {
        const times = computeEmsOccurredAtTimes(
            [
                { RELT: 'PT0S' },
                { RELT: 'PT12H' },
                { RELT: 'PT23H59M59S' },
                { RELT: 'PT24H' },
                { RELT: 'PT1' },
                { RELT: 'P1DT12H' },
                { RELT: 'PT2' },
            ],
            { adop: '2026-04-28' }
        )

        expect(times).toEqual([
            '2026-04-28T00:00:00.000Z',
            '2026-04-28T12:00:00.000Z',
            '2026-04-28T23:59:59.000Z',
            '2026-04-29T00:00:00.000Z',
            '2026-04-29T00:00:00.000Z',
            '2026-04-29T12:00:00.000Z',
            '2026-04-30T00:00:00.000Z',
        ])
    })

    it('does not shift dates when the file is imported later than it was exported', () => {
        const records = [{ RELT: 'P7DT18H31M45S' }, { RELT: 'P31DT21H53M32S' }]
        const first = computeEmsOccurredAtTimes(records, { adop: '2026-04-28' })
        const later = computeEmsOccurredAtTimes(records, { adop: '2026-04-28' })

        expect(first).toEqual(['2026-05-05T18:31:45.000Z', '2026-05-29T21:53:32.000Z'])
        expect(later).toEqual(first)
    })

    it('returns null timestamps when neither ABST nor ADOP is available', () => {
        expect(computeEmsOccurredAtTimes([{ RELT: 'PT15M' }])).toEqual([null])
    })
})
