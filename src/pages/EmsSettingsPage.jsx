import i18n from '@dhis2/d2-i18n'
import React from 'react'
import DeviceImportSettingsForm from '../components/settings/DeviceImportSettingsForm'
import { EMS_FIELD_MAPPING_FIELDS } from '../config/emsFieldMappingDefinitions'
import { DEVICE_DATA_STORE_KEYS } from '../config/importSettingsDataStore'
import { useEmsImportConfig } from '../context/ImportConfigContext'

const EmsSettingsPage = () => {
    const config = useEmsImportConfig()

    return (
        <DeviceImportSettingsForm
            title={i18n.t('EMS')}
            description={i18n.t(
                'Import metadata and field mappings for EMS devices (multiple suppliers).'
            )}
            dataStoreKey={DEVICE_DATA_STORE_KEYS.ems}
            config={config}
            fieldMappingFields={EMS_FIELD_MAPPING_FIELDS}
            groupFieldMappingsByCategory
            incompleteSettingsMessage={i18n.t(
                'Select a program, program stage, and map all required EMS fields below to enable tracker imports.'
            )}
        />
    )
}

export default EmsSettingsPage
