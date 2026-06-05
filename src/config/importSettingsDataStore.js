/** DHIS2 data store location for shared import settings (instance-wide). */
export const DATA_STORE_NAMESPACE = 'Temperature-Data-Import'

/** @deprecated Use DEVICE_DATA_STORE_KEYS.fridgeTag */
export const DATA_STORE_KEY = 'import-settings'

/** @type {Record<'fridgeTag' | 'ems', string>} */
export const DEVICE_DATA_STORE_KEYS = {
    fridgeTag: 'import-settings',
    ems: 'ems-import-settings',
}

/**
 * @param {'fridgeTag' | 'ems'} device
 */
export const getDataStoreResource = (device) =>
    `${DATA_STORE_NAMESPACE}/${DEVICE_DATA_STORE_KEYS[device]}`

/** @deprecated Use getDataStoreResource('fridgeTag') */
export const dataStoreResource = getDataStoreResource('fridgeTag')

export const isDataStoreNotFoundError = (error) => {
    const status = error?.details?.httpStatus ?? error?.details?.status
    return status === 404 || error?.message?.includes('404')
}

/** API may return the value directly or wrapped in { key, value }. */
export const normalizeDataStoreEntry = (entry) => {
    if (!entry) return null
    if (entry.value && typeof entry.value === 'object') {
        return entry.value
    }
    if (entry.programId || entry.programStageId || entry.fieldMappings) {
        return entry
    }
    return null
}
