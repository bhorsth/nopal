import {
    formatEmsAggregatedNumber,
    formatEmsPreviewValue,
    formatEmsValue,
    parseEmsNumeric,
    roundEmsAggregatedNumber,
    roundEmsToOneDecimal,
} from '../emsValue'

describe('formatEmsValue', () => {
    it('stringifies present values, rounds numerics, and drops nullish markers', () => {
        expect(formatEmsValue(5.67)).toBe('5.7')
        expect(formatEmsValue(26)).toBe('26')
        expect(formatEmsValue('NULL')).toBeNull()
        expect(formatEmsValue('')).toBeNull()
        expect(formatEmsValue('HEAT FRZE')).toBe('HEAT FRZE')
    })
})

describe('formatEmsPreviewValue', () => {
    it('rounds aggregation outputs to integers or one decimal', () => {
        expect(formatEmsPreviewValue('TAMB_AVG', 31.96)).toBe('32')
        expect(formatEmsPreviewValue('TVC_AVG', '5.74')).toBe('5.7')
        expect(formatEmsPreviewValue('ACCD_AVG', 1)).toBe('1')
        expect(formatEmsPreviewValue('ACSV_AVG', 230.15)).toBe('230.2')
        expect(formatEmsPreviewValue('BLOG_AVG', 12.34)).toBe('12.3')
        expect(formatEmsPreviewValue('CMPR_SEC_SUM', 45.67)).toBe('45.7')
        expect(formatEmsPreviewValue('tamb_avg', 17.850000000000001)).toBe('17.9')
        expect(formatEmsPreviewValue('TAMB_AVG', '18,26')).toBe('18.3')
        expect(formatEmsPreviewValue('TAMB_AVG', 25.950000000000003)).toBe('26')
        expect(formatEmsPreviewValue('ACCD_AVG', 2450.5)).toBe('2450.5')
    })

    it('leaves non-numeric fields unchanged', () => {
        expect(formatEmsPreviewValue('ALRM_DLY', 'HEAT FRZE')).toBe('HEAT FRZE')
        expect(formatEmsPreviewValue('SIGN', 'abc123hash')).toBe('abc123hash')
    })
})

describe('roundEmsAggregatedNumber', () => {
    it('rounds numeric values to one decimal and keeps integers', () => {
        expect(roundEmsAggregatedNumber(17.850000000000001)).toBe(17.9)
        expect(roundEmsAggregatedNumber(25.950000000000003)).toBe(26)
        expect(roundEmsToOneDecimal(17.850000000000001)).toBe(17.9)
        expect(parseEmsNumeric('12,34')).toBe(12.34)
        expect(formatEmsAggregatedNumber(25.95)).toBe('26')
        expect(formatEmsAggregatedNumber(2450.5)).toBe('2450.5')
    })
})
