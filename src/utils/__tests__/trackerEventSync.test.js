import {
    buildExistingEventIdIndex,
    latestPlannedIsoDate,
    partitionPlannedEventsForSync,
    todayIsoDate,
} from '../trackerEventSync'

describe('trackerEventSync', () => {
    it('indexes existing events by custom key', () => {
        const index = buildExistingEventIdIndex(
            [
                { occurredAt: '2026-06-09', programStage: 'stage-a', event: 'evt-1' },
                { occurredAt: '2026-06-10T12:00:00.000Z', programStage: 'stage-b', event: 'evt-2' },
            ],
            (evt) => `${String(evt.occurredAt).slice(0, 10)}:${evt.programStage}`
        )

        expect(index.get('2026-06-09:stage-a')).toBe('evt-1')
        expect(index.get('2026-06-10:stage-b')).toBe('evt-2')
    })

    it('creates new events, updates the current import day, and skips past duplicates', () => {
        const today = todayIsoDate(new Date('2026-06-10T15:00:00.000Z'))
        const planned = [
            { date: '2026-06-08', value: 1 },
            { date: '2026-06-09', value: 2 },
            { date: today, value: 3 },
            { date: '2026-06-11', value: 4 },
        ]
        const existing = new Map([
            ['2026-06-09', 'evt-old'],
            [today, 'evt-today'],
        ])

        const { creates, updates, skippedPastDuplicates } = partitionPlannedEventsForSync(
            planned,
            existing,
            today,
            (item) => item.date
        )

        expect(creates).toEqual([{ date: '2026-06-08', value: 1 }, { date: '2026-06-11', value: 4 }])
        expect(updates).toEqual([{ date: today, value: 3, event: 'evt-today' }])
        expect(skippedPastDuplicates).toBe(1)
    })

    it('updates the latest ADOP-based day on re-import, not wall-clock today', () => {
        const planned = [
            { date: '2026-05-05', programStage: 'ems' },
            { date: '2026-05-28', programStage: 'ems' },
            { date: '2026-05-29', programStage: 'ems' },
        ]
        const existing = new Map([
            ['2026-05-05:ems', 'evt-old'],
            ['2026-05-29:ems', 'evt-latest'],
        ])
        const wallClockToday = '2026-09-16'
        const updatableDate = latestPlannedIsoDate(planned)

        expect(updatableDate).toBe('2026-05-29')
        expect(updatableDate).not.toBe(wallClockToday)

        const usingWallClock = partitionPlannedEventsForSync(
            planned,
            existing,
            wallClockToday,
            (item) => `${item.date}:${item.programStage}`
        )
        expect(usingWallClock.creates).toEqual([{ date: '2026-05-28', programStage: 'ems' }])
        expect(usingWallClock.updates).toEqual([])
        expect(usingWallClock.skippedPastDuplicates).toBe(2)

        const { creates, updates, skippedPastDuplicates } = partitionPlannedEventsForSync(
            planned,
            existing,
            updatableDate,
            (item) => `${item.date}:${item.programStage}`
        )

        expect(creates).toEqual([{ date: '2026-05-28', programStage: 'ems' }])
        expect(updates).toEqual([{ date: '2026-05-29', programStage: 'ems', event: 'evt-latest' }])
        expect(skippedPastDuplicates).toBe(1)
    })
})
