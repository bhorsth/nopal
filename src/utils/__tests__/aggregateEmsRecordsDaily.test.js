import fs from 'fs'
import path from 'path'
import { aggregateEmsFieldsForDay, aggregateEmsRecordsByDay } from '../aggregateEmsRecordsDaily'
import { parseImportFileContent } from '../parseImportFile'

const emsSample = path.join(
    __dirname,
    '../../../data/EMS_vestfrost /0D3B7F96E129CE7D_CURRENT_DATA_P31DT22H4M45S.json'
)

describe('aggregateEmsRecordsDaily', () => {
    it('averages numeric fields and keeps the last non-numeric value for the day', () => {
        const aggregated = aggregateEmsFieldsForDay([
            { TVC: 10, ALRM: '0x01' },
            { TVC: 20, ALRM: '0x02' },
        ])

        expect(aggregated.TVC).toBe(15)
        expect(aggregated.ALRM).toBe('0x02')
    })

    it('groups readings by calendar day from ADOP plus RELT', () => {
        const records = [
            { RELT: 'PT0S', TVC: 8 },
            { RELT: 'PT30M', TVC: 10 },
            { RELT: 'P1DT0H0M0S', TVC: 6 },
        ]

        const daily = aggregateEmsRecordsByDay(records, { adop: '2026-04-28' })

        expect(daily).toHaveLength(2)
        expect(daily[0].date).toBe('2026-04-28')
        expect(daily[0].fields.TVC).toBe(9)
        expect(daily[0].readingCount).toBe(2)
        expect(daily[1].date).toBe('2026-04-29')
        expect(daily[1].fields.TVC).toBe(6)
        expect(daily[1].readingCount).toBe(1)
    })

    it('uses ABST calendar days when absolute timestamps are present', () => {
        const daily = aggregateEmsRecordsByDay(
            [
                { ABST: '20260505T010000Z', TVC: 4 },
                { ABST: '20260505T230000Z', TVC: 6 },
                { ABST: '20260506T000000Z', TVC: 8 },
            ],
            { adop: '2026-04-28' }
        )

        expect(daily.map((day) => day.date)).toEqual(['2026-05-05', '2026-05-06'])
        expect(daily[0].fields.TVC).toBe(5)
        expect(daily[1].fields.TVC).toBe(8)
    })

    it('assigns Vestfrost sample days from ADOP rather than the upload date', () => {
        const parsed = parseImportFileContent(fs.readFileSync(emsSample, 'utf8'), 'device.json')
        const daily = aggregateEmsRecordsByDay(parsed.records, { adop: parsed.metadata.ADOP })
        const today = new Date().toISOString().slice(0, 10)

        expect(parsed.metadata.ADOP).toBe('2026-04-28')
        expect(daily[0].date).toBe('2026-05-05')
        expect(daily[daily.length - 1].date).toBe('2026-05-29')
        expect(daily[daily.length - 1].date).not.toBe(today)
    })
})
