/**
 * Regenerate src/config/emsFieldMappingDefinitions.js from data/EMS_general/mapping_basic.csv
 * Usage: node scripts/generateEmsFieldMappings.js
 */
const fs = require('fs')
const path = require('path')

const csvPath = path.join(__dirname, '../data/EMS_general/mapping_basic.csv')
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

const raw = fs.readFileSync(csvPath, 'utf8')
const allRows = parseCSV(raw)
const headerRow = allRows.find((r) => r.includes('Object ID'))
const headers = headerRow.map((h) => h.trim())
const colIdx = (name) => headers.findIndex((h) => h === name || h.startsWith(name))

const fields = allRows
    .filter((r) => r[0] && /^\d+$/.test(r[0].trim()))
    .map((cols) => ({
        key: cols[colIdx('Object ID')].trim(),
        label: cols[colIdx('Data Object')].trim().replace(/'/g, "\\'"),
        category: cols[colIdx('Data Category')].trim(),
        kind: mapKind(cols[colIdx('DHIS2 metadata type')]),
        required: (cols[colIdx('Required - Must record data object')] || '').trim() === 'Required',
    }))

const fieldEntries = fields
    .map(
        (f) => `    {
        key: '${f.key}',
        label: () => i18n.t('${f.label}'),
        kind: '${f.kind}',
        category: '${f.category}',
        required: ${f.required},
        defaultValue: '',
        helpText: () => i18n.t('EMS field: {{objectId}}', { objectId: '${f.key}', nsSeparator: false }),
    }`
    )
    .join(',\n')

const out = `import i18n from '@dhis2/d2-i18n'

/** @typedef {'attribute' | 'dataElement' | 'organisationUnit'} EmsFieldMappingKind */

/**
 * EMS field mappings from data/EMS_general/mapping_basic.csv
 * Regenerate with: node scripts/generateEmsFieldMappings.js
 * @type {Array<{ key: string, label: () => string, kind: EmsFieldMappingKind, category: string, required: boolean, defaultValue: string, helpText: () => string }>}
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
`

fs.writeFileSync(outPath, out)
console.log(`Wrote ${fields.length} EMS field mappings to ${outPath}`)
