import {
    DEFAULT_FIELD_MAPPINGS,
} from '../config/fieldMappingDefinitions'
import {
    EMS_DEFAULT_FIELD_MAPPINGS,
} from '../config/emsFieldMappingDefinitions'
import { getDhis2Config } from '../config/dhis2'
import { loadImportConfig, saveImportConfig } from '../config/importConfigStorage'
import {
    DATA_STORE_NAMESPACE,
    DEVICE_DATA_STORE_KEYS,
    getDataStoreResource,
    isDataStoreNotFoundError,
    normalizeDataStoreEntry,
} from '../config/importSettingsDataStore'

/** @typedef {'fridgeTag' | 'ems'} ImportDevice */

const DEVICE_DEFAULT_FIELD_MAPPINGS = {
    fridgeTag: DEFAULT_FIELD_MAPPINGS,
    ems: EMS_DEFAULT_FIELD_MAPPINGS,
}

/**
 * @param {ImportDevice} device
 */
export const mergeImportSettings = (device, partial = {}) => {
    const { config } = getDhis2Config()
    const defaultFieldMappings = DEVICE_DEFAULT_FIELD_MAPPINGS[device]

    return {
        programId: partial.programId || config.programId || '',
        programStageId: partial.programStageId || config.programStageId || '',
        fieldMappings: {
            ...defaultFieldMappings,
            ...(partial.fieldMappings || {}),
        },
    }
}

const hasStoredSettings = (partial) =>
    Boolean(
        partial?.programId ||
            partial?.programStageId ||
            Object.values(partial?.fieldMappings || {}).some(Boolean)
    )

/**
 * @param {ImportDevice} device
 */
export async function loadImportSettings(engine, device) {
    const dataStoreResource = getDataStoreResource(device)
    const dataStoreKey = DEVICE_DATA_STORE_KEYS[device]

    try {
        const result = await engine.query({
            settings: {
                resource: 'dataStore',
                id: dataStoreResource,
            },
        })

        const fromStore = normalizeDataStoreEntry(result?.settings)
        if (fromStore) {
            return {
                settings: mergeImportSettings(device, fromStore),
                source: 'dataStore',
            }
        }
    } catch (error) {
        if (!isDataStoreNotFoundError(error)) {
            const local = loadImportConfig(device)
            if (hasStoredSettings(local)) {
                return {
                    settings: mergeImportSettings(device, local),
                    source: 'localStorage',
                    warning: error.message,
                }
            }
            return {
                settings: mergeImportSettings(device),
                source: 'defaults',
                warning: error.message,
            }
        }
    }

    const local = loadImportConfig(device)
    const settings = mergeImportSettings(device, local)

    if (hasStoredSettings(local)) {
        try {
            await saveImportSettings(engine, device, settings)
            return { settings, source: 'dataStore', migratedFrom: 'localStorage' }
        } catch (migrationError) {
            return {
                settings,
                source: 'localStorage',
                warning: migrationError.message,
            }
        }
    }

    return { settings, source: 'defaults' }
}

/**
 * @param {ImportDevice} device
 */
const stripLegacyFields = (device, settings) => {
    if (device !== 'fridgeTag') return settings
    const { parserDebug, ...rest } = settings
    return rest
}

export async function saveImportSettings(engine, device, settings) {
    const dataStoreResource = getDataStoreResource(device)
    const dataStoreKey = DEVICE_DATA_STORE_KEYS[device]
    const payload = stripLegacyFields(device, settings)

    try {
        await engine.mutate({
            resource: 'dataStore',
            id: dataStoreResource,
            type: 'update',
            data: payload,
        })
        saveImportConfig(device, payload)
        return { source: 'dataStore' }
    } catch (error) {
        if (isDataStoreNotFoundError(error)) {
            try {
                await engine.mutate({
                    resource: `dataStore/${DATA_STORE_NAMESPACE}`,
                    type: 'create',
                    data: {
                        key: dataStoreKey,
                        value: payload,
                    },
                })
                saveImportConfig(device, payload)
                return { source: 'dataStore' }
            } catch (createError) {
                saveImportConfig(device, payload)
                return { source: 'localStorage', warning: createError.message }
            }
        }

        saveImportConfig(device, payload)
        return { source: 'localStorage', warning: error.message }
    }
}
