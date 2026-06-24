import { buildFridgeTagEventPayloads } from '../buildFridgeTagEventPayloads'

describe('buildFridgeTagEventPayloads', () => {
    const baseParams = {
        fieldMappings: { minTemp: 'de-min', serialAttribute: 'attr' },
        programId: 'prog',
        programStageId: 'stage',
        trackedEntity: 'tei',
        enrollment: 'enr',
        orgUnit: 'ou',
        referenceDate: new Date('2024-01-15T12:00:00Z'),
    }

    it('partitions creates and updates', () => {
        const parsedData = {
            config: { alarmThresholds: [] },
            history: {
                records: [
                    { date: '2024-01-14', temperature: { min: 1 }, alarms: [] },
                    { date: '2024-01-15', temperature: { min: 2 }, alarms: [] },
                ],
            },
        }

        const result = buildFridgeTagEventPayloads({
            ...baseParams,
            parsedData,
            existingEvents: [
                { event: 'evt-1', occurredAt: '2024-01-14' },
                { event: 'evt-2', occurredAt: '2024-01-15' },
            ],
        })

        expect(result.creates).toHaveLength(0)
        expect(result.updates).toHaveLength(1)
        expect(result.updates[0].date).toBe('2024-01-15')
        expect(result.skippedPastDuplicates).toBe(1)
    })
})
