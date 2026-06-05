import i18n from '@dhis2/d2-i18n'
import React, { useEffect, useMemo } from 'react'
import { NoticeBox, SingleSelectField, SingleSelectOption } from '@dhis2/ui'
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

const FieldMappingSelect = ({
    fieldKey,
    label,
    kind,
    helpText,
    programId,
    programStageId,
    fieldMappings,
    setFieldMapping,
    attributes,
    dataElements,
    loading,
    programMetadataReady,
    stageMetadataReady,
}) => {
    const baseOptions = kind === 'attribute' ? attributes : dataElements
    const options =
        kind === 'attribute'
            ? withSelectedOption(baseOptions, fieldMappings[fieldKey])
            : baseOptions
    const metadataReady = kind === 'attribute' ? programMetadataReady : stageMetadataReady
    const selected = fieldMappings[fieldKey]
    const selectValue = selectValueIfValid(selected, options)
    const fieldLoading = kind === 'attribute' ? loading && !programMetadataReady : loading

    return (
        <SingleSelectField
            key={fieldKey}
            label={label}
            selected={selectValue}
            onChange={({ selected: value }) => setFieldMapping(fieldKey, value)}
            placeholder={i18n.t('Select mapping')}
            filterable
            filterPlaceholder={i18n.t('Filter')}
            noMatchText={i18n.t('No matches found')}
            loading={fieldLoading}
            disabled={fieldLoading || !metadataReady || options.length === 0}
            helpText={
                helpText ||
                (kind === 'attribute'
                    ? i18n.t('Tracked entity attribute')
                    : i18n.t('Program stage data element'))
            }
        >
            {options.map((opt) => (
                <SingleSelectOption key={opt.id} label={opt.displayName} value={opt.id} />
            ))}
        </SingleSelectField>
    )
}

const FieldMappingFields = ({
    fieldMappingFields,
    programId,
    programStageId,
    fieldMappings,
    setFieldMapping,
    groupByCategory = false,
}) => {
    const {
        attributes,
        dataElements,
        loading,
        error,
        programMetadataReady,
        stageMetadataReady,
    } = useProgramFieldOptions(programId, programStageId)

    useEffect(() => {
        fieldMappingFields.forEach(({ key, kind }) => {
            if (kind === 'organisationUnit') return
            const metadataReady = kind === 'attribute' ? programMetadataReady : stageMetadataReady
            if (!metadataReady) return

            const options = kind === 'attribute' ? attributes : dataElements
            const current = fieldMappings[key]
            if (current && !options.some((opt) => opt.id === current)) {
                setFieldMapping(key, '')
            }
        })
    }, [
        fieldMappingFields,
        programMetadataReady,
        stageMetadataReady,
        attributes,
        dataElements,
        fieldMappings,
        setFieldMapping,
    ])

    const groupedFields = useMemo(() => {
        if (!groupByCategory) {
            return [{ category: null, fields: fieldMappingFields }]
        }
        const categories = [...new Set(fieldMappingFields.map((f) => f.category).filter(Boolean))]
        return categories.map((category) => ({
            category,
            fields: fieldMappingFields.filter((f) => f.category === category),
        }))
    }, [fieldMappingFields, groupByCategory])

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
            {groupedFields.map(({ category, fields }) => (
                <div key={category || 'all'}>
                    {category ? (
                        <h4 className={classes.subsectionTitle}>{category}</h4>
                    ) : null}
                    {fields.map(({ key, label, kind, helpText }) => {
                        if (kind === 'organisationUnit') {
                            return (
                                <NoticeBox
                                    key={key}
                                    title={typeof label === 'function' ? label() : label}
                                >
                                    {i18n.t(
                                        'This EMS field ({{objectId}}) maps to organisation unit metadata and cannot be configured here yet.',
                                        { objectId: key, nsSeparator: false }
                                    )}
                                </NoticeBox>
                            )
                        }

                        const labelText = typeof label === 'function' ? label() : label
                        const help =
                            typeof helpText === 'function' ? helpText() : helpText

                        return (
                            <FieldMappingSelect
                                key={key}
                                fieldKey={key}
                                label={labelText}
                                kind={kind}
                                helpText={help}
                                programId={programId}
                                programStageId={programStageId}
                                fieldMappings={fieldMappings}
                                setFieldMapping={setFieldMapping}
                                attributes={attributes}
                                dataElements={dataElements}
                                loading={loading}
                                programMetadataReady={programMetadataReady}
                                stageMetadataReady={stageMetadataReady}
                            />
                        )
                    })}
                </div>
            ))}
        </div>
    )
}

export default FieldMappingFields
