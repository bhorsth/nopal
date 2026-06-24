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
    REQUIRED_FIELD_MAPPING_KEYS,
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
    REQUIRED_FIELD_MAPPING_KEYS.every((key) => Boolean(fieldMappings[key]))

const isEmsMappingsComplete = (fieldMappings) =>
    EMS_REQUIRED_FIELD_MAPPING_KEYS.every((key) => Boolean(fieldMappings[key]))

const isMappingsComplete = (device, fieldMappings) =>
    device === 'ems' ? isEmsMappingsComplete(fieldMappings) : isFridgeTagMappingsComplete(fieldMappings)

const createEmptyConfig = (device) => ({
    programId: '',
    programStageId: '',
    fieldMappings: { ...DEVICE_DEFAULTS[device].fieldMappings },
})

const configsEqual = (a, b) => {
    if (!a || !b) return a === b
    if (a.programId !== b.programId || a.programStageId !== b.programStageId) {
        return false
    }
    const keys = new Set([
        ...Object.keys(a.fieldMappings || {}),
        ...Object.keys(b.fieldMappings || {}),
    ])
    for (const key of keys) {
        if ((a.fieldMappings || {})[key] !== (b.fieldMappings || {})[key]) {
            return false
        }
    }
    return true
}

const createDeviceApi = ({
    device,
    savedConfig,
    draftConfig,
    loading,
    saving,
    storageSource,
    storageWarning,
    setDraftConfig,
    saveDraft,
    cancelDraft,
    fieldMappingFields,
    requiresProgramStage = true,
}) => {
    const setProgramId = (programId) => {
        setDraftConfig((prev) => {
            if (!prev) return prev
            const programChanged = programId !== prev.programId
            return {
                ...prev,
                programId,
                programStageId: programChanged ? '' : prev.programStageId,
                fieldMappings: programChanged
                    ? { ...DEVICE_DEFAULTS[device].fieldMappings }
                    : prev.fieldMappings,
            }
        })
    }

    const setProgramStageId = (programStageId) => {
        setDraftConfig((prev) => {
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
            return {
                ...prev,
                programStageId,
                fieldMappings: stageChanged ? nextMappings : prev.fieldMappings,
            }
        })
    }

    const setFieldMapping = (key, value) => {
        setDraftConfig((prev) => {
            if (!prev) return prev
            return {
                ...prev,
                fieldMappings: { ...prev.fieldMappings, [key]: value },
            }
        })
    }

    const saved = savedConfig || createEmptyConfig(device)
    const draft = draftConfig || createEmptyConfig(device)

    return {
        programId: saved.programId,
        programStageId: saved.programStageId,
        fieldMappings: saved.fieldMappings,
        draftProgramId: draft.programId,
        draftProgramStageId: draft.programStageId,
        draftFieldMappings: draft.fieldMappings,
        setProgramId,
        setProgramStageId,
        setFieldMapping,
        saveDraft,
        cancelDraft,
        isDraftDirty: !configsEqual(saved, draft),
        settingsLoading: loading,
        settingsSaving: saving,
        storageSource,
        storageWarning,
        isImportConfigValid: Boolean(
            !loading &&
                saved.programId &&
                (requiresProgramStage ? saved.programStageId : true) &&
                isMappingsComplete(device, saved.fieldMappings)
        ),
    }
}

export const ImportConfigProvider = ({ children }) => {
    const engine = useDataEngine()
    const [fridgeTagSaved, setFridgeTagSaved] = useState(null)
    const [fridgeTagDraft, setFridgeTagDraft] = useState(null)
    const [emsSaved, setEmsSaved] = useState(null)
    const [emsDraft, setEmsDraft] = useState(null)
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

        const loadDevice = async (device, setSaved, setDraft, setMeta) => {
            setMeta((prev) => ({ ...prev, loading: true }))
            try {
                const result = await loadImportSettings(engine, device)
                if (cancelled) return
                setSaved(result.settings)
                setDraft(result.settings)
                setMeta({
                    loading: false,
                    saving: false,
                    storageSource: result.source,
                    storageWarning: result.warning || null,
                })
            } catch (error) {
                if (cancelled) return
                const empty = createEmptyConfig(device)
                setSaved(empty)
                setDraft(empty)
                setMeta({
                    loading: false,
                    saving: false,
                    storageSource: 'defaults',
                    storageWarning: error.message,
                })
            }
        }

        loadDevice('fridgeTag', setFridgeTagSaved, setFridgeTagDraft, setFridgeTagMeta)
        loadDevice('ems', setEmsSaved, setEmsDraft, setEmsMeta)

        return () => {
            cancelled = true
        }
    }, [engine])

    const createSaveDraft = useCallback(
        (device, draft, setSaved, setMeta) => async () => {
            if (!draft) return
            setMeta((prev) => ({ ...prev, saving: true }))
            try {
                const result = await saveImportSettings(engine, device, draft)
                setSaved(draft)
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
                throw error
            }
        },
        [engine]
    )

    const createCancelDraft = useCallback((saved, setDraft) => () => {
        if (saved) {
            setDraft({ ...saved, fieldMappings: { ...saved.fieldMappings } })
        }
    }, [])

    const saveFridgeTagDraft = useMemo(
        () => createSaveDraft('fridgeTag', fridgeTagDraft, setFridgeTagSaved, setFridgeTagMeta),
        [createSaveDraft, fridgeTagDraft]
    )
    const saveEmsDraft = useMemo(
        () => createSaveDraft('ems', emsDraft, setEmsSaved, setEmsMeta),
        [createSaveDraft, emsDraft]
    )

    const cancelFridgeTagDraft = useMemo(
        () => createCancelDraft(fridgeTagSaved, setFridgeTagDraft),
        [createCancelDraft, fridgeTagSaved]
    )
    const cancelEmsDraft = useMemo(
        () => createCancelDraft(emsSaved, setEmsDraft),
        [createCancelDraft, emsSaved]
    )

    const fridgeTagApi = useMemo(
        () =>
            createDeviceApi({
                device: 'fridgeTag',
                savedConfig: fridgeTagSaved,
                draftConfig: fridgeTagDraft,
                loading: fridgeTagMeta.loading,
                saving: fridgeTagMeta.saving,
                storageSource: fridgeTagMeta.storageSource,
                storageWarning: fridgeTagMeta.storageWarning,
                setDraftConfig: setFridgeTagDraft,
                saveDraft: saveFridgeTagDraft,
                cancelDraft: cancelFridgeTagDraft,
                fieldMappingFields: [],
            }),
        [fridgeTagSaved, fridgeTagDraft, fridgeTagMeta, saveFridgeTagDraft, cancelFridgeTagDraft]
    )

    const emsApi = useMemo(
        () =>
            createDeviceApi({
                device: 'ems',
                savedConfig: emsSaved,
                draftConfig: emsDraft,
                loading: emsMeta.loading,
                saving: emsMeta.saving,
                storageSource: emsMeta.storageSource,
                storageWarning: emsMeta.storageWarning,
                setDraftConfig: setEmsDraft,
                saveDraft: saveEmsDraft,
                cancelDraft: cancelEmsDraft,
                fieldMappingFields: EMS_FIELD_MAPPING_FIELDS,
                requiresProgramStage: false,
            }),
        [emsSaved, emsDraft, emsMeta, saveEmsDraft, cancelEmsDraft]
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
