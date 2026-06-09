import { isEmsPresentValue } from './emsValue'

const HEADER_KEYS = [
    'AMOD',
    'AMFR',
    'ASER',
    'ADOP',
    'APQS',
    'ACAT',
    'AID',
    'CNAM',
    'CSER',
    'CSOF',
    'CDAT',
    'CNAM2',
    'CSER2',
    'CSOF2',
    'CDAT2',
    'LDOP',
    'LMFR',
    'LMOD',
    'LPQS',
    'LSER',
    'LSV',
    'LID',
    'EID',
    'EMFR',
    'EMOD',
    'ESER',
    'EDOP',
    'EMSV',
    'EPQS',
    'RNAM',
    'DNAM',
    'FNAM',
    'CID',
    'FID',
    'LAT',
    'LNG',
    'LACC',
]

/**
 * @param {Record<string, unknown>} raw
 * @returns {{ deviceType: 'ems', config: { serial: string|null }, metadata: Record<string, unknown>, records: Array<Record<string, unknown>>, recordCount: number }}
 */
export function parseEmsJson(raw) {
    const metadata = {}
    HEADER_KEYS.forEach((key) => {
        if (key in raw) {
            metadata[key] = raw[key]
        }
    })

    const serial = isEmsPresentValue(metadata.LSER) ? String(metadata.LSER).trim() : null
    const records = Array.isArray(raw.records)
        ? raw.records.filter((record) => record && typeof record === 'object')
        : []

    return {
        deviceType: 'ems',
        config: { serial },
        metadata,
        records,
        recordCount: records.length,
    }
}

/**
 * Fields present in at least one EMS record.
 * @param {Array<Record<string, unknown>>} records
 * @returns {string[]}
 */
export function getEmsRecordFieldKeys(records) {
    const keys = new Set()
    records.forEach((record) => {
        Object.entries(record).forEach(([key, value]) => {
            if (isEmsPresentValue(value)) {
                keys.add(key)
            }
        })
    })
    return [...keys].sort()
}
