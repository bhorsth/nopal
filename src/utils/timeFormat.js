export const formatMinutesToHHMM = (minutes) => {
    const mins = Number(minutes) || 0
    // DHIS2 time format requires hours to be 0-23, so cap at 23:59 (1439 minutes)
    const maxMinutes = 1439
    const cappedMins = Math.min(mins, maxMinutes)
    const h = Math.floor(cappedMins / 60)
    const m = cappedMins % 60
    const hh = String(h).padStart(2, '0')
    const mm = String(m).padStart(2, '0')
    return `${hh}:${mm}`
}

export default formatMinutesToHHMM
