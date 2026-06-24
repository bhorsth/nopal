import i18n from '@dhis2/d2-i18n'
import { SERIAL_ATTRIBUTE_ID } from './dhis2Tracker'

/** @typedef {'attribute' | 'dataElement'} FieldMappingKind */

/**
 * Fridge-tag → DHIS2 field mappings configurable in Settings.
 * @type {Array<{ key: string, label: () => string, kind: FieldMappingKind, defaultValue: string }>}
 */
export const FIELD_MAPPING_FIELDS = [
    {
        key: 'serialAttribute',
        label: () => i18n.t('Serial attribute'),
        kind: 'attribute',
        defaultValue: SERIAL_ATTRIBUTE_ID,
    },
    {
        key: 'avgStorageTemp',
        label: () => i18n.t('Average storage temperature (°C)'),
        kind: 'dataElement',
        defaultValue: 'ITjXBXe4LHp',
    },
    {
        key: 'status',
        label: () => i18n.t('Status'),
        kind: 'dataElement',
        defaultValue: 'lMGgg93GNCj',
    },
    {
        key: 'minTemp',
        label: () => i18n.t('Min. temp. (°C)'),
        kind: 'dataElement',
        defaultValue: 'iMon5EnL5tT',
    },
    {
        key: 'timeBelowThreshold',
        label: () => i18n.t('Total time below -0.5°C (minutes)'),
        kind: 'dataElement',
        defaultValue: 'ZkLhYyo0muJ',
    },
    {
        key: 'totalLowAlarmTime',
        label: () => i18n.t('Total low alarm time (minutes)'),
        kind: 'dataElement',
        defaultValue: 'DEMIzoie6FB',
    },
    {
        key: 'maxTemp',
        label: () => i18n.t('Max. temp. (°C)'),
        kind: 'dataElement',
        defaultValue: 'pXXv6fqYhhx',
    },
    {
        key: 'timeAboveThreshold',
        label: () => i18n.t('Total time above 8.0°C (minutes)'),
        kind: 'dataElement',
        defaultValue: 'uKw4f9GjumZ',
    },
    {
        key: 'totalHighAlarmTime',
        label: () => i18n.t('Total high alarm time (minutes)'),
        kind: 'dataElement',
        defaultValue: 'twdH0WRfqwl',
    },
    {
        key: 'avgAmbientTemp',
        label: () => i18n.t('Average ambient temp (°C)'),
        kind: 'dataElement',
        defaultValue: 'ELbtzJtt9xI',
    },
    {
        key: 'faults',
        label: () => i18n.t('Faults'),
        kind: 'dataElement',
        defaultValue: 'XZHVruaj3BD',
    },
    {
        key: 'alarmCondition',
        label: () => i18n.t('Alarm condition'),
        kind: 'dataElement',
        defaultValue: 'YBjvNW66Q78',
    },
]

export const FIELD_MAPPING_KEYS = FIELD_MAPPING_FIELDS.map((f) => f.key)

export const DEFAULT_FIELD_MAPPINGS = Object.fromEntries(
    FIELD_MAPPING_FIELDS.map((f) => [f.key, f.defaultValue])
)
