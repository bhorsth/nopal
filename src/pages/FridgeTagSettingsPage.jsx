import i18n from '@dhis2/d2-i18n'
import React from 'react'
import DeviceImportSettingsForm from '../components/settings/DeviceImportSettingsForm'
import { FIELD_MAPPING_FIELDS } from '../config/fieldMappingDefinitions'
import { DEVICE_DATA_STORE_KEYS } from '../config/importSettingsDataStore'
import { useFridgeTagImportConfig } from '../context/ImportConfigContext'

const FridgeTagSettingsPage = () => {
    const config = useFridgeTagImportConfig()

    return (
        <DeviceImportSettingsForm
            title={i18n.t('Fridge-tag')}
            description={i18n.t('Import metadata for Berlinger Fridge-tag devices.')}
            dataStoreKey={DEVICE_DATA_STORE_KEYS.fridgeTag}
            config={config}
            fieldMappingFields={FIELD_MAPPING_FIELDS}
            incompleteSettingsMessage={i18n.t(
                'Select a program, program stage, and map all fields below to enable tracker imports.'
            )}
        />
    )
}

export default FridgeTagSettingsPage
