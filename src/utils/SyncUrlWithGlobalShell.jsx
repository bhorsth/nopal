import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'

/**
 * Keeps the DHIS2 Global Shell browser URL in sync when using hash routing.
 */
export const SyncUrlWithGlobalShell = () => {
    const location = useLocation()

    useEffect(() => {
        dispatchEvent(new PopStateEvent('popstate'))
    }, [location.key])

    return <Outlet />
}
