import { buildEmsAutoMappings, findMetadataMatch } from '../emsAutoMapFields'

describe('findMetadataMatch', () => {
    const options = [
        { id: 'abc', displayName: 'Logger serial number', code: 'EMS-LSER' },
        { id: 'def', displayName: 'Voltage', code: '' },
    ]

    it('matches by DHIS2 code first', () => {
        const match = findMetadataMatch({ dhis2Name: 'Other', dhis2Code: 'EMS-LSER' }, options)
        expect(match?.id).toBe('abc')
    })

    it('matches by DHIS2 name when code is absent', () => {
        const match = findMetadataMatch({ dhis2Name: 'Voltage', dhis2Code: '' }, options)
        expect(match?.id).toBe('def')
    })
})

describe('buildEmsAutoMappings', () => {
    const fieldDefinitions = [
        {
            key: 'LSER',
            kind: 'attribute',
            stageOrAttribute: 'TEI attribute',
            dhis2Name: 'Logger serial number',
            dhis2Code: 'EMS-LSER',
        },
        {
            key: 'TVC',
            kind: 'dataElement',
            stageOrAttribute: 'Compartment data',
            dhis2Name: 'Vaccine Compartment Temperature (°C) - AVG',
            dhis2Code: 'EMS - TVC - AVG',
        },
    ]

    it('maps attributes and stage data elements separately', () => {
        const mappings = buildEmsAutoMappings(fieldDefinitions, {
            attributes: [{ id: 'attr1', displayName: 'Logger serial number', code: 'EMS-LSER' }],
            dataElementsByStageName: {
                'Compartment data': [
                    {
                        id: 'de1',
                        displayName: 'Vaccine Compartment Temperature (°C) - AVG',
                        code: 'EMS - TVC - AVG',
                    },
                ],
            },
        })

        expect(mappings).toEqual({ LSER: 'attr1', TVC: 'de1' })
    })
})
