import fs from 'fs'
import path from 'path'
import {
    EMS_FIELD_MAPPING_FIELDS,
    EMS_FIELD_MAPPING_KEYS,
} from '../../config/emsFieldMappingDefinitions'
import {
    EMS_DAILY_OUTPUT_KEYS,
    EMS_SKIPPED_HOURS_DHIS2_CODES,
    EMS_SKIPPED_POSTING_SOURCE_KEYS,
} from '../../config/emsDailyAggregation'
import { EMS_DAILY_OUTPUT_LABELS } from '../../config/emsDailyAggregationLabels'
import { aggregateEmsFieldsForDay, aggregateEmsRecordsByDay } from '../aggregateEmsRecordsDaily'
import { formatEmsAggregatedNumber } from '../emsValue'
import { parseImportFileContent } from '../parseImportFile'

const emsSample = path.join(
    __dirname,
    '../../../data/EMS_vestfrost /0D3B7F96E129CE7D_CURRENT_DATA_P31DT22H4M45S.json'
)

describe('aggregateEmsRecordsDaily', () => {
    it('computes verification-sheet aggregations for two 15-minute events', () => {
        const aggregated = aggregateEmsFieldsForDay([
            {
                HCOM: 54,
                TVC: 5.5,
                SVA: 900,
                CMPR: 835,
                DRCV: 7,
                ALRM: 'HEAT',
                LERR: 'E1',
                MSW: true,
                TAMB: 24.8,
            },
            {
                HCOM: 55,
                TVC: 6.5,
                SVA: 900,
                CMPR: 60,
                DRCV: 6,
                ALRM: 'FRZE',
                LERR: 'E2',
                MSW: false,
                TAMB: 27.1,
            },
        ])

        expect(aggregated.HCOM_MIN).toBe(54)
        expect(aggregated.HCOM_AVG).toBe(54.5)
        expect(aggregated.HCOM_MAX).toBe(55)

        expect(aggregated.TVC_MIN).toBe(5.5)
        expect(aggregated.TVC_AVG).toBe(6)
        expect(aggregated.TVC_MAX).toBe(6.5)
        expect(aggregated.TVC_FRZ_SUM).toBe(0)
        expect(aggregated.TVC_LOW_SUM).toBe(0)
        expect(aggregated.TVC_NRM_SUM).toBe(0.5)
        expect(aggregated.TVC_HIG_SUM).toBe(0)

        expect(aggregated.SVA_SEC_SUM).toBe(1800)
        expect(aggregated.CMPR_SEC_SUM).toBe(895)
        expect(aggregated.DRCV_CNT).toBe(13)

        expect(aggregated.ALRM_DLY).toBe('HEAT FRZE')
        expect(aggregated.ALRM_HEAT_CNT).toBe(1)
        expect(aggregated.ALRM_FRZE_CNT).toBe(1)
        expect(aggregated.ALRM_DOOR_CNT).toBe(0)

        expect(aggregated.LERR_DLY).toBe('E1 E2')
        expect(aggregated.MSW_ON).toBe(0.25)

        expect(aggregated.TAMB_AVG).toBeCloseTo(25.95, 10)
        expect(formatEmsAggregatedNumber(aggregated.TAMB_AVG)).toBe('26')
        expect(aggregated).not.toHaveProperty('TVC')
        expect(aggregated).not.toHaveProperty('ALRM')
        expect(aggregated).not.toHaveProperty('MSW')
    })

    it('keeps integer averages as integers and 2450.5 at one decimal', () => {
        const integerAvg = aggregateEmsFieldsForDay([{ ACCD: 2450 }, { ACCD: 2450 }])
        expect(integerAvg.ACCD_AVG).toBe(2450)
        expect(formatEmsAggregatedNumber(integerAvg.ACCD_AVG)).toBe('2450')

        const halfAvg = aggregateEmsFieldsForDay([{ ACCD: 2450 }, { ACCD: 2451 }])
        expect(halfAvg.ACCD_AVG).toBe(2450.5)
        expect(formatEmsAggregatedNumber(halfAvg.ACCD_AVG)).toBe('2450.5')
    })

    it('stringifies hex alarms without inventing PQS tokens', () => {
        const aggregated = aggregateEmsFieldsForDay([
            { ALRM: '0x01' },
            { ALRM: '0x02' },
        ])

        expect(aggregated.ALRM_DLY).toBe('0x01 0x02')
        expect(aggregated.ALRM_HEAT_CNT).toBe(0)
        expect(aggregated.ALRM_FRZE_CNT).toBe(0)
    })

    it('uses the first present SIGN value of the day', () => {
        const aggregated = aggregateEmsFieldsForDay([
            { SIGN: 'abc' },
            { SIGN: 'def' },
        ])
        expect(aggregated.SIGN).toBe('abc')
    })

    it('groups readings by calendar day from ADOP plus RELT using output keys', () => {
        const records = [
            { RELT: 'PT0S', TVC: 8 },
            { RELT: 'PT30M', TVC: 10 },
            { RELT: 'P1DT0H0M0S', TVC: 6 },
        ]

        const daily = aggregateEmsRecordsByDay(records, { adop: '2026-04-28' })

        expect(daily).toHaveLength(2)
        expect(daily[0].date).toBe('2026-04-28')
        expect(daily[0].fields.TVC_AVG).toBe(9)
        expect(daily[0].fields.TVC_MIN).toBe(8)
        expect(daily[0].fields.TVC_MAX).toBe(10)
        expect(daily[0].readingCount).toBe(2)
        expect(daily[1].date).toBe('2026-04-29')
        expect(daily[1].fields.TVC_AVG).toBe(6)
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
        expect(daily[0].fields.TVC_AVG).toBe(5)
        expect(daily[1].fields.TVC_AVG).toBe(8)
    })

    it('does not post RELT, RTCW, ABST or hours-conversion mappings', () => {
        expect(EMS_FIELD_MAPPING_KEYS).not.toEqual(expect.arrayContaining(EMS_SKIPPED_POSTING_SOURCE_KEYS))
        const codes = EMS_FIELD_MAPPING_FIELDS.map((field) => field.dhis2Code)
        EMS_SKIPPED_HOURS_DHIS2_CODES.forEach((code) => {
            expect(codes).not.toContain(code)
        })
        expect(EMS_FIELD_MAPPING_KEYS).toEqual(
            expect.arrayContaining(['TVC_MIN', 'TVC_AVG', 'TVC_MAX', 'ALRM_DLY', 'MSW_ON', 'SVA_SEC_SUM'])
        )
        expect(Object.keys(EMS_DAILY_OUTPUT_LABELS).sort()).toEqual([...EMS_DAILY_OUTPUT_KEYS].sort())
    })

    const maybeIt = fs.existsSync(emsSample) ? it : it.skip

    maybeIt('assigns Vestfrost sample days from ADOP rather than the upload date', () => {
        const parsed = parseImportFileContent(fs.readFileSync(emsSample, 'utf8'), 'device.json')
        const daily = aggregateEmsRecordsByDay(parsed.records, { adop: parsed.metadata.ADOP })
        const today = new Date().toISOString().slice(0, 10)

        expect(parsed.metadata.ADOP).toBe('2026-04-28')
        expect(daily[0].date).toBe('2026-05-05')
        expect(daily[daily.length - 1].date).toBe('2026-05-29')
        expect(daily[daily.length - 1].date).not.toBe(today)
    })
})
