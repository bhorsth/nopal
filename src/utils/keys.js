/**
 * Berlinger FridgeTag Key Constants.
 *
 * Grammar token names mapped to file format strings.
 */

export const Key = {
  // Header - Top-level device identification
  DEVICE: "Device",
  VERSION: "Vers",
  FW_VERSION: "Fw Vers",
  SENSOR_COUNT: "Sensor",

  // Sections - Major data sections in the file
  CONFIG: "Conf",
  HISTORY: "Hist",
  CERTIFICATE: "Cert",
  ERRORS: "Errors",

  // Config - Device identification and settings
  SERIAL: "Serial",
  PCB: "PCB",
  CID: "CID",
  LOT: "Lot",
  ZONE: "Zone",
  MEASUREMENT_DELAY: "Measurement delay",
  MOVING_AVERAGE: "Moving Avrg",
  USER_ALARM_CONFIG: "User Alarm Config",
  USER_CLOCK_CONFIG: "User Clock Config",
  ALARM_INDICATION: "Alarm Indication",
  TEMP_UNIT: "Temp unit",
  ALARM: "Alarm",
  INTERNAL_SENSOR: "Int Sensor",
  TIMEOUT: "Timeout",
  OFFSET: "Offset",
  REPORT_HISTORY_LENGTH: "Report history length",
  DETAILED_REPORT: "Det Report",
  USE_EXTERNAL_DEVICES: "Use ext devices",
  TEST_RESULT: "Test Res",
  TEST_TIMESTAMP: "Test TS",

  // History - Session timestamps
  ACTIVATION_TIMESTAMP: "TS Actv",
  REPORT_CREATION_TIMESTAMP: "TS Report Creation",

  // History - Daily temperature records
  DATE: "Date",
  MIN_TEMP: "Min T",
  MAX_TEMP: "Max T",
  AVG_TEMP: "Avrg T",
  MIN_TEMP_TIMESTAMP: "TS Min T",
  MAX_TEMP_TIMESTAMP: "TS Max T",
  SENSOR_TIMEOUT: "Int Sensor timeout",
  EVENTS: "Events",
  CHECKED: "Checked",
  AM_TIMESTAMP: "TS AM",
  PM_TIMESTAMP: "TS PM",

  // Breach/Alarm Configuration
  TEMP_THRESHOLD: "T AL",
  DURATION_THRESHOLD: "t AL",

  // Breach/Alarm Accumulators
  ACCUMULATED_TIME: "t Acc",
  ALARM_TIMESTAMP: "TS A",
  ALARM_COUNT: "C A",
  ACCUMULATED_SENSOR_TIMEOUT: "t AccST",

  // Errors
  ERROR_COUNT: "Err Count",
  ERROR_TIMESTAMP: "Err TS",

  // Certificate
  ISSUER: "Issuer",
  VALID_FROM: "Valid from",
  OWNER: "Owner",
  PUBLIC_KEY: "Public Key",
  SIGNATURE_CERT: "Sig Cert",
  SIGNATURE: "Sig",
}
