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

    const normalizedName = name.toLowerCase()
    return (
        options.find((opt) => (opt.displayName || '').trim().toLowerCase() === normalizedName) ||
        options.find((opt) => (opt.name || '').trim().toLowerCase() === normalizedName) ||
        null
    )
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
            const stageOptions = dataElementsByStageName[field.stageOrAttribute] || []
            const match = findMetadataMatch(field, stageOptions)
            if (match) mappings[field.key] = match.id
        }
    })

    return mappings
}
