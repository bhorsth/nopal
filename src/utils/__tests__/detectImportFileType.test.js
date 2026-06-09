import fs from 'fs'
import path from 'path'
import { detectImportFileType, isEmsJson, isFridgeTagJson } from '../detectImportFileType'
import { parseImportFileContent } from '../parseImportFile'

const dataDir = path.join(__dirname, '../../../data')
const fridgeTagSample = path.join(dataDir, 'Fridge-tag')
const emsSample = path.join(
    dataDir,
    'EMS_vestfrost ',
    '0D3B7F96E129CE7D_CURRENT_DATA_P31DT22H4M45S.json'
)

describe('detectImportFileType', () => {
    it('detects EMS JSON from the Vestfrost sample', () => {
        const content = fs.readFileSync(emsSample, 'utf8')
        expect(detectImportFileType('device.json', content)).toBe('ems')
        expect(isEmsJson(JSON.parse(content))).toBe(true)
    })

    it('detects Fridge-tag JSON from the sample export', () => {
        const content = fs.readFileSync(fridgeTagSample, 'utf8')
        expect(detectImportFileType('fridge-tag.json', content)).toBe('fridgeTag')
        expect(isFridgeTagJson(JSON.parse(content))).toBe(true)
    })

    it('parses EMS sample with logger serial and records', () => {
        const content = fs.readFileSync(emsSample, 'utf8')
        const parsed = parseImportFileContent(content, 'device.json')

        expect(parsed.deviceType).toBe('ems')
        expect(parsed.config.serial).toBe('0D3B7F96E129CE7D')
        expect(parsed.records.length).toBeGreaterThan(0)
        expect(parsed.records[0].TVC).toBeDefined()
    })

    it('parses Fridge-tag JSON sample with daily history records', () => {
        const content = fs.readFileSync(fridgeTagSample, 'utf8')
        const parsed = parseImportFileContent(content, 'fridge-tag.json')

        expect(parsed.deviceType).toBe('fridgeTag')
        expect(parsed.config.serial).toBe('160400343951')
        expect(parsed.history.records.length).toBeGreaterThan(0)
        expect(parsed.history.records[0].temperature.avg).toBeDefined()
    })
})
