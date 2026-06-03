// Minimal shared helper retained for potential reuse; original data model
// classes were removed as they were unused in the app bundle.
export function cleanNumber(value) {
  if (value === null || value === undefined || value === '---') {
    return null
  }
  if (typeof value === 'number') {
    return value
  }
  if (typeof value === 'string') {
    const numPart = value.split(',')[0].trim()
    if (numPart === '') return null
    const parsed = Number(numPart)
    return Number.isNaN(parsed) ? value : parsed
  }
  return value
}