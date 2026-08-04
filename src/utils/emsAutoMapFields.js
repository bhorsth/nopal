/**
 * Normalize labels for fuzzy metadata matching (case, whitespace, punctuation).
 * @param {string} value
 */
export const normalizeMetadataLabel = (value) =>
    String(value || '')
        .normalize('NFKC')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ')

const tokenizeLabel = (value) =>
    normalizeMetadataLabel(value)
        .replace(/[^a-z0-9]+/g, ' ')
        .split(/\s+/)
        .filter(Boolean)

/**
 * Candidate labels for an option (display name, name, code-stripped display name).
 * @param {{ displayName?: string, name?: string, code?: string }} option
 * @returns {string[]}
 */
const optionLabels = (option) => {
    const labels = []
    const displayName = (option.displayName || '').trim()
    const name = (option.name || '').trim()
    if (displayName) labels.push(displayName)
    if (name && name !== displayName) labels.push(name)

    // Attribute options often render as "Name (CODE)"
    const withoutTrailingCode = displayName.replace(/\s*\([^)]*\)\s*$/, '').trim()
    if (withoutTrailingCode && withoutTrailingCode !== displayName) {
        labels.push(withoutTrailingCode)
    }

    return labels
}

/**
 * Match EMS field definitions to program metadata by DHIS2 name or code from the spec CSV.
 * @param {{ dhis2Name: string, dhis2Code: string, kind: string }} field
 * @param {Array<{ id: string, displayName?: string, name?: string, code?: string }>} options
 */
export const findMetadataMatch = (field, options) => {
    if (!options?.length) return null

    const code = (field.dhis2Code || '').trim()
    if (code) {
        const byCode = options.find((opt) => (opt.code || '').trim() === code)
        if (byCode) return byCode
    }

    const name = (field.dhis2Name || '').trim()
    if (!name) return null

    const normalizedName = normalizeMetadataLabel(name)

    const exact = options.find((opt) =>
        optionLabels(opt).some((label) => normalizeMetadataLabel(label) === normalizedName)
    )
    if (exact) return exact

    // Allow unit/suffix differences, e.g. "Ambient temperature" vs "Ambient temperature (°C)"
    const startsWith = options.find((opt) =>
        optionLabels(opt).some((label) => {
            const normalizedLabel = normalizeMetadataLabel(label)
            return (
                normalizedLabel.startsWith(normalizedName) ||
                normalizedName.startsWith(normalizedLabel)
            )
        })
    )
    return startsWith || null
}

/**
 * Resolve data elements for a configured stage name with exact, then fuzzy, then all-stages fallback.
 * @param {Record<string, Array>} dataElementsByStageName
 * @param {string} stageName
 * @returns {{ stageName: string | null, dataElements: Array, matchedExactly: boolean }}
 */
export const resolveDataElementsForStageName = (dataElementsByStageName, stageName) => {
    const byStage = dataElementsByStageName || {}
    const stageNames = Object.keys(byStage)
    const wanted = (stageName || '').trim()

    if (!wanted) {
        return { stageName: null, dataElements: [], matchedExactly: false }
    }

    if (byStage[wanted]) {
        return { stageName: wanted, dataElements: byStage[wanted], matchedExactly: true }
    }

    const normalizedWanted = normalizeMetadataLabel(wanted)
    const exactInsensitive = stageNames.find(
        (name) => normalizeMetadataLabel(name) === normalizedWanted
    )
    if (exactInsensitive) {
        return {
            stageName: exactInsensitive,
            dataElements: byStage[exactInsensitive],
            matchedExactly: true,
        }
    }

    const wantedTokens = tokenizeLabel(wanted)
    const fuzzy = stageNames.find((name) => {
        const normalized = normalizeMetadataLabel(name)
        if (normalized.includes(normalizedWanted) || normalizedWanted.includes(normalized)) {
            return true
        }
        const stageTokens = tokenizeLabel(name)
        if (wantedTokens.length === 0 || stageTokens.length === 0) return false
        const [shorter, longer] =
            wantedTokens.length <= stageTokens.length
                ? [wantedTokens, stageTokens]
                : [stageTokens, wantedTokens]
        return shorter.every((token) => longer.includes(token))
    })
    if (fuzzy) {
        return { stageName: fuzzy, dataElements: byStage[fuzzy], matchedExactly: false }
    }

    // Single-stage programs (EMS after consolidation): use that stage's data elements.
    if (stageNames.length === 1) {
        return {
            stageName: stageNames[0],
            dataElements: byStage[stageNames[0]],
            matchedExactly: false,
        }
    }

    // Last resort: union of all stage data elements so dropdowns are still usable.
    const seen = new Set()
    const all = []
    stageNames.forEach((name) => {
        ;(byStage[name] || []).forEach((de) => {
            if (!de?.id || seen.has(de.id)) return
            seen.add(de.id)
            all.push(de)
        })
    })
    all.sort((a, b) => (a.displayName || '').localeCompare(b.displayName || ''))

    return { stageName: null, dataElements: all, matchedExactly: false }
}

/**
 * @param {Array} fieldDefinitions - EMS_FIELD_MAPPING_FIELDS
 * @param {{ attributes: Array, dataElementsByStageName: Record<string, Array> }} metadata
 */
export const buildEmsAutoMappings = (fieldDefinitions, { attributes, dataElementsByStageName }) => {
    const mappings = {}

    fieldDefinitions.forEach((field) => {
        if (field.kind === 'organisationUnit') return

        if (field.kind === 'attribute') {
            const match = findMetadataMatch(field, attributes)
            if (match) mappings[field.key] = match.id
            return
        }

        if (field.kind === 'dataElement') {
            const { dataElements } = resolveDataElementsForStageName(
                dataElementsByStageName,
                field.stageOrAttribute
            )
            const match = findMetadataMatch(field, dataElements)
            if (match) mappings[field.key] = match.id
        }
    })

    return mappings
}
