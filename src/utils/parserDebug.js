/**
 * Runtime flag for verbose Fridge-tag parser logging (browser console).
 * Updated from Settings and persisted in the DHIS2 data store.
 */
let parserDebugEnabled = process.env.REACT_APP_PARSER_DEBUG === 'true'

export const isParserDebugEnabled = () => parserDebugEnabled

export const setParserDebugEnabled = (enabled) => {
    parserDebugEnabled = Boolean(enabled)
}
