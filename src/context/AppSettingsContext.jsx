import { useDataEngine } from '@dhis2/app-runtime'
import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react'
import { DEFAULT_APP_SETTINGS } from '../config/appSettingsDefaults'
import { loadAppSettings, saveAppSettings } from '../services/appSettingsPersistence'
import { setParserDebugEnabled } from '../utils/parserDebug'

const AppSettingsContext = createContext(null)

export const AppSettingsProvider = ({ children }) => {
    const engine = useDataEngine()
    const [settings, setSettings] = useState(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [storageSource, setStorageSource] = useState(null)
    const [storageWarning, setStorageWarning] = useState(null)

    useEffect(() => {
        let cancelled = false

        const load = async () => {
            setLoading(true)
            try {
                const result = await loadAppSettings(engine)
                if (cancelled) return
                setSettings(result.settings)
                setStorageSource(result.source)
                setStorageWarning(result.warning || null)
            } catch (error) {
                if (cancelled) return
                setSettings({ ...DEFAULT_APP_SETTINGS })
                setParserDebugEnabled(DEFAULT_APP_SETTINGS.parserDebug)
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
            setSettings(next)
            setSaving(true)
            try {
                const result = await saveAppSettings(engine, next)
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

    const updateSetting = useCallback(
        (key, value) => {
            setSettings((prev) => {
                const base = prev || { ...DEFAULT_APP_SETTINGS }
                const next = { ...base, [key]: value }
                if (key === 'parserDebug') {
                    setParserDebugEnabled(value)
                }
                persist(next)
                return next
            })
        },
        [persist]
    )

    const value = useMemo(() => {
        const resolved = settings || { ...DEFAULT_APP_SETTINGS }

        return {
            parserDebug: Boolean(resolved.parserDebug),
            showDownloadJson: Boolean(resolved.showDownloadJson),
            showViewParsedData: Boolean(resolved.showViewParsedData),
            setParserDebug: (checked) => updateSetting('parserDebug', checked),
            setShowDownloadJson: (checked) => updateSetting('showDownloadJson', checked),
            setShowViewParsedData: (checked) => updateSetting('showViewParsedData', checked),
            settingsLoading: loading,
            settingsSaving: saving,
            storageSource,
            storageWarning,
        }
    }, [settings, loading, saving, storageSource, storageWarning, updateSetting])

    return (
        <AppSettingsContext.Provider value={value}>{children}</AppSettingsContext.Provider>
    )
}

export const useAppSettings = () => {
    const context = useContext(AppSettingsContext)
    if (!context) {
        throw new Error('useAppSettings must be used within AppSettingsProvider')
    }
    return context
}
