import { aggregateEmsFieldsForDay, aggregateEmsRecordsByDay } from '../aggregateEmsRecordsDaily'

describe('aggregateEmsRecordsDaily', () => {
    it('averages numeric fields and keeps the last non-numeric value for the day', () => {
        const aggregated = aggregateEmsFieldsForDay([
            { TVC: 10, ALRM: '0x01' },
            { TVC: 20, ALRM: '0x02' },
        ])

        expect(aggregated.TVC).toBe(15)
        expect(aggregated.ALRM).toBe('0x02')
    })

    it('groups readings by calendar day relative to upload time', () => {
        const referenceTime = new Date('2026-06-10T12:00:00.000Z')
        const records = [
            { RELT: 'PT0S', TVC: 8 },
            { RELT: 'PT30M', TVC: 10 },
            { RELT: 'P1DT0H0M0S', TVC: 6 },
        ]

        const daily = aggregateEmsRecordsByDay(records, referenceTime)

        expect(daily).toHaveLength(2)
        expect(daily[0].date).toBe('2026-06-09')
        expect(daily[0].fields.TVC).toBe(6)
        expect(daily[1].date).toBe('2026-06-10')
        expect(daily[1].fields.TVC).toBe(9)
        expect(daily[1].readingCount).toBe(2)
    })
})
