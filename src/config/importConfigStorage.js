/** @typedef {'fridgeTag' | 'ems'} ImportDevice */

const STORAGE_KEYS = {
    fridgeTag: 'ems-import-config',
    ems: 'ems-device-import-config',
}

/**
 * @param {ImportDevice} device
 */
export function loadImportConfig(device) {
    try {
        const raw = localStorage.getItem(STORAGE_KEYS[device])
        return raw ? JSON.parse(raw) : {}
    } catch {
        return {}
    }
}

/**
 * @param {ImportDevice} device
 */
export function saveImportConfig(device, settings) {
    localStorage.setItem(STORAGE_KEYS[device], JSON.stringify(settings))
    return settings
}
