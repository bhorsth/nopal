import { useMemo } from 'react'
import { useProgramMetadata } from './useProgramMetadata'

export const useProgramFieldOptions = (programId, programStageId) => {
    const { attributes, stages, loading, error, programMetadataReady } =
        useProgramMetadata(programId)

    const { dataElements, stageMetadataReady } = useMemo(() => {
        const stage = stages.find((s) => s.id === programStageId)
        const dataElementOptions = stage?.dataElements ?? []

        return {
            dataElements: dataElementOptions,
            stageMetadataReady: Boolean(programMetadataReady && programStageId),
        }
    }, [stages, programStageId, programMetadataReady])

    return {
        attributes,
        dataElements,
        loading,
        error,
        programMetadataReady,
        stageMetadataReady,
        ready: Boolean(programId && programStageId && !loading && programMetadataReady),
    }
}
