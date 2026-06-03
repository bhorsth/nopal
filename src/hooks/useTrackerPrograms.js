import { useDataQuery } from '@dhis2/app-runtime'
import { useEffect, useMemo } from 'react'

const TRACKER_PROGRAM_TYPES = new Set(['WITH_REGISTRATION', 'TRACKER'])

const programsQuery = {
    programs: {
        resource: 'programs',
        params: {
            fields: 'id,displayName,programType',
            paging: false,
            order: 'displayName:asc',
        },
    },
}

const programStagesQuery = {
    program: {
        resource: 'programs',
        id: ({ programId }) => programId,
        params: {
            fields: 'programStages[id,displayName,sortOrder]',
        },
    },
}

export const useTrackerPrograms = () => {
    const { loading, fetching, error, data } = useDataQuery(programsQuery)

    const programs = useMemo(() => {
        const list = data?.programs?.programs ?? []
        const trackerOnly = list.filter(
            (p) => !p.programType || TRACKER_PROGRAM_TYPES.has(p.programType)
        )
        return trackerOnly.length > 0 ? trackerOnly : list
    }, [data])

    return {
        programs,
        loading: loading || fetching,
        error,
    }
}

export const useProgramStages = (programId) => {
    const { loading, fetching, error, data, refetch } = useDataQuery(programStagesQuery, {
        lazy: true,
    })

    useEffect(() => {
        if (programId) {
            refetch({ programId })
        }
    }, [programId, refetch])

    const stages = useMemo(() => {
        const list = data?.program?.programStages ?? []
        return [...list].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    }, [data])

    return {
        stages,
        loading: Boolean(programId && (loading || fetching)),
        error,
    }
}
