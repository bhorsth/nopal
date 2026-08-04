import {
    buildEmsAutoMappings,
    findMetadataMatch,
    resolveDataElementsForStageName,
} from '../emsAutoMapFields'

describe('findMetadataMatch', () => {
    const options = [
        { id: 'abc', displayName: 'Logger serial number (EMS-LSER)', name: 'Logger serial number', code: 'EMS-LSER' },
        { id: 'def', displayName: 'Voltage', code: '' },
        { id: 'ghi', displayName: 'Ambient temperature (°C)', name: 'Ambient temperature', code: '' },
    ]

    it('matches by DHIS2 code first', () => {
        const match = findMetadataMatch({ dhis2Name: 'Other', dhis2Code: 'EMS-LSER' }, options)
        expect(match?.id).toBe('abc')
    })

    it('matches by DHIS2 name when code is absent', () => {
        const match = findMetadataMatch({ dhis2Name: 'Voltage', dhis2Code: '' }, options)
        expect(match?.id).toBe('def')
    })

    it('matches attribute labels that include a trailing code', () => {
        const match = findMetadataMatch(
            { dhis2Name: 'Logger serial number', dhis2Code: '' },
            options
        )
        expect(match?.id).toBe('abc')
    })

    it('matches when unit suffixes differ', () => {
        const match = findMetadataMatch(
            { dhis2Name: 'Ambient temperature', dhis2Code: '' },
            options
        )
        expect(match?.id).toBe('ghi')
    })
})

describe('resolveDataElementsForStageName', () => {
    const byStage = {
        'EMS data': [{ id: 'de1', displayName: 'Temp' }],
        Registration: [{ id: 'de2', displayName: 'Other' }],
    }

    it('matches exact stage names', () => {
        const result = resolveDataElementsForStageName(byStage, 'EMS data')
        expect(result.matchedExactly).toBe(true)
        expect(result.dataElements).toEqual([{ id: 'de1', displayName: 'Temp' }])
    })

    it('fuzzy-matches longer configured stage names', () => {
        const result = resolveDataElementsForStageName(
            byStage,
            'Equipment Monitoring System (EMS) data'
        )
        expect(result.stageName).toBe('EMS data')
        expect(result.dataElements).toHaveLength(1)
    })

    it('falls back to all stages when nothing matches', () => {
        const result = resolveDataElementsForStageName(byStage, 'Does not exist')
        expect(result.dataElements.map((de) => de.id).sort()).toEqual(['de1', 'de2'])
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
            stageOrAttribute: 'Equipment Monitoring System (EMS) data',
            dhis2Name: 'Vaccine Compartment Temperature (°C) - AVG',
            dhis2Code: 'EMS - TVC - AVG',
        },
    ]

    it('maps attributes and stage data elements separately', () => {
        const mappings = buildEmsAutoMappings(fieldDefinitions, {
            attributes: [{ id: 'attr1', displayName: 'Logger serial number', code: 'EMS-LSER' }],
            dataElementsByStageName: {
                'Equipment Monitoring System (EMS) data': [
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

    it('auto-maps data elements when stage name differs slightly', () => {
        const mappings = buildEmsAutoMappings(fieldDefinitions, {
            attributes: [{ id: 'attr1', displayName: 'Logger serial number', code: 'EMS-LSER' }],
            dataElementsByStageName: {
                'EMS data': [
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
