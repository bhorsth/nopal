import { detectImportFileType } from './detectImportFileType'
import { parseEmsJson } from './emsParser'
import { parseFridgeTagJson } from './fridgeTagJsonParser'
import { FridgeTagParser, toJson } from './fridgeTagParser'
import { isFridgeTagJson } from './detectImportFileType'

/**
 * @param {string} content
 * @param {string} fileName
 */
export function parseImportFileContent(content, fileName = '') {
    const deviceType = detectImportFileType(fileName, content)

    if (deviceType === 'ems') {
        const raw = JSON.parse(content.trim())
        return parseEmsJson(raw)
    }

    const trimmed = content.trim()
    if (trimmed.startsWith('{')) {
        const raw = JSON.parse(trimmed)
        if (isFridgeTagJson(raw)) {
            return parseFridgeTagJson(raw)
        }
    }

    const parser = new FridgeTagParser()
    const rawData = parser.parseText(content)
    return { ...toJson(rawData), deviceType: 'fridgeTag' }
}

/**
 * @param {File} file
 */
export async function parseImportFile(file) {
    const content = await file.text()
    return parseImportFileContent(content, file.name)
}
