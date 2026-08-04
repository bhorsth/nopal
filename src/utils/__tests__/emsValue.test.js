import {
    formatEmsPreviewValue,
    formatEmsValue,
    parseEmsNumeric,
    roundEmsToOneDecimal,
} from '../emsValue'

describe('formatEmsValue', () => {
    it('stringifies present values and drops nullish markers', () => {
        expect(formatEmsValue(5.67)).toBe('5.67')
        expect(formatEmsValue('NULL')).toBeNull()
        expect(formatEmsValue('')).toBeNull()
    })
})

describe('formatEmsPreviewValue', () => {
    it('rounds selected fields to one decimal place', () => {
        expect(formatEmsPreviewValue('TAMB', 31.96)).toBe('32.0')
        expect(formatEmsPreviewValue('TVC', '5.74')).toBe('5.7')
        expect(formatEmsPreviewValue('ACCD', 1)).toBe('1.0')
        expect(formatEmsPreviewValue('ACSV', 230.15)).toBe('230.2')
        expect(formatEmsPreviewValue('BLOG', 12.34)).toBe('12.3')
        expect(formatEmsPreviewValue('CMPR', 45.67)).toBe('45.7')
        expect(formatEmsPreviewValue('tamb', 17.850000000000001)).toBe('17.9')
        expect(formatEmsPreviewValue('TAMB', '18,26')).toBe('18.3')
    })

    it('leaves other fields unchanged', () => {
        expect(formatEmsPreviewValue('ALRM', '0x00000000')).toBe('0x00000000')
        expect(formatEmsPreviewValue('SVA', 12.345)).toBe('12.345')
    })
})

describe('roundEmsToOneDecimal', () => {
    it('rounds numeric values to one decimal', () => {
        expect(roundEmsToOneDecimal(17.850000000000001)).toBe(17.9)
        expect(parseEmsNumeric('12,34')).toBe(12.34)
    })
})
