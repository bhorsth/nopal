import {
    APP_SETTINGS_DATA_STORE_KEY,
    DEFAULT_APP_SETTINGS,
} from '../config/appSettingsDefaults'
import { loadAppSettingsLocal, saveAppSettingsLocal } from '../config/appSettingsStorage'
import {
    DATA_STORE_NAMESPACE,
    isDataStoreNotFoundError,
    normalizeDataStoreEntry,
} from '../config/importSettingsDataStore'
import { loadImportConfig } from '../config/importConfigStorage'
import { setParserDebugEnabled } from '../utils/parserDebug'

const dataStoreResource = `${DATA_STORE_NAMESPACE}/${APP_SETTINGS_DATA_STORE_KEY}`

export const mergeAppSettings = (partial = {}) => {
    const settings = {
        parserDebug:
            typeof partial.parserDebug === 'boolean'
                ? partial.parserDebug
                : DEFAULT_APP_SETTINGS.parserDebug,
        showDownloadJson:
            typeof partial.showDownloadJson === 'boolean'
                ? partial.showDownloadJson
                : DEFAULT_APP_SETTINGS.showDownloadJson,
        showViewParsedData:
            typeof partial.showViewParsedData === 'boolean'
                ? partial.showViewParsedData
                : DEFAULT_APP_SETTINGS.showViewParsedData,
    }

    setParserDebugEnabled(settings.parserDebug)
    return settings
}

const hasStoredAppSettings = (partial) =>
    typeof partial?.parserDebug === 'boolean' ||
    typeof partial?.showDownloadJson === 'boolean' ||
    typeof partial?.showViewParsedData === 'boolean'

/** Read parserDebug from legacy fridge-tag import settings (pre–developer-settings). */
const loadLegacyParserDebug = () => {
    const legacy = loadImportConfig('fridgeTag')
    return typeof legacy?.parserDebug === 'boolean' ? legacy.parserDebug : null
}

export async function loadAppSettings(engine) {
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
                settings: mergeAppSettings(fromStore),
                source: 'dataStore',
            }
        }
    } catch (error) {
        if (!isDataStoreNotFoundError(error)) {
            const local = loadAppSettingsLocal()
            if (hasStoredAppSettings(local)) {
                return {
                    settings: mergeAppSettings(local),
                    source: 'localStorage',
                    warning: error.message,
                }
            }
            const legacyParserDebug = loadLegacyParserDebug()
            return {
                settings: mergeAppSettings(
                    legacyParserDebug !== null ? { parserDebug: legacyParserDebug } : {}
                ),
                source: 'defaults',
                warning: error.message,
            }
        }
    }

    const local = loadAppSettingsLocal()
    const legacyParserDebug = loadLegacyParserDebug()
    const mergedPartial = {
        ...local,
        ...(legacyParserDebug !== null && typeof local.parserDebug !== 'boolean'
            ? { parserDebug: legacyParserDebug }
            : {}),
    }
    const settings = mergeAppSettings(mergedPartial)

    if (hasStoredAppSettings(local) || legacyParserDebug !== null) {
        try {
            await saveAppSettings(engine, settings)
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

export async function saveAppSettings(engine, settings) {
    try {
        await engine.mutate({
            resource: 'dataStore',
            id: dataStoreResource,
            type: 'update',
            data: settings,
        })
        saveAppSettingsLocal(settings)
        return { source: 'dataStore' }
    } catch (error) {
        if (isDataStoreNotFoundError(error)) {
            try {
                await engine.mutate({
                    resource: `dataStore/${DATA_STORE_NAMESPACE}`,
                    type: 'create',
                    data: {
                        key: APP_SETTINGS_DATA_STORE_KEY,
                        value: settings,
                    },
                })
                saveAppSettingsLocal(settings)
                return { source: 'dataStore' }
            } catch (createError) {
                saveAppSettingsLocal(settings)
                return { source: 'localStorage', warning: createError.message }
            }
        }

        saveAppSettingsLocal(settings)
        return { source: 'localStorage', warning: error.message }
    }
}
