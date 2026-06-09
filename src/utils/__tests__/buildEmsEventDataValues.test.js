import { buildEmsEventDataValues, buildEmsAttributeValues } from '../buildEmsEventDataValues'

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
