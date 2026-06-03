import { useDataQuery } from '@dhis2/app-runtime'
import { useEffect, useMemo } from 'react'

const metadataQuery = {
    program: {
        resource: 'programs',
        id: ({ programId }) => programId,
        params: {
            fields: [
                'programTrackedEntityAttributes[trackedEntityAttribute[id,name,displayName,shortName,code]]',
                'programStages[id,displayName,programStageDataElements[dataElement[id,displayName]]]',
            ].join(','),
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
        }))
        .sort((a, b) => a.displayName.localeCompare(b.displayName))
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

export const useProgramFieldOptions = (programId, programStageId) => {
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

    const { attributes, dataElements, programMetadataReady, stageMetadataReady } = useMemo(() => {
        const program = data?.program
        let attributeOptions = parseProgramAttributes(program)
        if (attributeOptions.length === 0 && legacyData?.program) {
            attributeOptions = parseProgramAttributes(legacyData.program)
        }

        const stage = (program?.programStages ?? []).find((s) => s.id === programStageId)
        const dataElementOptions = (stage?.programStageDataElements ?? [])
            .map((row) => row.dataElement)
            .filter(Boolean)
            .map((de) => ({
                id: de.id,
                displayName: de.displayName || de.id,
            }))
            .sort((a, b) => a.displayName.localeCompare(b.displayName))

        const metadataLoaded = Boolean(
            programId && !loading && !fetching && !legacyLoading && !legacyFetching && program
        )

        return {
            attributes: attributeOptions,
            dataElements: dataElementOptions,
            programMetadataReady: metadataLoaded,
            stageMetadataReady: Boolean(metadataLoaded && programStageId),
        }
    }, [data, legacyData, programId, programStageId, loading, fetching, legacyLoading, legacyFetching])

    return {
        attributes,
        dataElements,
        loading: Boolean(programId && (loading || fetching || legacyLoading || legacyFetching)),
        error,
        programMetadataReady,
        stageMetadataReady,
        ready: Boolean(programId && programStageId && !loading && !fetching && data),
    }
}
