import i18n from '@dhis2/d2-i18n'
import React, { useEffect } from 'react'
import { NoticeBox, SingleSelectField, SingleSelectOption } from '@dhis2/ui'
import { FIELD_MAPPING_FIELDS } from '../../config/fieldMappingDefinitions'
import { useImportConfig } from '../../context/ImportConfigContext'
import { useProgramFieldOptions } from '../../hooks/useProgramFieldOptions'
import classes from '../../App.module.css'

const selectValueIfValid = (value, options) =>
    options.some((opt) => opt.id === value) ? value : ''

const withSelectedOption = (options, selectedId) => {
    if (!selectedId || options.some((opt) => opt.id === selectedId)) {
        return options
    }
    return [{ id: selectedId, displayName: selectedId }, ...options]
}

const FieldMappingFields = () => {
    const { programId, programStageId, fieldMappings, setFieldMapping } = useImportConfig()
    const {
        attributes,
        dataElements,
        loading,
        error,
        programMetadataReady,
        stageMetadataReady,
    } = useProgramFieldOptions(programId, programStageId)

    useEffect(() => {
        FIELD_MAPPING_FIELDS.forEach(({ key, kind }) => {
            const metadataReady = kind === 'attribute' ? programMetadataReady : stageMetadataReady
            if (!metadataReady) return

            const options = kind === 'attribute' ? attributes : dataElements
            const current = fieldMappings[key]
            if (current && !options.some((opt) => opt.id === current)) {
                setFieldMapping(key, '')
            }
        })
    }, [
        programMetadataReady,
        stageMetadataReady,
        attributes,
        dataElements,
        fieldMappings,
        setFieldMapping,
    ])

    if (!programId || !programStageId) {
        return (
            <p className={classes.helpText}>
                {i18n.t('Select a program and program stage to map fields to DHIS2 metadata.')}
            </p>
        )
    }

    if (error) {
        return (
            <NoticeBox error title={i18n.t('Could not load field options')}>
                {error.message}
            </NoticeBox>
        )
    }

    return (
        <div className={classes.settingsFields}>
            {FIELD_MAPPING_FIELDS.map(({ key, label, kind }) => {
                const baseOptions = kind === 'attribute' ? attributes : dataElements
                const options =
                    kind === 'attribute'
                        ? withSelectedOption(baseOptions, fieldMappings[key])
                        : baseOptions
                const metadataReady = kind === 'attribute' ? programMetadataReady : stageMetadataReady
                const selected = fieldMappings[key]
                const selectValue = selectValueIfValid(selected, options)
                const fieldLoading = kind === 'attribute' ? loading && !programMetadataReady : loading

                return (
                    <SingleSelectField
                        key={key}
                        label={label()}
                        selected={selectValue}
                        onChange={({ selected: value }) => setFieldMapping(key, value)}
                        placeholder={i18n.t('Select mapping')}
                        filterable
                        filterPlaceholder={i18n.t('Filter')}
                        noMatchText={i18n.t('No matches found')}
                        loading={fieldLoading}
                        disabled={fieldLoading || !metadataReady || options.length === 0}
                        helpText={
                            kind === 'attribute'
                                ? i18n.t('Tracked entity attribute')
                                : i18n.t('Program stage data element')
                        }
                    >
                        {options.map((opt) => (
                            <SingleSelectOption
                                key={opt.id}
                                label={opt.displayName}
                                value={opt.id}
                            />
                        ))}
                    </SingleSelectField>
                )
            })}
        </div>
    )
}

export default FieldMappingFields
