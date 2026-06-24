/**
 * Default alarm duration thresholds (minutes) when not specified in device config.
 * Cold: 1h, Hot: 10h — matches Fridge-tag report defaults.
 */
const DEFAULT_DURATION_MINUTES = {
    0: 60,
    1: 600,
}

/**
 * @param {{ durationMinutes?: number|null }} [threshold]
 * @param {number} level
 */
export function getEffectiveThreshold(threshold, level) {
    const durationMinutes =
        threshold?.durationMinutes ?? DEFAULT_DURATION_MINUTES[level] ?? null
    return { durationMinutes }
}

/**
 * Derive lower/upper alarm status from accumulated time and configured threshold.
 * @param {{ accumulatedMinutes?: number|null, level?: number }} alarm
 * @param {{ durationMinutes?: number|null }} [threshold]
 * @returns {{ status: 'ok' | 'in progress' | 'alarm', numeric: 0 | 1 }}
 */
export function deriveAlarmStatus(alarm, threshold) {
    const minutes = alarm?.accumulatedMinutes ?? 0
    if (!minutes || minutes <= 0) {
        return { status: 'ok', numeric: 0 }
    }

    const { durationMinutes } = getEffectiveThreshold(threshold, alarm?.level ?? 0)
    if (durationMinutes != null && durationMinutes > 0 && minutes >= durationMinutes) {
        return { status: 'alarm', numeric: 1 }
    }

    return { status: 'in progress', numeric: 1 }
}

/**
 * @param {Array<{ level: number, durationMinutes?: number|null }>} alarmThresholds
 * @param {number} level
 */
export function getThresholdForLevel(alarmThresholds, level) {
    return alarmThresholds?.find((t) => t.level === level) ?? null
}

/**
 * Enrich alarm objects with status and statusNumeric.
 * @param {Array<object>} alarms
 * @param {Array<{ level: number, durationMinutes?: number|null }>} alarmThresholds
 */
export function enrichAlarmsWithStatus(alarms, alarmThresholds = []) {
    return (alarms || []).map((alarm) => {
        const threshold = getThresholdForLevel(alarmThresholds, alarm.level)
        const { status, numeric } = deriveAlarmStatus(alarm, threshold)
        return {
            ...alarm,
            status,
            statusNumeric: numeric,
        }
    })
}
