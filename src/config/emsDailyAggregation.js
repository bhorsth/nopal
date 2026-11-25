/**
 * Daily EMS aggregation outputs posted as tracker data elements.
 * Source object IDs (TVC, ACSV, …) map to one or more output keys (TVC_MIN, …).
 * Hours conversions (EMS_*_HRS*) and RELT/RTCW/ABST are intentionally omitted.
 */

const EMS_STAGE = 'Equipment Monitoring System (EMS) data'

/**
 * @typedef {'avg' | 'min' | 'max' | 'sum' | 'mswOnHours' | 'concat' | 'alarmCount' | 'tvcRangeHours' | 'first'} EmsDailyAggregationOp
 * @typedef {{
 *   op: EmsDailyAggregationOp,
 *   outputKey: string,
 *   dhis2Code: string,
 *   dhis2Name: string,
 *   label: string,
 *   category: string,
 *   stageOrAttribute?: string,
 *   required?: boolean,
 *   token?: string,
 *   range?: 'frz' | 'low' | 'nrm' | 'hig',
 * }} EmsDailyAggregationOutput
 */

/**
 * @param {string} sourceKey
 * @param {string} baseName
 * @param {string} category
 * @param {{ requiredAvg?: boolean }} [options]
 * @returns {EmsDailyAggregationOutput[]}
 */
const minAvgMax = (sourceKey, baseName, category, options = {}) => [
    {
        op: 'min',
        outputKey: `${sourceKey}_MIN`,
        dhis2Code: `EMS_${sourceKey}_MIN`,
        dhis2Name: `${baseName} - MIN`,
        label: `${baseName} (MIN)`,
        category,
        required: false,
    },
    {
        op: 'avg',
        outputKey: `${sourceKey}_AVG`,
        dhis2Code: `EMS_${sourceKey}_AVG`,
        dhis2Name: `${baseName} - AVG`,
        label: `${baseName} (AVG)`,
        category,
        required: Boolean(options.requiredAvg),
    },
    {
        op: 'max',
        outputKey: `${sourceKey}_MAX`,
        dhis2Code: `EMS_${sourceKey}_MAX`,
        dhis2Name: `${baseName} - MAX`,
        label: `${baseName} (MAX)`,
        category,
        required: false,
    },
]

/**
 * Source object ID → daily aggregation outputs.
 * @type {Record<string, EmsDailyAggregationOutput[]>}
 */
export const EMS_DAILY_AGGREGATION_BY_SOURCE = {
    ACSV: minAvgMax('ACSV', 'AC supply voltage to the appliance (V)', 'Environmental'),
    DCSV: minAvgMax('DCSV', 'DC supply voltage to the appliance (V)', 'Environmental'),
    ACCD: minAvgMax('ACCD', 'AC current drawn by the appliance (A)', 'Performance'),
    DCCD: minAvgMax('DCCD', 'DC current drawn by the appliance (A)', 'Performance'),
    HAMB: minAvgMax('HAMB', 'Ambient relative humidity (%)', 'Environmental'),
    TAMB: minAvgMax('TAMB', 'Ambient temperature (°C)', 'Environmental', { requiredAvg: true }),
    HCOM: minAvgMax('HCOM', 'Compartment relative humidity (%)', 'Performance'),
    TVC: [
        ...minAvgMax('TVC', 'Vaccine Compartment Temperature (°C)', 'Performance', {
            requiredAvg: true,
        }),
        {
            op: 'tvcRangeHours',
            range: 'frz',
            outputKey: 'TVC_FRZ_SUM',
            dhis2Code: 'EMS_TVC_FRZ_SUM',
            dhis2Name: 'Vaccine Compartment Temperature below 0°C (hrs)',
            label: 'Vaccine compartment time below 0°C (hrs)',
            category: 'Performance',
        },
        {
            op: 'tvcRangeHours',
            range: 'low',
            outputKey: 'TVC_LOW_SUM',
            dhis2Code: 'EMS_TVC_LOW_SUM',
            dhis2Name: 'Vaccine Compartment Temperature 0 to 2°C (hrs)',
            label: 'Vaccine compartment time 0–2°C (hrs)',
            category: 'Performance',
        },
        {
            op: 'tvcRangeHours',
            range: 'nrm',
            outputKey: 'TVC_NRM_SUM',
            dhis2Code: 'EMS_TVC_NRM_SUM',
            dhis2Name: 'Vaccine Compartment Temperature 2 to 8°C (hrs)',
            label: 'Vaccine compartment time 2–8°C (hrs)',
            category: 'Performance',
        },
        {
            op: 'tvcRangeHours',
            range: 'hig',
            outputKey: 'TVC_HIG_SUM',
            dhis2Code: 'EMS_TVC_HIG_SUM',
            dhis2Name: 'Vaccine Compartment Temperature above 8°C (hrs)',
            label: 'Vaccine compartment time above 8°C (hrs)',
            category: 'Performance',
        },
    ],
    TFRZ: minAvgMax('TFRZ', 'Freezer Compartment Temperature (°C)', 'Performance'),
    TCON: minAvgMax('TCON', 'Condenser temperature (°C)', 'Performance'),
    TCON2: minAvgMax('TCON2', 'Secondary Condenser temperature (°C)', 'Performance'),
    CMPS: minAvgMax('CMPS', 'Compressor speed (rpm)', 'Performance'),
    CMPS2: minAvgMax('CMPS2', 'Secondary Compressor speed (rpm)', 'Performance'),
    TPCB: minAvgMax('TPCB', 'Compressor Electronic Unit temperature (°C)', 'Performance'),
    TPCB2: minAvgMax(
        'TPCB2',
        'Secondary Compressor Electronic Unit temperature (°C)',
        'Performance'
    ),
    FANS: minAvgMax('FANS', 'Fan speed (%)', 'Performance'),
    BLOG: [
        {
            op: 'avg',
            outputKey: 'BLOG_AVG',
            dhis2Code: 'EMS_BLOG_AVG',
            dhis2Name: 'Logger battery remaining (d) - AVG',
            label: 'Logger battery remaining (AVG)',
            category: 'Performance',
            required: true,
        },
    ],
    BEMD: [
        {
            op: 'avg',
            outputKey: 'BEMD_AVG',
            dhis2Code: 'EMS_BEMD_AVG',
            dhis2Name: 'EMD battery remaining (d) - AVG',
            label: 'EMD battery remaining (AVG)',
            category: 'Performance',
        },
    ],
    HOLD: [
        {
            op: 'avg',
            outputKey: 'HOLD_AVG',
            dhis2Code: 'EMS_HOLD_AVG',
            dhis2Name: 'Holdover, autonomy, or independence time (d) - AVG',
            label: 'Holdover, autonomy, or independence time (AVG)',
            category: 'Performance',
        },
    ],
    LACC: [
        {
            op: 'avg',
            outputKey: 'LACC',
            dhis2Code: 'EMS_LACC',
            dhis2Name: 'Location accuracy',
            label: 'Location accuracy',
            category: 'Administrative',
        },
    ],
    SVA: [
        {
            op: 'sum',
            outputKey: 'SVA_SEC_SUM',
            dhis2Code: 'EMS_SVA_SEC_SUM',
            dhis2Name: 'AC supply voltage availability (s) - SUM',
            label: 'AC supply voltage availability (s)',
            category: 'Environmental',
        },
    ],
    CMPR: [
        {
            op: 'sum',
            outputKey: 'CMPR_SEC_SUM',
            dhis2Code: 'EMS_CMPR_SEC_SUM',
            dhis2Name: 'Compressor runtime (s) - SUM',
            label: 'Compressor runtime (s)',
            category: 'Performance',
        },
    ],
    CMPR2: [
        {
            op: 'sum',
            outputKey: 'CMPR2_SEC_SUM',
            dhis2Code: 'EMS_CMPR2_SEC_SUM',
            dhis2Name: 'Secondary Compressor runtime (s) - SUM',
            label: 'Secondary compressor runtime (s)',
            category: 'Performance',
        },
    ],
    DORV: [
        {
            op: 'sum',
            outputKey: 'DORV_SEC',
            dhis2Code: 'EMS_DORV_SEC',
            dhis2Name: 'Door/lid opening (vaccine compartment) (s)',
            label: 'Door/lid opening (vaccine compartment) (s)',
            category: 'Use',
            required: true,
        },
    ],
    IDRV: [
        {
            op: 'sum',
            outputKey: 'IDRV_SEC',
            dhis2Code: 'EMS_IDRV_SEC',
            dhis2Name: 'Instantaneous door/lid opening (vaccine compartment) (s)',
            label: 'Instantaneous door/lid opening (vaccine compartment) (s)',
            category: 'Use',
        },
    ],
    DORF: [
        {
            op: 'sum',
            outputKey: 'DORF_SEC',
            dhis2Code: 'EMS_DORF_SEC',
            dhis2Name: 'Door/lid opening (freezer/other compartment) (s)',
            label: 'Door/lid opening (freezer/other compartment) (s)',
            category: 'Use',
        },
    ],
    IDRF: [
        {
            op: 'sum',
            outputKey: 'IDRF_SEC',
            dhis2Code: 'EMS_IDRF_SEC',
            dhis2Name: 'Instantaneous door/lid opening (freezer compartment) (s)',
            label: 'Instantaneous door/lid opening (freezer compartment) (s)',
            category: 'Use',
        },
    ],
    DRCV: [
        {
            op: 'sum',
            outputKey: 'DRCV_CNT',
            dhis2Code: 'EMS_DRCV_CNT',
            dhis2Name: 'Number of door/lid openings (vaccine compartment)',
            label: 'Number of door/lid openings (vaccine compartment)',
            category: 'Use',
        },
    ],
    DRCF: [
        {
            op: 'sum',
            outputKey: 'DRCF_CNT',
            dhis2Code: 'EMS_DRCF_CNT',
            dhis2Name: 'Number of door/lid openings (freezer/other compartment)',
            label: 'Number of door/lid openings (freezer/other compartment)',
            category: 'Use',
        },
    ],
    MSW: [
        {
            op: 'mswOnHours',
            outputKey: 'MSW_ON',
            dhis2Code: 'EMS_MSW_ON',
            dhis2Name: 'Main ON/OFF switch (hrs) - ON',
            label: 'Main ON/OFF switch (ON hours)',
            category: 'Use',
        },
    ],
    ALRM: [
        {
            op: 'concat',
            outputKey: 'ALRM_DLY',
            dhis2Code: 'EMS_ALRM_DLY',
            dhis2Name: 'Alarm condition',
            label: 'Alarm condition (daily)',
            category: 'Alarms',
        },
        {
            op: 'alarmCount',
            token: 'HEAT',
            outputKey: 'ALRM_HEAT_CNT',
            dhis2Code: 'EMS_ALRM_HEAT_CNT',
            dhis2Name: 'Alarm HEAT count',
            label: 'Alarm HEAT count',
            category: 'Alarms',
        },
        {
            op: 'alarmCount',
            token: 'FRZE',
            outputKey: 'ALRM_FRZE_CNT',
            dhis2Code: 'EMS_ALRM_FRZE_CNT',
            dhis2Name: 'Alarm FRZE count',
            label: 'Alarm FRZE count',
            category: 'Alarms',
        },
        {
            op: 'alarmCount',
            token: 'DOOR',
            outputKey: 'ALRM_DOOR_CNT',
            dhis2Code: 'EMS_ALRM_DOOR_CNT',
            dhis2Name: 'Alarm DOOR count',
            label: 'Alarm DOOR count',
            category: 'Alarms',
        },
        {
            op: 'alarmCount',
            token: 'POWR',
            outputKey: 'ALRM_POWR_CNT',
            dhis2Code: 'EMS_ALRM_POWR_CNT',
            dhis2Name: 'Alarm POWR count',
            label: 'Alarm POWR count',
            category: 'Alarms',
        },
        {
            op: 'alarmCount',
            token: 'DCNT',
            outputKey: 'ALRM_DCNT_CNT',
            dhis2Code: 'EMS_ALRM_DCNT_CNT',
            dhis2Name: 'Alarm DCNT count',
            label: 'Alarm DCNT count',
            category: 'Alarms',
        },
    ],
    LERR: [
        {
            op: 'concat',
            outputKey: 'LERR_DLY',
            dhis2Code: 'EMS_LERR_DLY',
            dhis2Name: 'Logger error codes',
            label: 'Logger error codes (daily)',
            category: 'Performance',
            required: true,
        },
    ],
    EERR: [
        {
            op: 'concat',
            outputKey: 'EERR_DLY',
            dhis2Code: 'EMS_EERR_DLY',
            dhis2Name: 'EMD error codes',
            label: 'EMD error codes (daily)',
            category: 'Performance',
        },
    ],
    SIGN: [
        {
            op: 'first',
            outputKey: 'SIGN',
            dhis2Code: 'EMS_SIGN',
            dhis2Name: 'File integrity check',
            label: 'File integrity check',
            category: 'Administrative',
        },
    ],
}

/** @type {EmsDailyAggregationOutput[]} */
export const EMS_DAILY_AGGREGATION_OUTPUTS = Object.entries(
    EMS_DAILY_AGGREGATION_BY_SOURCE
).flatMap(([sourceKey, outputs]) =>
    outputs.map((output) => ({
        ...output,
        sourceKey,
        stageOrAttribute: output.stageOrAttribute || EMS_STAGE,
        required: Boolean(output.required),
    }))
)

export const EMS_DAILY_OUTPUT_KEYS = EMS_DAILY_AGGREGATION_OUTPUTS.map((output) => output.outputKey)

export const EMS_SKIPPED_POSTING_SOURCE_KEYS = ['RELT', 'RTCW', 'ABST']

export const EMS_SKIPPED_HOURS_DHIS2_CODES = [
    'EMS_SVA_HRS_SUM',
    'EMS_CMPR_HRS_SUM',
    'EMS_CMPR2_HRS_SUM',
    'EMS_DORV_HRS',
    'EMS_IDRV_HRS',
    'EMS_DORF_HRS',
    'EMS_IDRF_HRS',
]

export const EMS_INTERVAL_HOURS = 0.25
