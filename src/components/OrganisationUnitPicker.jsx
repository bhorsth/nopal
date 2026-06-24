import i18n from '@dhis2/d2-i18n'
import React from 'react'
import { CircularLoader, NoticeBox, SingleSelectField, SingleSelectOption } from '@dhis2/ui'
import { useOrganisationUnits } from '../hooks/useOrganisationUnits'

const OrganisationUnitPicker = ({ selectedOrgUnitId, onChange, disabled = false }) => {
    const { orgUnits, loading, error, facilityLevel } = useOrganisationUnits()

    if (error) {
        return (
            <NoticeBox error title={i18n.t('Could not load organisation units')}>
                {error.message}
            </NoticeBox>
        )
    }

    const helpText = facilityLevel
        ? i18n.t('Select a facility (level {{level}}) from your accessible organisation units.', {
              level: facilityLevel,
              nsSeparator: false,
          })
        : i18n.t('Select an organisation unit from your accessible hierarchy.')

    return (
        <SingleSelectField
            label={i18n.t('Organisation unit')}
            helpText={helpText}
            selected={selectedOrgUnitId}
            onChange={({ selected }) => onChange(selected)}
            placeholder={loading ? i18n.t('Loading organisation units…') : i18n.t('Select organisation unit')}
            filterable
            filterPlaceholder={i18n.t('Filter organisation units')}
            noMatchText={i18n.t('No organisation units found')}
            loading={loading}
            disabled={disabled || loading || orgUnits.length === 0}
        >
            {orgUnits.map((ou) => (
                <SingleSelectOption key={ou.id} value={ou.id} label={ou.displayName} />
            ))}
        </SingleSelectField>
    )
}

export default OrganisationUnitPicker
