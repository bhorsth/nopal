import { useDataEngine } from '@dhis2/app-runtime'
import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react'
import {
    DEFAULT_FIELD_MAPPINGS,
    FIELD_MAPPING_KEYS,
} from '../config/fieldMappingDefinitions'
import {
    loadImportSettings,
    saveImportSettings,
} from '../services/importSettingsPersistence'
import { setParserDebugEnabled } from '../utils/parserDebug'

const ImportConfigContext = createContext(null)

const isFieldMappingsComplete = (fieldMappings) =>
    FIELD_MAPPING_KEYS.every((key) => Boolean(fieldMappings[key]))

export const ImportConfigProvider = ({ children }) => {
    const engine = useDataEngine()
    const [importConfig, setImportConfig] = useState(null)
    const [loading, setLoading] = useState(true)
    const [storageSource, setStorageSource] = useState(null)
    const [storageWarning, setStorageWarning] = useState(null)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        let cancelled = false

        const load = async () => {
            setLoading(true)
            try {
                const result = await loadImportSettings(engine)
                if (cancelled) return
                setImportConfig(result.settings)
                setStorageSource(result.source)
                setStorageWarning(result.warning || null)
            } catch (error) {
                if (cancelled) return
                setImportConfig({
                    programId: '',
                    programStageId: '',
                    fieldMappings: { ...DEFAULT_FIELD_MAPPINGS },
                    parserDebug: false,
                })
                setParserDebugEnabled(false)
                setStorageSource('defaults')
                setStorageWarning(error.message)
            } finally {
                if (!cancelled) setLoading(false)
            }
        }

        load()
        return () => {
            cancelled = true
        }
    }, [engine])

    const persist = useCallback(
        async (next) => {
            setImportConfig(next)
            setSaving(true)
            try {
                const result = await saveImportSettings(engine, next)
                setStorageSource(result.source)
                setStorageWarning(result.warning || null)
            } catch (error) {
                setStorageWarning(error.message)
            } finally {
                setSaving(false)
            }
        },
        [engine]
    )

    const setProgramId = useCallback(
        (programId) => {
            setImportConfig((prev) => {
                if (!prev) return prev
                const programChanged = programId !== prev.programId
                const next = {
                    programId,
                    programStageId: programChanged ? '' : prev.programStageId,
                    fieldMappings: programChanged
                        ? { ...DEFAULT_FIELD_MAPPINGS }
                        : prev.fieldMappings,
                }
                persist(next)
                return next
            })
        },
        [persist]
    )

    const setProgramStageId = useCallback(
        (programStageId) => {
            setImportConfig((prev) => {
                if (!prev) return prev
                const stageChanged = programStageId !== prev.programStageId
                const nextMappings = { ...prev.fieldMappings }
                if (stageChanged) {
                    FIELD_MAPPING_KEYS.forEach((key) => {
                        if (key !== 'serialAttribute') {
                            nextMappings[key] = ''
                        }
                    })
                }
                const next = {
                    ...prev,
                    programStageId,
                    fieldMappings: stageChanged ? nextMappings : prev.fieldMappings,
                }
                persist(next)
                return next
            })
        },
        [persist]
    )

    const setFieldMapping = useCallback(
        (key, value) => {
            setImportConfig((prev) => {
                if (!prev) return prev
                const next = {
                    ...prev,
                    fieldMappings: { ...prev.fieldMappings, [key]: value },
                }
                persist(next)
                return next
            })
        },
        [persist]
    )

    const setParserDebug = useCallback(
        (parserDebug) => {
            setParserDebugEnabled(parserDebug)
            setImportConfig((prev) => {
                if (!prev) return prev
                const next = { ...prev, parserDebug }
                persist(next)
                return next
            })
        },
        [persist]
    )

    const value = useMemo(() => {
        const config = importConfig || {
            programId: '',
            programStageId: '',
            fieldMappings: { ...DEFAULT_FIELD_MAPPINGS },
            parserDebug: false,
        }

        return {
            programId: config.programId,
            programStageId: config.programStageId,
            fieldMappings: config.fieldMappings,
            parserDebug: Boolean(config.parserDebug),
            setProgramId,
            setProgramStageId,
            setFieldMapping,
            setParserDebug,
            settingsLoading: loading,
            settingsSaving: saving,
            storageSource,
            storageWarning,
            isImportConfigValid: Boolean(
                !loading &&
                    config.programId &&
                    config.programStageId &&
                    isFieldMappingsComplete(config.fieldMappings)
            ),
        }
    }, [
        importConfig,
        loading,
        saving,
        storageSource,
        storageWarning,
        setProgramId,
        setProgramStageId,
        setFieldMapping,
        setParserDebug,
    ])

    return (
        <ImportConfigContext.Provider value={value}>{children}</ImportConfigContext.Provider>
    )
}

export const useImportConfig = () => {
    const context = useContext(ImportConfigContext)
    if (!context) {
        throw new Error('useImportConfig must be used within ImportConfigProvider')
    }
    return context
}
