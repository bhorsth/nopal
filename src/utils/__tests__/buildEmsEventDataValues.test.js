import {
    buildEmsDailyEventsByStage,
    buildEmsEventDataValues,
    buildEmsAttributeValues,
    groupEmsRecordDataValuesByStage,
} from '../buildEmsEventDataValues'

describe('buildEmsEventDataValues', () => {
    it('includes only mapped aggregated outputs with present values and rounds numbers', () => {
        const record = {
            RELT: 'PT15M',
            TVC_AVG: 5.74,
            TAMB_AVG: 31.9,
            TFRZ_AVG: null,
            ALRM_DLY: 'HEAT FRZE',
            ACCD_AVG: 2450.5,
        }
        const mappings = {
            RELT: 'de-relt',
            TVC_AVG: 'de-tvc-avg',
            TAMB_AVG: 'de-tamb-avg',
            TFRZ_AVG: 'de-tfrz-avg',
            ALRM_DLY: 'de-alrm-dly',
            ACCD_AVG: 'de-accd-avg',
        }

        const dataValues = buildEmsEventDataValues(record, mappings)

        expect(dataValues).toEqual(
            expect.arrayContaining([
                { dataElement: 'de-tvc-avg', value: '5.7' },
                { dataElement: 'de-tamb-avg', value: '31.9' },
                { dataElement: 'de-alrm-dly', value: 'HEAT FRZE' },
                { dataElement: 'de-accd-avg', value: '2450.5' },
            ])
        )
        expect(dataValues.find((row) => row.dataElement === 'de-relt')).toBeUndefined()
        expect(dataValues).toHaveLength(4)
    })

    it('groups data values under the single EMS program stage', () => {
        const record = { TVC_AVG: 5.7, TAMB_AVG: 31.9, ALRM_DLY: 'HEAT' }
        const mappings = { TVC_AVG: 'de-tvc', TAMB_AVG: 'de-tamb', ALRM_DLY: 'de-alrm' }
        const stageName = 'Equipment Monitoring System (EMS) data'

        const byStage = groupEmsRecordDataValuesByStage(record, mappings)

        expect(Object.keys(byStage)).toEqual([stageName])
        expect(byStage[stageName]).toEqual(
            expect.arrayContaining([
                { dataElement: 'de-tvc', value: '5.7' },
                { dataElement: 'de-tamb', value: '31.9' },
                { dataElement: 'de-alrm', value: 'HEAT' },
            ])
        )
        expect(byStage[stageName]).toHaveLength(3)
    })

    it('builds one event per day for the EMS program stage', () => {
        const dailyRecords = [
            { date: '2026-06-10', fields: { TVC_AVG: 5, TAMB_AVG: 20 } },
        ]
        const mappings = { TVC_AVG: 'de-tvc', TAMB_AVG: 'de-tamb' }
        const stageName = 'Equipment Monitoring System (EMS) data'
        const stageNameToId = {
            [stageName]: 'stage-ems',
        }

        const events = buildEmsDailyEventsByStage(dailyRecords, mappings, stageNameToId)

        expect(events).toHaveLength(1)
        expect(events[0]).toEqual(
            expect.objectContaining({
                date: '2026-06-10',
                stageName,
                programStageId: 'stage-ems',
                dataValues: expect.arrayContaining([
                    { dataElement: 'de-tvc', value: '5' },
                    { dataElement: 'de-tamb', value: '20' },
                ]),
            })
        )
        expect(events[0].dataValues).toHaveLength(2)
    })

    it('builds TEI attributes from EMS header metadata', () => {
        const metadata = {
            LSER: '0D3B7F96E129CE7D',
            AMFR: 'Vestfrost Solutions',
            AID: 'NULL',
        }
        const mappings = {
            LSER: 'attr-lser',
            AMFR: 'attr-amfr',
            AID: 'attr-aid',
        }

        const attributes = buildEmsAttributeValues(metadata, mappings)

        expect(attributes).toEqual([
            { attribute: 'attr-amfr', value: 'Vestfrost Solutions' },
            { attribute: 'attr-lser', value: '0D3B7F96E129CE7D' },
        ])
    })
})
