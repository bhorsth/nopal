/**
 * Regenerate src/config/emsFieldMappingDefinitions.js from data/EMS_general/dhis2_mapping_advanced.csv
 * Usage: node scripts/generateEmsFieldMappings.js
 */
const fs = require('fs')
const path = require('path')

const csvPath = path.join(__dirname, '../data/EMS_general/dhis2_mapping_advanced.csv')
const outPath = path.join(__dirname, '../src/config/emsFieldMappingDefinitions.js')

function parseCSV(text) {
    const rows = []
    let row = []
    let field = ''
    let inQuotes = false
    for (let i = 0; i < text.length; i++) {
        const c = text[i]
        if (c === '"') {
            if (inQuotes && text[i + 1] === '"') {
                field += '"'
                i++
                continue
            }
            inQuotes = !inQuotes
            continue
        }
        if (c === ',' && !inQuotes) {
            row.push(field)
            field = ''
            continue
        }
        if ((c === '\n' || c === '\r') && !inQuotes) {
            if (c === '\r' && text[i + 1] === '\n') i++
            row.push(field)
            if (row.some((cell) => cell.trim())) rows.push(row)
            row = []
            field = ''
            continue
        }
        field += c
    }
    if (field || row.length) {
        row.push(field)
        if (row.some((cell) => cell.trim())) rows.push(row)
    }
    return rows
}

const mapKind = (dhis2Type) => {
    const t = (dhis2Type || '').trim()
    if (t === 'Tracked entity attribute' || t === '(optional)') return 'attribute'
    if (t === 'Data element (Tracker)') return 'dataElement'
    if (t === 'Organisation unit') return 'organisationUnit'
    return 'dataElement'
}

const escapeJs = (s) => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")

const raw = fs.readFileSync(csvPath, 'utf8')
const allRows = parseCSV(raw)
const headerRow = allRows.find((r) => r.includes('Object ID'))
const headers = headerRow.map((h) => h.trim())
const colIdx = (name) => headers.findIndex((h) => h === name || h.startsWith(name))

const OTHER_GROUP = 'Other'

const fields = allRows
    .filter((r) => r[0] && /^\d+$/.test(r[0].trim()))
    .map((cols) => {
        const stageOrAttribute = (cols[colIdx('DHIS2 program stage or attribute')] || '').trim()
        return {
            key: cols[colIdx('Object ID')].trim(),
            label: cols[colIdx('Data Object')].trim(),
            category: cols[colIdx('Data Category')].trim(),
            kind: mapKind(cols[colIdx('DHIS2 metadata type')]),
            stageOrAttribute: stageOrAttribute || OTHER_GROUP,
            dhis2Name: (cols[colIdx('DHIS2 name')] || '').trim(),
            dhis2Code: (cols[colIdx('DHIS2 Code')] || '').trim(),
            required: (cols[colIdx('Required - Must record data object')] || '').trim() === 'Required',
        }
    })

const stageOrAttributeSet = new Set(fields.map((f) => f.stageOrAttribute))
const stageOrAttributeGroups = [
    ...[...stageOrAttributeSet].filter((g) => g === 'TEI attribute'),
    ...[...stageOrAttributeSet]
        .filter((g) => g !== 'TEI attribute' && g !== OTHER_GROUP)
        .sort((a, b) => a.localeCompare(b)),
    ...(stageOrAttributeSet.has(OTHER_GROUP) ? [OTHER_GROUP] : []),
]

const fieldEntries = fields
    .map((f) => {
        const parts = [
            `        key: '${f.key}'`,
            `        label: () => i18n.t('${escapeJs(f.label)}')`,
            `        kind: '${f.kind}'`,
            `        category: '${escapeJs(f.category)}'`,
            `        stageOrAttribute: '${escapeJs(f.stageOrAttribute)}'`,
            `        dhis2Name: '${escapeJs(f.dhis2Name)}'`,
            `        dhis2Code: '${escapeJs(f.dhis2Code)}'`,
            `        required: ${f.required}`,
            `        defaultValue: ''`,
            `        helpText: () => i18n.t('EMS field: {{objectId}}', { objectId: '${f.key}', nsSeparator: false })`,
        ]
        return `    {\n${parts.join(',\n')},\n    }`
    })
    .join(',\n')

const groupEntries = stageOrAttributeGroups.map((g) => `    '${escapeJs(g)}'`).join(',\n')

const out = `import i18n from '@dhis2/d2-i18n'

/** @typedef {'attribute' | 'dataElement' | 'organisationUnit'} EmsFieldMappingKind */

/**
 * EMS field mappings from data/EMS_general/dhis2_mapping_advanced.csv
 * Regenerate with: node scripts/generateEmsFieldMappings.js
 * @type {Array<{ key: string, label: () => string, kind: EmsFieldMappingKind, category: string, stageOrAttribute: string, dhis2Name: string, dhis2Code: string, required: boolean, defaultValue: string, helpText: () => string }>}
 */
export const EMS_FIELD_MAPPING_FIELDS = [
${fieldEntries}
]

export const EMS_FIELD_MAPPING_KEYS = EMS_FIELD_MAPPING_FIELDS.map((f) => f.key)

export const EMS_REQUIRED_FIELD_MAPPING_KEYS = EMS_FIELD_MAPPING_FIELDS.filter(
    (f) => f.required && f.kind !== 'organisationUnit'
).map((f) => f.key)

export const EMS_DEFAULT_FIELD_MAPPINGS = Object.fromEntries(
    EMS_FIELD_MAPPING_FIELDS.map((f) => [f.key, f.defaultValue])
)

export const EMS_FIELD_CATEGORIES = [...new Set(EMS_FIELD_MAPPING_FIELDS.map((f) => f.category))]

/** UI section order: TEI attributes first, then program stages alphabetically, then Other. */
export const EMS_FIELD_STAGE_OR_ATTRIBUTE_GROUPS = [
${groupEntries}
]
`

fs.writeFileSync(outPath, out)
console.log(`Wrote ${fields.length} EMS field mappings to ${outPath}`)
