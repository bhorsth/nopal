/**
 * Berlinger Fridge-tag Parser - Browser Implementation
 * 
 * Simplified parser for Fridge-tag text files
 * Converts raw text to clean JSON structure
 */

import { Key } from './keys.js'
import { isParserDebugEnabled } from './parserDebug.js'
import { parseHmToMinutes } from './timeFormat.js'
import { enrichAlarmsWithStatus } from './fridgeTagAlarmStatus.js'

const logDebug = (...args) => {
  if (isParserDebugEnabled()) {
    // eslint-disable-next-line no-console
    console.debug('[FridgeTagParser]', ...args)
  }
}

/**
 * Helper to clean numeric values
 */
function cleanNumber(value) {
  if (value === null || value === undefined || value === '---') {
    return null
  }
  if (typeof value === 'number') {
    return value
  }
  if (typeof value === 'string') {
    const numPart = value.split(',')[0].trim()
    try {
      if (numPart.includes('.') || numPart.toLowerCase().includes('e')) {
        return parseFloat(numPart)
      }
      return parseInt(numPart, 10)
    } catch (e) {
      return value
    }
  }
  return value
}

/**
 * Create empty data structure for parsed fridge tag
 */
function createFridgeTagData() {
  return {
    device: null,
    version: null,
    fwVersion: null,
    sensor: null,
    config: {
      serial: null,
      pcb: null,
      cid: null,
      lot: null,
      zone: null,
      alarmThresholds: [],
    },
    history: {
      activationTimestamp: null,
      reportCreationTimestamp: null,
      records: [],
    },
    certificate: {
      version: null,
      lot: null,
      issuer: null,
      validFrom: null,
      owner: null,
      publicKey: null,
    },
    signatureCert: null,
    signature: null,
  }
}

/**
 * Create alarm threshold
 */
function createAlarmThreshold(level) {
  return {
    level,
    tempLimit: null,
    timeLimitMinutes: null,
  }
}

/**
 * Create history record
 */
function createHistoryRecord(dayIndex) {
  return {
    dayIndex,
    date: null,
    minTemp: null,
    minTempTime: null,
    maxTemp: null,
    maxTempTime: null,
    avgTemp: null,
    sensorTimeoutMinutes: null,
    events: null,
    alarms: [],
    checked: null,
  }
}

/**
 * Create alarm record
 */
function createAlarmRecord(level) {
  return {
    level,
    accumulatedMinutes: null,
    timestamp: null,
    count: null,
  }
}

/**
 * Create checked timestamps
 */
function createCheckedTimestamps() {
  return {
    am: null,
    pm: null,
  }
}

/**
 * Parse a single line using simple regex pattern matching
 */
function parseLine(line) {
  const stripped = line.trim()
  if (!stripped || !stripped.includes(':')) return []

  const entries = []
  const colonIdx = stripped.indexOf(':')
  
  // Extract key and value part
  const keyPart = stripped.substring(0, colonIdx).trim()
  const valuePart = stripped.substring(colonIdx + 1).trim()

  // Parse key
  let key = keyPart
  let isIndex = false
  if (/^\d+$/.test(keyPart)) {
    key = parseInt(keyPart, 10)
    isIndex = true
  }

  // Determine if it's a section (no value after colon)
  const isSection = !valuePart

  let value = null
  if (!isSection && valuePart) {
    // Parse value - could be comma-separated
    const parts = valuePart.split(',').map(p => p.trim())
    value = parts[0]
    
    // Additional comma-separated values become sibling entries
    for (let i = 1; i < parts.length; i++) {
      const part = parts[i]
      if (part.includes(':')) {
        const [subKey, subVal] = part.split(':').map(p => p.trim())
        entries.push({ key: subKey, value: subVal, isSection: false, isIndex: false })
      }
    }
  }

  entries.unshift({ key, value, isSection, isIndex })
  return entries
}

/**
 * Get indentation level of a line
 */
function getIndent(line) {
  return line.length - line.trimStart().length
}

/**
 * Main parser class
 */
export class FridgeTagParser {
  constructor() {
    this.data = null
    this.contextStack = []
  }

  parseText(text) {
    logDebug('FridgeTagParser.parseText: starting parse')
    const lines = text.split(/\r?\n/)
    return this.parseLines(lines)
  }

  parseLines(lines) {
    this.data = createFridgeTagData()
    this.contextStack = [{ indent: -1, section: 'root', obj: this.data }]

    let currentHistRecord = null
    let currentAlarmSection = null

    for (const line of lines) {
      const indent = getIndent(line)
      const entries = parseLine(line)

      if (entries.length === 0) continue
      logDebug('Parsing line', { line, indent, entries, currentHistRecord })

      // Pop stack to find parent at correct indent level
      while (
        this.contextStack.length > 0 &&
        this.contextStack[this.contextStack.length - 1].indent >= indent
      ) {
        this.contextStack.pop()
      }

      const parent = this.contextStack[this.contextStack.length - 1]
      const parentSection = parent.section

      for (const entry of entries) {
        const { key, value, isSection, isIndex } = entry

        if (isSection) {
          if (key === Key.CONFIG) {
            this.contextStack.push({ indent, section: Key.CONFIG, obj: this.data.config })
          } else if (key === Key.HISTORY) {
            this.contextStack.push({ indent, section: Key.HISTORY, obj: this.data.history })
          } else if (key === Key.CERTIFICATE) {
            this.contextStack.push({ indent, section: Key.CERTIFICATE, obj: this.data.certificate })
          } else if (key === Key.ALARM) {
            currentAlarmSection = parentSection === Key.CONFIG ? 'config' : 'history'
            this.contextStack.push({ indent, section: Key.ALARM, obj: null })
          } else if (key === Key.CHECKED) {
            if (currentHistRecord) {
              currentHistRecord.checked = createCheckedTimestamps()
            }
            this.contextStack.push({ indent, section: Key.CHECKED, obj: null })
          } else if (isIndex) {
            const idx = key
            if (parentSection === Key.HISTORY) {
              currentHistRecord = createHistoryRecord(idx)
              this.data.history.records.push(currentHistRecord)
              this.contextStack.push({ indent, section: `Day${idx}`, obj: currentHistRecord })
            } else if (parentSection === Key.ALARM) {
              this.contextStack.push({ indent, section: `AlarmLevel${idx}`, obj: idx })
            }
          }
        } else {
          this._setValue(parentSection, key, value, currentHistRecord, currentAlarmSection)
        }
      }
    }

    return this.data
  }

  _setValue(section, key, value, histRecord, alarmSection) {
    const durationKeys = [Key.ACCUMULATED_TIME, Key.ACCUMULATED_SENSOR_TIMEOUT, Key.SENSOR_TIMEOUT]
    const isDurationKey = durationKeys.includes(key)

    // Don't apply cleanNumber to date/timestamp fields
    if (
      !isDurationKey &&
      ![
        Key.DATE,
        Key.MIN_TEMP_TIMESTAMP,
        Key.MAX_TEMP_TIMESTAMP,
        Key.ACTIVATION_TIMESTAMP,
        Key.REPORT_CREATION_TIMESTAMP,
        Key.ALARM_TIMESTAMP,
        Key.AM_TIMESTAMP,
        Key.PM_TIMESTAMP,
        Key.TEST_TIMESTAMP,
        Key.VALID_FROM,
      ].includes(key)
    ) {
      value = cleanNumber(value)
    } else if (isDurationKey) {
      value = parseHmToMinutes(value)
    }

    if (section === 'root') {
      if (key === Key.DEVICE) this.data.device = value
      else if (key === Key.VERSION) this.data.version = String(value)
      else if (key === Key.FW_VERSION) this.data.fwVersion = value
      else if (key === Key.SENSOR_COUNT) this.data.sensor = value
      else if (key === Key.SIGNATURE_CERT) this.data.signatureCert = value
      else if (key === Key.SIGNATURE) this.data.signature = value
    } else if (section === Key.CONFIG) {
      if (key === Key.SERIAL) this.data.config.serial = value
      else if (key === Key.PCB) this.data.config.pcb = value
      else if (key === Key.CID) this.data.config.cid = value
      else if (key === Key.LOT) this.data.config.lot = value
      else if (key === Key.ZONE) this.data.config.zone = value
    } else if (section.startsWith('AlarmLevel') && alarmSection === 'config') {
      const level = parseInt(section.replace('AlarmLevel', ''), 10)
      let threshold = this.data.config.alarmThresholds.find((t) => t.level === level)
      if (!threshold) {
        threshold = createAlarmThreshold(level)
        this.data.config.alarmThresholds.push(threshold)
      }
      if (key === Key.TEMP_THRESHOLD) threshold.tempLimit = value
      else if (key === Key.DURATION_THRESHOLD) threshold.timeLimitMinutes = value
    } else if (section === Key.HISTORY) {
      if (key === Key.ACTIVATION_TIMESTAMP) this.data.history.activationTimestamp = value
      else if (key === Key.REPORT_CREATION_TIMESTAMP) this.data.history.reportCreationTimestamp = value
    } else if (section.startsWith('Day') && histRecord) {
      if (key === Key.DATE) histRecord.date = value
      else if (key === Key.MIN_TEMP) histRecord.minTemp = value
      else if (key === Key.MIN_TEMP_TIMESTAMP) histRecord.minTempTime = value
      else if (key === Key.MAX_TEMP) histRecord.maxTemp = value
      else if (key === Key.MAX_TEMP_TIMESTAMP) histRecord.maxTempTime = value
      else if (key === Key.AVG_TEMP) histRecord.avgTemp = value
      else if (key === Key.EVENTS) histRecord.events = value
      else if (key === Key.SENSOR_TIMEOUT || key === Key.ACCUMULATED_SENSOR_TIMEOUT) {
        histRecord.sensorTimeoutMinutes = value
      }
    } else if (section.startsWith('AlarmLevel') && alarmSection === 'history' && histRecord) {
      const level = parseInt(section.replace('AlarmLevel', ''), 10)
      let alarm = histRecord.alarms.find((a) => a.level === level)
      if (!alarm) {
        alarm = createAlarmRecord(level)
        histRecord.alarms.push(alarm)
      }
      if (key === Key.ACCUMULATED_TIME) alarm.accumulatedMinutes = value
      else if (key === Key.ALARM_TIMESTAMP) alarm.timestamp = value
      else if (key === Key.ALARM_COUNT) alarm.count = value
    } else if (section === Key.CHECKED && histRecord) {
      if (key === Key.AM_TIMESTAMP) histRecord.checked.am = value
      else if (key === Key.PM_TIMESTAMP) histRecord.checked.pm = value
    } else if (section === Key.CERTIFICATE) {
      if (key === Key.VERSION) this.data.certificate.version = String(value)
      else if (key === Key.LOT) this.data.certificate.lot = value
      else if (key === Key.ISSUER) this.data.certificate.issuer = value
      else if (key === Key.VALID_FROM) this.data.certificate.validFrom = value
      else if (key === Key.OWNER) this.data.certificate.owner = value
      else if (key === Key.PUBLIC_KEY) this.data.certificate.publicKey = value
    }
  }
}

/**
 * Convert parsed data to clean JSON structure (similar to fridgetag_json.js output)
 */
export function toJson(data) {
  logDebug('fridgeTagParser.toJson: transforming parsed data')
  const alarmThresholds = data.config.alarmThresholds
    .sort((a, b) => a.level - b.level)
    .map((t) => ({
      level: t.level,
      type: t.level === 0 ? 'cold' : 'hot',
      temperatureLimit: t.tempLimit,
      durationMinutes: t.timeLimitMinutes,
    }))

  return {
    device: {
      name: data.device,
      version: data.version,
      firmwareVersion: data.fwVersion,
      sensorCount: data.sensor,
    },
    config: {
      serial: data.config.serial,
      pcb: data.config.pcb,
      cid: data.config.cid,
      lot: data.config.lot,
      zone: data.config.zone,
      alarmThresholds,
    },
    history: {
      activationTimestamp: data.history.activationTimestamp,
      reportCreationTimestamp: data.history.reportCreationTimestamp,
      recordCount: data.history.records.length,
      records: data.history.records.map((r) => ({
        day: r.dayIndex,
        date: r.date,
        temperature: {
          min: r.minTemp,
          minTime: r.minTempTime,
          max: r.maxTemp,
          maxTime: r.maxTempTime,
          avg: r.avgTemp,
        },
        alarms: enrichAlarmsWithStatus(
          r.alarms
            .sort((a, b) => a.level - b.level)
            .map((a) => ({
              level: a.level,
              type: a.level === 0 ? 'cold' : 'hot',
              accumulatedMinutes: a.accumulatedMinutes,
              triggerTime: a.timestamp !== '00:00' ? a.timestamp : null,
              eventCount: a.count,
            })),
          alarmThresholds
        ),
        sensorTimeoutMinutes: r.sensorTimeoutMinutes,
        events: r.events,
        verified: r.checked
          ? {
              am: r.checked.am,
              pm: r.checked.pm,
            }
          : null,
      })),
    },
    certificate: data.certificate.issuer
      ? {
          version: data.certificate.version,
          lot: data.certificate.lot,
          issuer: data.certificate.issuer,
          validFrom: data.certificate.validFrom,
          owner: data.certificate.owner,
          publicKey: data.certificate.publicKey && typeof data.certificate.publicKey === 'string' ? data.certificate.publicKey.slice(0, 32) + '...' : null,
        }
      : null,
    signatures:
      data.signatureCert || data.signature
        ? {
            certificate: data.signatureCert && typeof data.signatureCert === 'string' ? data.signatureCert.slice(0, 32) + '...' : null,
            data: data.signature && typeof data.signature === 'string' ? data.signature.slice(0, 32) + '...' : null,
          }
        : null,
  }
}

export { Key }
