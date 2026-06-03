// DHIS2 configuration helper
// Reads required env vars and surfaces clear validation errors.

/** Program and stage are selected in Settings; org unit / TE type remain optional env vars. */
const APP_CONFIG_VARS = {}

/** Credentials for standalone scripts only; not used when the app runs inside DHIS2. */
const DEV_CREDENTIAL_VARS = {
    baseUrl: 'REACT_APP_DHIS2_BASE_URL',
    username: 'REACT_APP_DHIS2_USERNAME',
    password: 'REACT_APP_DHIS2_PASSWORD',
}

export function getDhis2Config() {
    const config = {
        baseUrl: process.env.REACT_APP_DHIS2_BASE_URL || '',
        username: process.env.REACT_APP_DHIS2_USERNAME || '',
        password: process.env.REACT_APP_DHIS2_PASSWORD || '',
        programId: process.env.REACT_APP_DHIS2_PROGRAM_ID || '',
        programStageId: process.env.REACT_APP_DHIS2_PROGRAM_STAGE_ID || '',
        orgUnitId: process.env.REACT_APP_DHIS2_ORG_UNIT_ID || '',
        teTypeId: process.env.REACT_APP_DHIS2_TE_TYPE_ID || '',
    }

    if (process.env.NODE_ENV === 'development') {
        // Helpful for debugging env wiring in the browser bundle
        // (values are either the injected string or empty).
        // eslint-disable-next-line no-console
        console.log('DHIS2 env in browser:', {
            REACT_APP_DHIS2_BASE_URL: process.env.REACT_APP_DHIS2_BASE_URL,
            REACT_APP_DHIS2_PROGRAM_ID: process.env.REACT_APP_DHIS2_PROGRAM_ID,
            REACT_APP_DHIS2_PROGRAM_STAGE_ID: process.env.REACT_APP_DHIS2_PROGRAM_STAGE_ID,
            REACT_APP_DHIS2_ORG_UNIT_ID: process.env.REACT_APP_DHIS2_ORG_UNIT_ID,
            REACT_APP_DHIS2_TE_TYPE_ID: process.env.REACT_APP_DHIS2_TE_TYPE_ID,
            REACT_APP_DHIS2_USERNAME_PRESENT: !!process.env.REACT_APP_DHIS2_USERNAME,
            REACT_APP_DHIS2_PASSWORD_PRESENT: !!process.env.REACT_APP_DHIS2_PASSWORD,
        })
    }

    const missingAppConfig = Object.entries(APP_CONFIG_VARS)
        .filter(([, envName]) => !process.env[envName])
        .map(([key, envName]) => `${envName} (${key})`)

    const missingDevCredentials = Object.entries(DEV_CREDENTIAL_VARS)
        .filter(([, envName]) => !process.env[envName])
        .map(([key, envName]) => `${envName} (${key})`)

    return {
        config,
        missing: missingAppConfig,
        missingDevCredentials,
        isValid: missingAppConfig.length === 0,
    }
}

export function assertDhis2Config() {
    const { missing, missingDevCredentials, config } = getDhis2Config()
    const allMissing = [...missing, ...missingDevCredentials]
    if (allMissing.length > 0) {
        throw new Error(`Missing DHIS2 env vars: ${allMissing.join(', ')}`)
    }
    return config
}

