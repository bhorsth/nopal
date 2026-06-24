import { useDataEngine } from '@dhis2/app-runtime'
import { useEffect, useState } from 'react'
import { getDhis2Config } from '../config/dhis2'

/**
 * Load organisation units accessible to the current user, optionally filtered by facility level.
 */
export function useOrganisationUnits() {
    const engine = useDataEngine()
    const { config } = getDhis2Config()
    const facilityLevel = config.facilityLevel ? Number(config.facilityLevel) : null

    const [orgUnits, setOrgUnits] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        let cancelled = false

        const load = async () => {
            setLoading(true)
            setError(null)
            try {
                const params = {
                    fields: 'id,displayName,level,path',
                    paging: false,
                    userDataViewFallback: true,
                }
                if (facilityLevel != null && !Number.isNaN(facilityLevel)) {
                    params.level = facilityLevel
                }

                const result = await engine.query({
                    orgUnits: {
                        resource: 'organisationUnits',
                        params,
                    },
                })

                if (cancelled) return
                const units = result?.orgUnits?.organisationUnits ?? []
                setOrgUnits(
                    units
                        .map((ou) => ({
                            id: ou.id,
                            displayName: ou.displayName,
                            level: ou.level,
                            path: ou.path,
                        }))
                        .sort((a, b) => a.displayName.localeCompare(b.displayName))
                )
            } catch (err) {
                if (!cancelled) setError(err)
            } finally {
                if (!cancelled) setLoading(false)
            }
        }

        load()
        return () => {
            cancelled = true
        }
    }, [engine, facilityLevel])

    return { orgUnits, loading, error, facilityLevel }
}
