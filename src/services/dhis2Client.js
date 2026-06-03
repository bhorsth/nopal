// Minimal DHIS2 client layer (Tracker) — sub-point: search tracked entity by serial
import { assertDhis2Config } from '../config/dhis2.js'

function authHeader(username, password) {
    const token = btoa(`${username}:${password}`)
    return { Authorization: `Basic ${token}` }
}

export async function searchTrackedEntityBySerial(serial) {
    const cfg = assertDhis2Config()
    const url = new URL('/api/42/tracker/trackedEntities', cfg.baseUrl)
    url.searchParams.set('filter', `XHdkwj2Gzi8:like:${serial}`)
    url.searchParams.set('fields', 'trackedEntity,orgUnit,enrollments[enrollment,orgUnit]')
    url.searchParams.set('program', cfg.programId)
    url.searchParams.set('orgUnitMode', 'ACCESSIBLE')

    const res = await fetch(url.toString(), {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            ...authHeader(cfg.username, cfg.password),
        },
    })

    if (!res.ok) {
        const text = await res.text()
        throw new Error(`DHIS2 search failed: ${res.status} ${res.statusText} – ${text}`)
    }

    const data = await res.json()
    return data?.trackedEntities ?? []
}

