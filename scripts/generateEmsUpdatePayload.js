/**
 * Generate the tracker import payload produced by EMS "Update data"
 * for a given EMS JSON export file.
 *
 * Usage:
 *   node scripts/generateEmsUpdatePayload.js [input.json] [output.json]
 */

const fs = require('fs')
const path = require('path')
require('dotenv/config')

const defaultInput = path.join(
    __dirname,
    '../data/EMS_vestfrost /0D3B7F96E129CE7D_CURRENT_DATA_P31DT22H4M45S.json'
)
const defaultOutput = path.join(
    __dirname,
    '../data/EMS_vestfrost /0D3B7F96E129CE7D_CURRENT_DATA_update_payload.json'
)

const args = process.argv.slice(2).filter((arg) => !arg.startsWith('--'))
const flags = new Set(process.argv.slice(2).filter((arg) => arg.startsWith('--')))
const inputPath = args[0] || defaultInput
const outputPath = args[1] || defaultOutput
const contextPath = path.join(path.dirname(defaultInput), 'ems_sync_context.json')
const usePlaceholderIds = flags.has('--placeholder-ids')
const csvPath = path.join(__dirname, '../data/EMS_general/dhis2_mapping_advanced.csv')

const {
    REACT_APP_DHIS2_BASE_URL: baseUrl,
    REACT_APP_DHIS2_USERNAME: username,
    REACT_APP_DHIS2_PASSWORD: password,
    REACT_APP_DHIS2_PROGRAM_ID: programId,
    REACT_APP_DHIS2_ORG_UNIT_ID: fallbackOrgUnitId,
    REACT_APP_DHIS2_TE_TYPE_ID: fallbackTeTypeId,
} = process.env

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

function loadEmsFieldDefinitions() {
    const mapKind = (dhis2Type) => {
        const t = (dhis2Type || '').trim()
        if (t === 'Tracked entity attribute' || t === '(optional)') return 'attribute'
        if (t === 'Data element (Tracker)') return 'dataElement'
        if (t === 'Organisation unit') return 'organisationUnit'
        return 'dataElement'
    }

    const allRows = parseCSV(fs.readFileSync(csvPath, 'utf8'))
    const headerRow = allRows.find((r) => r.includes('Object ID'))
    const headers = headerRow.map((h) => h.trim())
    const colIdx = (name) => headers.findIndex((h) => h === name || h.startsWith(name))
    const OTHER_GROUP = 'Other'

    return allRows
        .filter((r) => r[0] && /^\d+$/.test(r[0].trim()))
        .map((cols) => ({
            key: cols[colIdx('Object ID')].trim(),
            kind: mapKind(cols[colIdx('DHIS2 metadata type')]),
            stageOrAttribute: (cols[colIdx('DHIS2 program stage or attribute')] || '').trim() || OTHER_GROUP,
            dhis2Name: (cols[colIdx('DHIS2 name')] || '').trim(),
            dhis2Code: (cols[colIdx('DHIS2 Code')] || '').trim(),
        }))
}

const HEADER_KEYS = [
    'AMOD', 'AMFR', 'ASER', 'ADOP', 'APQS', 'ACAT', 'AID', 'CNAM', 'CSER', 'CSOF', 'CDAT',
    'CNAM2', 'CSER2', 'CSOF2', 'CDAT2', 'LDOP', 'LMFR', 'LMOD', 'LPQS', 'LSER', 'LSV',
    'LID', 'EID', 'EMFR', 'EMOD', 'ESER', 'EDOP', 'EMSV', 'EPQS', 'RNAM', 'DNAM', 'FNAM',
    'CID', 'FID', 'LAT', 'LNG', 'LACC',
]

function isEmsPresentValue(value) {
    if (value == null || value === '') return false
    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase()
        return normalized !== 'null' && normalized !== 'n/a'
    }
    return true
}

function formatEmsValue(value) {
    if (!isEmsPresentValue(value)) return null
    return String(value)
}

function parseEmsJson(raw) {
    const metadata = {}
    HEADER_KEYS.forEach((key) => {
        if (key in raw) metadata[key] = raw[key]
    })
    const serial = isEmsPresentValue(metadata.LSER) ? String(metadata.LSER).trim() : null
    const records = Array.isArray(raw.records)
        ? raw.records.filter((record) => record && typeof record === 'object')
        : []
    return { config: { serial }, metadata, records, recordCount: records.length }
}

function parseIsoDurationToSeconds(duration) {
    if (!duration || typeof duration !== 'string') return 0
    const match = duration.match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/i)
    if (!match) return 0
    const days = Number(match[1] || 0)
    const hours = Number(match[2] || 0)
    const minutes = Number(match[3] || 0)
    const seconds = Number(match[4] || 0)
    return days * 86400 + hours * 3600 + minutes * 60 + seconds
}

function computeEmsOccurredAtTimes(records, referenceTime = new Date()) {
    const relSeconds = records.map((record) => parseIsoDurationToSeconds(record.RELT))
    const minSeconds = Math.min(...relSeconds)
    const refMs = referenceTime.getTime()
    return records.map((_, index) => {
        const seconds = relSeconds[index] ?? 0
        const offsetMs = (seconds - minSeconds) * 1000
        return new Date(refMs - offsetMs).toISOString()
    })
}

function findMetadataMatch(field, options) {
    if (!options?.length) return null
    const code = (field.dhis2Code || '').trim()
    if (code) {
        const byCode = options.find((opt) => (opt.code || '').trim() === code)
        if (byCode) return byCode
    }
    const name = (field.dhis2Name || '').trim()
    if (!name) return null
    const normalizedName = name.toLowerCase()
    return (
        options.find((opt) => (opt.displayName || '').trim().toLowerCase() === normalizedName) ||
        options.find((opt) => (opt.name || '').trim().toLowerCase() === normalizedName) ||
        null
    )
}

function buildEmsAutoMappings(fieldDefinitions, { attributes, dataElementsByStageName }) {
    const mappings = {}
    fieldDefinitions.forEach((field) => {
        if (field.kind === 'organisationUnit') return
        if (field.kind === 'attribute') {
            const match = findMetadataMatch(field, attributes)
            if (match) mappings[field.key] = match.id
            return
        }
        if (field.kind === 'dataElement') {
            const stageOptions = dataElementsByStageName[field.stageOrAttribute] || []
            const match = findMetadataMatch(field, stageOptions)
            if (match) mappings[field.key] = match.id
        }
    })
    return mappings
}

function isNumericAggregateValue(value) {
    if (typeof value === 'number' && !Number.isNaN(value)) return true
    if (typeof value === 'string' && value.trim() !== '') {
        return !Number.isNaN(Number(value))
    }
    return false
}

function aggregateEmsFieldsForDay(dayRecords) {
    const fieldKeys = new Set()
    dayRecords.forEach((record) => Object.keys(record).forEach((key) => fieldKeys.add(key)))
    const aggregated = {}
    fieldKeys.forEach((key) => {
        const values = dayRecords.map((record) => record[key]).filter(isEmsPresentValue)
        if (values.length === 0) return
        if (values.every(isNumericAggregateValue)) {
            const numbers = values.map((value) => Number(value))
            aggregated[key] = numbers.reduce((total, value) => total + value, 0) / numbers.length
            return
        }
        aggregated[key] = values[values.length - 1]
    })
    return aggregated
}

function aggregateEmsRecordsByDay(records, referenceTime = new Date()) {
    const occurredAtTimes = computeEmsOccurredAtTimes(records, referenceTime)
    const recordsByDay = new Map()
    records.forEach((record, index) => {
        const date = occurredAtTimes[index]?.slice(0, 10)
        if (!date) return
        if (!recordsByDay.has(date)) recordsByDay.set(date, [])
        recordsByDay.get(date).push(record)
    })
    return [...recordsByDay.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, dayRecords]) => ({
            date,
            fields: aggregateEmsFieldsForDay(dayRecords),
            readingCount: dayRecords.length,
        }))
}

function groupEmsRecordDataValuesByStage(record, mappings, fieldDefinitions) {
    const byStage = {}
    fieldDefinitions.forEach((field) => {
        if (field.kind !== 'dataElement') return
        const dataElement = mappings[field.key]
        if (!dataElement) return
        const value = formatEmsValue(record[field.key])
        if (value == null) return
        const stageName = field.stageOrAttribute || 'Other'
        if (!byStage[stageName]) byStage[stageName] = []
        byStage[stageName].push({ dataElement, value })
    })
    return byStage
}

function assertEnv() {
    const missing = []
    if (!baseUrl) missing.push('REACT_APP_DHIS2_BASE_URL')
    if (!username) missing.push('REACT_APP_DHIS2_USERNAME')
    if (!password) missing.push('REACT_APP_DHIS2_PASSWORD')
    if (!programId) missing.push('REACT_APP_DHIS2_PROGRAM_ID')
    if (missing.length) throw new Error(`Missing env vars: ${missing.join(', ')}`)
}

async function apiGet(resourcePath, params = {}) {
    const url = new URL(`/api/${resourcePath}`, baseUrl.replace(/\/$/, '') + '/')
    Object.entries(params).forEach(([key, value]) => {
        if (value != null && value !== '') url.searchParams.set(key, value)
    })
    const response = await fetch(url, {
        headers: {
            Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
            Accept: 'application/json',
        },
    })
    if (!response.ok) {
        const body = await response.text()
        throw new Error(`DHIS2 API ${response.status} for ${url.pathname}: ${body.slice(0, 500)}`)
    }
    return response.json()
}

function parseProgramMetadata(program) {
    const attributeRows = program?.programTrackedEntityAttributes ?? program?.trackedEntityAttributes ?? []
    const attributes = attributeRows
        .map((row) => row.trackedEntityAttribute ?? row)
        .filter((attr) => attr?.id)
        .map((attr) => ({
            id: attr.id,
            displayName: attr.displayName || attr.name || attr.id,
            name: attr.name || attr.displayName || '',
            code: attr.code || '',
        }))

    const stages = (program?.programStages ?? []).map((stage) => {
        const dataElements = (stage.programStageDataElements ?? [])
            .map((row) => row.dataElement)
            .filter(Boolean)
            .map((de) => ({
                id: de.id,
                displayName: de.displayName || de.id,
                code: de.code || '',
            }))
        return { id: stage.id, displayName: stage.displayName || stage.id, dataElements }
    })

    const dataElementsByStageName = Object.fromEntries(
        stages.map((stage) => [stage.displayName, stage.dataElements])
    )
    return { attributes, stages, dataElementsByStageName }
}

function getOrgUnitId(tei) {
    const orgUnit = tei?.orgUnit
    if (!orgUnit) return null
    return typeof orgUnit === 'object' ? orgUnit.id : orgUnit
}

async function lookupTrackedEntity(serial, serialAttributeId) {
    const data = await apiGet('tracker/trackedEntities', {
        filter: `${serialAttributeId}:like:${serial}`,
        fields: 'trackedEntity,trackedEntityType,orgUnit[id,name],attributes[attribute,displayName,value],enrollments[enrollment,orgUnit,program]',
        program: programId,
        orgUnitMode: 'ACCESSIBLE',
    })
    return data?.trackedEntities?.[0] || null
}

function buildPayload({ parsed, fieldMappings, fieldDefinitions, tei, referenceTime, stages }) {
    const trackedEntity = tei?.trackedEntity || '<TRACKED_ENTITY_UID>'
    const enrollment = tei?.enrollments?.find((e) => e.program === programId)?.enrollment || '<ENROLLMENT_UID>'
    const orgUnit = getOrgUnitId(tei) || fallbackOrgUnitId || '<ORG_UNIT_UID>'
    const stageNameToId = Object.fromEntries((stages ?? []).map((stage) => [stage.displayName, stage.id]))
    const dailyRecords = aggregateEmsRecordsByDay(parsed.records, referenceTime)
    const events = []

    dailyRecords.forEach((dailyRecord) => {
        const byStage = groupEmsRecordDataValuesByStage(
            dailyRecord.fields,
            fieldMappings,
            fieldDefinitions
        )
        Object.entries(byStage).forEach(([stageName, dataValues]) => {
            const programStage = stageNameToId[stageName]
            if (!programStage || dataValues.length === 0) return
            events.push({
                orgUnit,
                occurredAt: dailyRecord.date,
                status: 'ACTIVE',
                program: programId,
                programStage,
                trackedEntity,
                enrollment,
                dataValues,
            })
        })
    })

    const payload = {
        _meta: {
            description: 'Tracker import payload equivalent to EMS Update data (daily aggregated)',
            sourceFile: path.basename(inputPath),
            generatedAt: referenceTime.toISOString(),
            programId,
            programStages: stages?.map((stage) => ({ id: stage.id, displayName: stage.displayName })) ?? [],
            loggerSerial: parsed.config.serial,
            recordCount: parsed.records.length,
            dailyRecordCount: dailyRecords.length,
            eventCount: events.length,
            fieldMappingsResolved: Object.values(fieldMappings).filter(Boolean).length,
            trackedEntityLookup: tei
                ? {
                      trackedEntity: tei.trackedEntity,
                      trackedEntityType: tei.trackedEntityType,
                      orgUnit: getOrgUnitId(tei),
                      enrollment: tei.enrollments?.find((e) => e.program === programId)?.enrollment,
                  }
                : null,
            note: 'POST to /api/tracker?async=false with body { events } (omit _meta)',
        },
        events,
    }
    return payload
}

function loadSyncContext() {
    if (!fs.existsSync(contextPath)) {
        return null
    }
    return JSON.parse(fs.readFileSync(contextPath, 'utf8'))
}

function buildPlaceholderMappings(fieldDefinitions) {
    const mappings = {}
    fieldDefinitions.forEach((field) => {
        if (field.kind === 'organisationUnit') return
        mappings[field.key] = field.dhis2Code || field.key
    })
    return mappings
}

function buildPlaceholderStages(fieldDefinitions) {
    const stageNames = [
        ...new Set(
            fieldDefinitions
                .filter((field) => field.kind === 'dataElement')
                .map((field) => field.stageOrAttribute)
                .filter(Boolean)
        ),
    ]
    return stageNames.map((displayName) => ({ id: displayName, displayName }))
}

function teiFromContext(context) {
    if (!context?.trackedEntityLookup) return null
    const lookup = context.trackedEntityLookup
    return {
        trackedEntity: lookup.trackedEntity,
        trackedEntityType: lookup.trackedEntityType,
        orgUnit: lookup.orgUnit,
        enrollments: lookup.enrollment ? [{ enrollment: lookup.enrollment, program: programId }] : [],
    }
}

async function resolveGenerationContext(fieldDefinitions, serial) {
    if (usePlaceholderIds) {
        return {
            fieldMappings: buildPlaceholderMappings(fieldDefinitions),
            stages: buildPlaceholderStages(fieldDefinitions),
            tei: teiFromContext(loadSyncContext()) || {
                trackedEntity: 'IyHnXyO7u8F',
                trackedEntityType: fallbackTeTypeId,
                orgUnit: fallbackOrgUnitId,
                enrollments: [{ enrollment: '<ENROLLMENT_UID>', program: programId }],
            },
            idScheme: 'placeholder',
        }
    }

    const cached = loadSyncContext()
    if (cached?.fieldMappings && cached?.stages) {
        return {
            fieldMappings: cached.fieldMappings,
            stages: cached.stages,
            tei: teiFromContext(cached) || (await lookupTrackedEntity(serial, cached.fieldMappings.LSER)),
            idScheme: 'context',
        }
    }

    const program = await apiGet(`programs/${programId}`, {
        fields: [
            'programTrackedEntityAttributes[trackedEntityAttribute[id,name,displayName,code]]',
            'programStages[id,displayName,programStageDataElements[dataElement[id,displayName,code]]]',
        ].join(','),
    })

    const metadata = parseProgramMetadata(program)
    const fieldMappings = buildEmsAutoMappings(fieldDefinitions, metadata)
    const serialAttributeId = fieldMappings.LSER
    if (!serialAttributeId) {
        throw new Error('Could not resolve LSER attribute mapping from program metadata')
    }

    const tei = await lookupTrackedEntity(serial, serialAttributeId)
    if (!tei) {
        console.warn(`Warning: no tracked entity found for serial ${serial}; using placeholder UIDs`)
    }

    return {
        fieldMappings,
        stages: metadata.stages,
        tei,
        idScheme: 'dhis2-api',
    }
}

async function main() {
    if (!usePlaceholderIds) {
        assertEnv()
    }

    const fieldDefinitions = loadEmsFieldDefinitions()
    const parsed = parseEmsJson(JSON.parse(fs.readFileSync(inputPath, 'utf8')))
    const serial = parsed.config.serial
    if (!serial) throw new Error('No logger serial (LSER) found in EMS file')

    const context = loadSyncContext()
    const { fieldMappings, stages, tei, idScheme } = await resolveGenerationContext(fieldDefinitions, serial)
    if (!stages?.length) {
        throw new Error('Could not resolve program stages from program metadata')
    }

    const referenceTime = new Date()
    const payload = buildPayload({
        parsed,
        fieldMappings,
        fieldDefinitions,
        tei,
        referenceTime,
        stages,
    })
    payload._meta.idScheme = idScheme
    if (idScheme === 'placeholder') {
        payload._meta.note =
            'IDs use EMS object codes/keys as placeholders. Regenerate online with: node scripts/generateEmsUpdatePayload.js'
    }

    fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2))
    console.log(`Wrote ${outputPath}`)
    console.log(
        JSON.stringify(
            {
                records: payload._meta.recordCount,
                dailyRecords: payload._meta.dailyRecordCount,
                events: payload._meta.eventCount,
                mappedFields: payload._meta.fieldMappingsResolved,
            },
            null,
            2
        )
    )
}

main().catch((error) => {
    console.error(error.message)
    process.exit(1)
})
