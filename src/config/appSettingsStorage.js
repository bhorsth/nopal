const STORAGE_KEY = 'app-developer-settings'

export function loadAppSettingsLocal() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        return raw ? JSON.parse(raw) : {}
    } catch {
        return {}
    }
}

export function saveAppSettingsLocal(settings) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    return settings
}
