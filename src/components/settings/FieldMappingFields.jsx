import i18n from '@dhis2/d2-i18n'
import React, { useEffect, useMemo, useRef } from 'react'
import { NoticeBox, SingleSelectField, SingleSelectOption } from '@dhis2/ui'
import { useProgramFieldOptions } from '../../hooks/useProgramFieldOptions'
import { useProgramMetadata } from '../../hooks/useProgramMetadata'
import { buildEmsAutoMappings } from '../../utils/emsAutoMapFields'
import classes from '../../App.module.css'
import fieldMappingClasses from './FieldMappingFields.module.css'

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
    groupByStageOrAttribute = false,
    fieldMappingGroups = null,
    autoMapOnProgramLoad = false,
}) => {
    const legacyOptions = useProgramFieldOptions(
        groupByStageOrAttribute ? null : programId,
        groupByStageOrAttribute ? null : programStageId
    )
    const emsMetadata = useProgramMetadata(groupByStageOrAttribute ? programId : null)

    const {
        attributes,
        dataElements,
        dataElementsByStageName,
        stages,
        loading,
        error,
        programMetadataReady,
        stageMetadataReady,
    } = groupByStageOrAttribute
        ? {
              attributes: emsMetadata.attributes,
              dataElements: [],
              dataElementsByStageName: emsMetadata.dataElementsByStageName,
              stages: emsMetadata.stages,
              loading: emsMetadata.loading,
              error: emsMetadata.error,
              programMetadataReady: emsMetadata.programMetadataReady,
              stageMetadataReady: emsMetadata.programMetadataReady,
          }
        : {
              ...legacyOptions,
              dataElementsByStageName: null,
              stages: [],
          }

    const autoMappedProgramRef = useRef(null)

    useEffect(() => {
        if (!autoMapOnProgramLoad || !groupByStageOrAttribute) return
        if (!programId || !programMetadataReady) return
        if (autoMappedProgramRef.current === programId) return

        autoMappedProgramRef.current = programId
        const autoMappings = buildEmsAutoMappings(fieldMappingFields, {
            attributes,
            dataElementsByStageName,
        })

        Object.entries(autoMappings).forEach(([key, value]) => {
            if (!fieldMappings[key]) {
                setFieldMapping(key, value)
            }
        })
    }, [
        autoMapOnProgramLoad,
        groupByStageOrAttribute,
        programId,
        programMetadataReady,
        fieldMappingFields,
        attributes,
        dataElementsByStageName,
        fieldMappings,
        setFieldMapping,
    ])

    useEffect(() => {
        if (!programId) {
            autoMappedProgramRef.current = null
        }
    }, [programId])

    useEffect(() => {
        if (groupByStageOrAttribute) {
            fieldMappingFields.forEach(({ key, kind, stageOrAttribute }) => {
                if (kind === 'organisationUnit') return
                if (!programMetadataReady) return

                const options =
                    kind === 'attribute'
                        ? attributes
                        : dataElementsByStageName[stageOrAttribute] || []
                const current = fieldMappings[key]
                if (current && !options.some((opt) => opt.id === current)) {
                    setFieldMapping(key, '')
                }
            })
            return
        }

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
        groupByStageOrAttribute,
        fieldMappingFields,
        programMetadataReady,
        stageMetadataReady,
        attributes,
        dataElements,
        dataElementsByStageName,
        fieldMappings,
        setFieldMapping,
    ])

    const groupedFields = useMemo(() => {
        if (groupByStageOrAttribute) {
            const groups = fieldMappingGroups || [
                ...new Set(fieldMappingFields.map((f) => f.stageOrAttribute).filter(Boolean)),
            ]
            return groups.map((group) => ({
                group,
                fields: fieldMappingFields.filter((f) => f.stageOrAttribute === group),
            }))
        }

        if (!groupByCategory) {
            return [{ group: null, fields: fieldMappingFields }]
        }

        const categories = [...new Set(fieldMappingFields.map((f) => f.category).filter(Boolean))]
        return categories.map((category) => ({
            group: category,
            fields: fieldMappingFields.filter((f) => f.category === category),
        }))
    }, [fieldMappingFields, groupByCategory, groupByStageOrAttribute, fieldMappingGroups])

    const stageNamesOnProgram = useMemo(
        () => new Set(stages.map((stage) => stage.displayName)),
        [stages]
    )

    const renderField = (field) => {
        const { key, label, kind, helpText, stageOrAttribute } = field

        if (kind === 'organisationUnit') {
            return (
                <NoticeBox key={key} title={typeof label === 'function' ? label() : label}>
                    {i18n.t(
                        'This EMS field ({{objectId}}) maps to organisation unit metadata and cannot be configured here yet.',
                        { objectId: key, nsSeparator: false }
                    )}
                </NoticeBox>
            )
        }

        const labelText = typeof label === 'function' ? label() : label
        const help = typeof helpText === 'function' ? helpText() : helpText
        const fieldDataElements = groupByStageOrAttribute
            ? dataElementsByStageName[stageOrAttribute] || []
            : dataElements
        const fieldStageReady =
            kind === 'attribute'
                ? programMetadataReady
                : groupByStageOrAttribute
                  ? programMetadataReady && stageNamesOnProgram.has(stageOrAttribute)
                  : stageMetadataReady

        return (
            <FieldMappingSelect
                key={key}
                fieldKey={key}
                label={labelText}
                kind={kind}
                helpText={help}
                fieldMappings={fieldMappings}
                setFieldMapping={setFieldMapping}
                attributes={attributes}
                dataElements={fieldDataElements}
                loading={loading}
                programMetadataReady={programMetadataReady}
                stageMetadataReady={fieldStageReady}
            />
        )
    }

    const requiresProgramStage = !groupByStageOrAttribute

    if (!programId || (requiresProgramStage && !programStageId)) {
        return (
            <p className={classes.helpText}>
                {requiresProgramStage
                    ? i18n.t('Select a program and program stage to map fields to DHIS2 metadata.')
                    : i18n.t('Select a program to map fields to DHIS2 metadata.')}
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

    const renderGrouped = () =>
        groupedFields.map(({ group, fields }) => {
            const isStageGroup =
                groupByStageOrAttribute && group && group !== 'TEI attribute' && group !== 'Other'
            const stageMissing =
                isStageGroup && programMetadataReady && !stageNamesOnProgram.has(group)

            return (
                <section key={group || 'all'} className={fieldMappingClasses.categorySection}>
                    {group ? (
                        <h4 className={fieldMappingClasses.categoryTitle}>
                            {i18n.t('{{group}} ({{count}} fields)', {
                                group,
                                count: fields.length,
                                nsSeparator: false,
                            })}
                        </h4>
                    ) : null}
                    {stageMissing ? (
                        <NoticeBox warning title={i18n.t('Program stage not found')}>
                            {i18n.t(
                                'No program stage named "{{stage}}" exists on the selected program. Data element fields in this section cannot be mapped until the stage is added.',
                                { stage: group, nsSeparator: false }
                            )}
                        </NoticeBox>
                    ) : null}
                    <div className={fieldMappingClasses.categoryFields}>
                        {fields.map(renderField)}
                    </div>
                </section>
            )
        })

    if (groupByStageOrAttribute || groupByCategory) {
        return (
            <div className={fieldMappingClasses.fieldMappingGroups}>{renderGrouped()}</div>
        )
    }

    return <div className={classes.settingsFields}>{renderGrouped()}</div>
}

export default FieldMappingFields
