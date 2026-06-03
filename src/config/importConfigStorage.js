const STORAGE_KEY = 'ems-import-config'

export function loadImportConfig() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        return raw ? JSON.parse(raw) : {}
    } catch {
        return {}
    }
}

export function saveImportConfig(partial) {
    const next = { ...loadImportConfig(), ...partial }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    return next
}
