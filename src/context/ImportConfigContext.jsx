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
    EMS_DEFAULT_FIELD_MAPPINGS,
    EMS_FIELD_MAPPING_FIELDS,
    EMS_REQUIRED_FIELD_MAPPING_KEYS,
} from '../config/emsFieldMappingDefinitions'
import {
    loadImportSettings,
    saveImportSettings,
} from '../services/importSettingsPersistence'

/** @typedef {'fridgeTag' | 'ems'} ImportDevice */

const ImportConfigContext = createContext(null)

const DEVICE_DEFAULTS = {
    fridgeTag: {
        fieldMappings: DEFAULT_FIELD_MAPPINGS,
    },
    ems: {
        fieldMappings: EMS_DEFAULT_FIELD_MAPPINGS,
    },
}

const isFridgeTagMappingsComplete = (fieldMappings) =>
    FIELD_MAPPING_KEYS.every((key) => Boolean(fieldMappings[key]))

const isEmsMappingsComplete = (fieldMappings) =>
    EMS_REQUIRED_FIELD_MAPPING_KEYS.every((key) => Boolean(fieldMappings[key]))

const isMappingsComplete = (device, fieldMappings) =>
    device === 'ems' ? isEmsMappingsComplete(fieldMappings) : isFridgeTagMappingsComplete(fieldMappings)

const createEmptyConfig = (device) => ({
    programId: '',
    programStageId: '',
    fieldMappings: { ...DEVICE_DEFAULTS[device].fieldMappings },
})

const createDeviceApi = ({
    device,
    config,
    loading,
    saving,
    storageSource,
    storageWarning,
    setConfig,
    persist,
    fieldMappingFields,
}) => {
    const setProgramId = (programId) => {
        setConfig((prev) => {
            if (!prev) return prev
            const programChanged = programId !== prev.programId
            const next = {
                ...prev,
                programId,
                programStageId: programChanged ? '' : prev.programStageId,
                fieldMappings: programChanged
                    ? { ...DEVICE_DEFAULTS[device].fieldMappings }
                    : prev.fieldMappings,
            }
            persist(next)
            return next
        })
    }

    const setProgramStageId = (programStageId) => {
        setConfig((prev) => {
            if (!prev) return prev
            const stageChanged = programStageId !== prev.programStageId
            const nextMappings = { ...prev.fieldMappings }
            if (stageChanged) {
                if (device === 'fridgeTag') {
                    FIELD_MAPPING_KEYS.forEach((key) => {
                        if (key !== 'serialAttribute') {
                            nextMappings[key] = ''
                        }
                    })
                } else {
                    fieldMappingFields.forEach(({ key, kind }) => {
                        if (kind === 'dataElement') {
                            nextMappings[key] = ''
                        }
                    })
                }
            }
            const next = {
                ...prev,
                programStageId,
                fieldMappings: stageChanged ? nextMappings : prev.fieldMappings,
            }
            persist(next)
            return next
        })
    }

    const setFieldMapping = (key, value) => {
        setConfig((prev) => {
            if (!prev) return prev
            const next = {
                ...prev,
                fieldMappings: { ...prev.fieldMappings, [key]: value },
            }
            persist(next)
            return next
        })
    }

    const resolved = config || createEmptyConfig(device)

    return {
        programId: resolved.programId,
        programStageId: resolved.programStageId,
        fieldMappings: resolved.fieldMappings,
        setProgramId,
        setProgramStageId,
        setFieldMapping,
        settingsLoading: loading,
        settingsSaving: saving,
        storageSource,
        storageWarning,
        isImportConfigValid: Boolean(
            !loading &&
                resolved.programId &&
                resolved.programStageId &&
                isMappingsComplete(device, resolved.fieldMappings)
        ),
    }
}

export const ImportConfigProvider = ({ children }) => {
    const engine = useDataEngine()
    const [fridgeTagConfig, setFridgeTagConfig] = useState(null)
    const [emsConfig, setEmsConfig] = useState(null)
    const [fridgeTagMeta, setFridgeTagMeta] = useState({
        loading: true,
        saving: false,
        storageSource: null,
        storageWarning: null,
    })
    const [emsMeta, setEmsMeta] = useState({
        loading: true,
        saving: false,
        storageSource: null,
        storageWarning: null,
    })

    useEffect(() => {
        let cancelled = false

        const loadDevice = async (device, setConfig, setMeta) => {
            setMeta((prev) => ({ ...prev, loading: true }))
            try {
                const result = await loadImportSettings(engine, device)
                if (cancelled) return
                setConfig(result.settings)
                setMeta({
                    loading: false,
                    saving: false,
                    storageSource: result.source,
                    storageWarning: result.warning || null,
                })
            } catch (error) {
                if (cancelled) return
                setConfig(createEmptyConfig(device))
                setMeta({
                    loading: false,
                    saving: false,
                    storageSource: 'defaults',
                    storageWarning: error.message,
                })
            }
        }

        loadDevice('fridgeTag', setFridgeTagConfig, setFridgeTagMeta)
        loadDevice('ems', setEmsConfig, setEmsMeta)

        return () => {
            cancelled = true
        }
    }, [engine])

    const createPersist = useCallback(
        (device, setConfig, setMeta) => async (next) => {
            setConfig(next)
            setMeta((prev) => ({ ...prev, saving: true }))
            try {
                const result = await saveImportSettings(engine, device, next)
                setMeta((prev) => ({
                    ...prev,
                    saving: false,
                    storageSource: result.source,
                    storageWarning: result.warning || null,
                }))
            } catch (error) {
                setMeta((prev) => ({
                    ...prev,
                    saving: false,
                    storageWarning: error.message,
                }))
            }
        },
        [engine]
    )

    const persistFridgeTag = useMemo(
        () => createPersist('fridgeTag', setFridgeTagConfig, setFridgeTagMeta),
        [createPersist]
    )
    const persistEms = useMemo(
        () => createPersist('ems', setEmsConfig, setEmsMeta),
        [createPersist]
    )

    const fridgeTagApi = useMemo(
        () =>
            createDeviceApi({
                device: 'fridgeTag',
                config: fridgeTagConfig,
                loading: fridgeTagMeta.loading,
                saving: fridgeTagMeta.saving,
                storageSource: fridgeTagMeta.storageSource,
                storageWarning: fridgeTagMeta.storageWarning,
                setConfig: setFridgeTagConfig,
                persist: persistFridgeTag,
                fieldMappingFields: [],
            }),
        [fridgeTagConfig, fridgeTagMeta, persistFridgeTag]
    )

    const emsApi = useMemo(
        () =>
            createDeviceApi({
                device: 'ems',
                config: emsConfig,
                loading: emsMeta.loading,
                saving: emsMeta.saving,
                storageSource: emsMeta.storageSource,
                storageWarning: emsMeta.storageWarning,
                setConfig: setEmsConfig,
                persist: persistEms,
                fieldMappingFields: EMS_FIELD_MAPPING_FIELDS,
            }),
        [emsConfig, emsMeta, persistEms]
    )

    const value = useMemo(
        () => ({
            fridgeTag: fridgeTagApi,
            ems: emsApi,
        }),
        [fridgeTagApi, emsApi]
    )

    return (
        <ImportConfigContext.Provider value={value}>{children}</ImportConfigContext.Provider>
    )
}

const useDeviceImportConfig = (device) => {
    const context = useContext(ImportConfigContext)
    if (!context) {
        throw new Error('useImportConfig must be used within ImportConfigProvider')
    }
    return context[device]
}

export const useFridgeTagImportConfig = () => useDeviceImportConfig('fridgeTag')
export const useEmsImportConfig = () => useDeviceImportConfig('ems')
export const useImportConfig = useFridgeTagImportConfig
