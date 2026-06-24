import {
    buildExistingEventIdIndex,
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

    it('creates new events, updates today, and skips past duplicates', () => {
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
})
