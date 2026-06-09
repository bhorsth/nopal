import { useDataQuery } from '@dhis2/app-runtime'
import { useEffect, useMemo } from 'react'

const metadataQuery = {
    program: {
        resource: 'programs',
        id: ({ programId }) => programId,
        params: {
            fields: [
                'programTrackedEntityAttributes[trackedEntityAttribute[id,name,displayName,shortName,code]]',
                'programStages[id,displayName,programStageDataElements[dataElement[id,displayName,code]]]',
            ].join(','),
        },
    },
}

const legacyAttributesQuery = {
    program: {
        resource: 'programs',
        id: ({ programId }) => programId,
        params: {
            fields: 'trackedEntityAttributes[trackedEntityAttribute[id,name,displayName,shortName,code]]',
        },
    },
}

const formatAttributeLabel = (attr) => {
    const name = attr.name || attr.displayName || attr.shortName
    if (name && attr.code) {
        return `${name} (${attr.code})`
    }
    return name || attr.id
}

const parseProgramAttributes = (program) => {
    const rows =
        program?.programTrackedEntityAttributes ?? program?.trackedEntityAttributes ?? []

    return rows
        .map((row) => row.trackedEntityAttribute ?? row)
        .filter((attr) => attr?.id)
        .map((attr) => ({
            id: attr.id,
            displayName: formatAttributeLabel(attr),
            name: attr.name || attr.displayName || attr.shortName || '',
            code: attr.code || '',
        }))
        .sort((a, b) => a.displayName.localeCompare(b.displayName))
}

const parseProgramStages = (program) => {
    return (program?.programStages ?? [])
        .map((stage) => {
            const dataElements = (stage.programStageDataElements ?? [])
                .map((row) => row.dataElement)
                .filter(Boolean)
                .map((de) => ({
                    id: de.id,
                    displayName: de.displayName || de.id,
                    code: de.code || '',
                }))
                .sort((a, b) => a.displayName.localeCompare(b.displayName))

            return {
                id: stage.id,
                displayName: stage.displayName || stage.id,
                dataElements,
            }
        })
        .sort((a, b) => a.displayName.localeCompare(b.displayName))
}

export const useProgramMetadata = (programId) => {
    const { loading, fetching, error, data, refetch } = useDataQuery(metadataQuery, {
        lazy: true,
    })
    const {
        loading: legacyLoading,
        fetching: legacyFetching,
        data: legacyData,
        refetch: refetchLegacy,
    } = useDataQuery(legacyAttributesQuery, { lazy: true })

    useEffect(() => {
        if (programId) {
            refetch({ programId })
            refetchLegacy({ programId })
        }
    }, [programId, refetch, refetchLegacy])

    const result = useMemo(() => {
        const program = data?.program
        let attributes = parseProgramAttributes(program)
        if (attributes.length === 0 && legacyData?.program) {
            attributes = parseProgramAttributes(legacyData.program)
        }

        const stages = parseProgramStages(program)
        const dataElementsByStageName = Object.fromEntries(
            stages.map((stage) => [stage.displayName, stage.dataElements])
        )

        const metadataLoaded = Boolean(
            programId && !loading && !fetching && !legacyLoading && !legacyFetching && program
        )

        return {
            attributes,
            stages,
            dataElementsByStageName,
            programMetadataReady: metadataLoaded,
        }
    }, [data, legacyData, programId, loading, fetching, legacyLoading, legacyFetching])

    const isLoading = Boolean(
        programId && (loading || fetching || legacyLoading || legacyFetching)
    )

    return {
        ...result,
        loading: isLoading,
        error,
        ready: Boolean(programId && !isLoading && data?.program),
    }
}
