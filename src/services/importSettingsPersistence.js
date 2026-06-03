import {
    DEFAULT_FIELD_MAPPINGS,
} from '../config/fieldMappingDefinitions'
import { getDhis2Config } from '../config/dhis2'
import { loadImportConfig, saveImportConfig } from '../config/importConfigStorage'
import { setParserDebugEnabled } from '../utils/parserDebug'
import {
    dataStoreResource,
    DATA_STORE_KEY,
    DATA_STORE_NAMESPACE,
    isDataStoreNotFoundError,
    normalizeDataStoreEntry,
} from '../config/importSettingsDataStore'

export const mergeImportSettings = (partial = {}) => {
    const { config } = getDhis2Config()

    const settings = {
        programId: partial.programId || config.programId || '',
        programStageId: partial.programStageId || config.programStageId || '',
        fieldMappings: {
            ...DEFAULT_FIELD_MAPPINGS,
            ...(partial.fieldMappings || {}),
        },
        parserDebug:
            typeof partial.parserDebug === 'boolean'
                ? partial.parserDebug
                : process.env.REACT_APP_PARSER_DEBUG === 'true',
    }

    setParserDebugEnabled(settings.parserDebug)
    return settings
}

const hasStoredSettings = (partial) =>
    Boolean(
        partial?.programId ||
            partial?.programStageId ||
            Object.values(partial?.fieldMappings || {}).some(Boolean)
    )

export async function loadImportSettings(engine) {
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
                settings: mergeImportSettings(fromStore),
                source: 'dataStore',
            }
        }
    } catch (error) {
        if (!isDataStoreNotFoundError(error)) {
            const local = loadImportConfig()
            if (hasStoredSettings(local)) {
                return {
                    settings: mergeImportSettings(local),
                    source: 'localStorage',
                    warning: error.message,
                }
            }
            return {
                settings: mergeImportSettings(),
                source: 'defaults',
                warning: error.message,
            }
        }
    }

    const local = loadImportConfig()
    const settings = mergeImportSettings(local)

    if (hasStoredSettings(local)) {
        try {
            await saveImportSettings(engine, settings)
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

export async function saveImportSettings(engine, settings) {
    try {
        await engine.mutate({
            resource: 'dataStore',
            id: dataStoreResource,
            type: 'update',
            data: settings,
        })
        saveImportConfig(settings)
        return { source: 'dataStore' }
    } catch (error) {
        if (isDataStoreNotFoundError(error)) {
            try {
                await engine.mutate({
                    resource: `dataStore/${DATA_STORE_NAMESPACE}`,
                    type: 'create',
                    data: {
                        key: DATA_STORE_KEY,
                        value: settings,
                    },
                })
                saveImportConfig(settings)
                return { source: 'dataStore' }
            } catch (createError) {
                saveImportConfig(settings)
                return { source: 'localStorage', warning: createError.message }
            }
        }

        saveImportConfig(settings)
        return { source: 'localStorage', warning: error.message }
    }
}
