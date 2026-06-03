/** DHIS2 data store location for shared import settings (instance-wide). */
export const DATA_STORE_NAMESPACE = 'Temperature-Data-Import'
export const DATA_STORE_KEY = 'import-settings'

export const dataStoreResource = `${DATA_STORE_NAMESPACE}/${DATA_STORE_KEY}`

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
