export const APP_SETTINGS_DATA_STORE_KEY = 'developer-settings'

export const DEFAULT_APP_SETTINGS = {
    parserDebug: process.env.REACT_APP_PARSER_DEBUG === 'true',
    showDownloadJson: true,
    showViewParsedData: true,
}
