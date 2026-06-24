import { buildRegistrationAttributes } from '../buildRegistrationAttributes'

describe('buildRegistrationAttributes', () => {
    it('includes EMS metadata attributes when mapped', () => {
        const attributes = buildRegistrationAttributes({
            deviceType: 'ems',
            parsedData: {
                metadata: { LSER: 'ABC123', AMFR: 'Vestfrost' },
            },
            fieldMappings: {
                LSER: 'attr-serial',
                AMFR: 'attr-mfr',
            },
            serialAttributeId: 'attr-serial',
            serial: 'ABC123',
        })

        expect(attributes).toEqual(
            expect.arrayContaining([
                { attribute: 'attr-serial', value: 'ABC123' },
                { attribute: 'attr-mfr', value: 'Vestfrost' },
            ])
        )
    })

    it('includes Fridge-tag serial at minimum', () => {
        const attributes = buildRegistrationAttributes({
            deviceType: 'fridgeTag',
            parsedData: { config: { serial: '160400343951' } },
            fieldMappings: { serialAttribute: 'attr-serial' },
            serialAttributeId: 'attr-serial',
            serial: '160400343951',
        })

        expect(attributes).toEqual([{ attribute: 'attr-serial', value: '160400343951' }])
    })
})
