import { getDhis2Config } from '../src/config/dhis2.js'
import 'dotenv/config'


const { config, missing, isValid } = getDhis2Config()

if (isValid) {
  console.log('DHIS2 config: OK')
  console.log({
    baseUrl: config.baseUrl,
    programId: config.programId,
    programStageId: config.programStageId,
    orgUnitId: config.orgUnitId,
    teTypeId: config.teTypeId,
    usernamePresent: !!config.username,
    passwordPresent: !!config.password,
  })
  process.exit(0)
} else {
  console.error('DHIS2 config: missing variables')
  console.error(missing)
  process.exit(1)
}

