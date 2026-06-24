import {
    buildEmsDailyEventsByStage,
    buildEmsEventDataValues,
    buildEmsAttributeValues,
    groupEmsRecordDataValuesByStage,
} from '../buildEmsEventDataValues'

describe('buildEmsEventDataValues', () => {
    it('includes only mapped data elements with present record values', () => {
        const record = {
            RELT: 'PT15M',
            TVC: 5.7,
            TAMB: 31.9,
            TFRZ: null,
            ALRM: '0x00000000',
        }
        const mappings = {
            RELT: 'de-relt',
            TVC: 'de-tvc',
            TAMB: 'de-tamb',
            TFRZ: 'de-tfrz',
        }

        const dataValues = buildEmsEventDataValues(record, mappings)

        expect(dataValues).toEqual(
            expect.arrayContaining([
                { dataElement: 'de-relt', value: 'PT15M' },
                { dataElement: 'de-tvc', value: '5.7' },
                { dataElement: 'de-tamb', value: '31.9' },
            ])
        )
        expect(dataValues).toHaveLength(3)
    })

    it('groups data values by program stage from field definitions', () => {
        const record = { TVC: 5.7, TAMB: 31.9, ALRM: '0x00000000' }
        const mappings = { TVC: 'de-tvc', TAMB: 'de-tamb', ALRM: 'de-alrm' }

        const byStage = groupEmsRecordDataValuesByStage(record, mappings)

        expect(byStage['Compartment data']).toEqual([{ dataElement: 'de-tvc', value: '5.7' }])
        expect(byStage['Appliance ambience']).toEqual([{ dataElement: 'de-tamb', value: '31.9' }])
        expect(byStage['Logger data']).toEqual([{ dataElement: 'de-alrm', value: '0x00000000' }])
    })

    it('builds one event per day and program stage', () => {
        const dailyRecords = [
            { date: '2026-06-10', fields: { TVC: 5, TAMB: 20 } },
        ]
        const mappings = { TVC: 'de-tvc', TAMB: 'de-tamb' }
        const stageNameToId = {
            'Compartment data': 'stage-compartment',
            'Appliance ambience': 'stage-ambience',
        }

        const events = buildEmsDailyEventsByStage(dailyRecords, mappings, stageNameToId)

        expect(events).toHaveLength(2)
        expect(events).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    date: '2026-06-10',
                    stageName: 'Compartment data',
                    programStageId: 'stage-compartment',
                    dataValues: [{ dataElement: 'de-tvc', value: '5' }],
                }),
                expect.objectContaining({
                    date: '2026-06-10',
                    stageName: 'Appliance ambience',
                    programStageId: 'stage-ambience',
                    dataValues: [{ dataElement: 'de-tamb', value: '20' }],
                }),
            ])
        )
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
