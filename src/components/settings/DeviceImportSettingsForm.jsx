import i18n from '@dhis2/d2-i18n'
import React, { useEffect, useMemo } from 'react'
import {
    Card,
    CircularLoader,
    NoticeBox,
    SingleSelectField,
    SingleSelectOption,
    Table,
    TableBody,
    TableCell,
    TableRow,
} from '@dhis2/ui'
import { getDhis2Config } from '../../config/dhis2'
import { DATA_STORE_NAMESPACE } from '../../config/importSettingsDataStore'
import { useProgramStages, useTrackerPrograms } from '../../hooks/useTrackerPrograms'
import FieldMappingFields from './FieldMappingFields'
import classes from '../../App.module.css'

const APP_CONFIG_LABELS = {
    REACT_APP_DHIS2_ORG_UNIT_ID: i18n.t('Organisation unit ID'),
    REACT_APP_DHIS2_TE_TYPE_ID: i18n.t('Tracked entity type ID'),
}

const DeviceImportSettingsForm = ({
    title,
    description,
    dataStoreKey,
    config,
    fieldMappingFields,
    groupFieldMappingsByCategory = false,
    incompleteSettingsMessage,
}) => {
    const { config: envConfig, missing, isValid: isEnvValid } = useMemo(() => getDhis2Config(), [])
    const {
        programId,
        programStageId,
        fieldMappings,
        setProgramId,
        setProgramStageId,
        setFieldMapping,
        isImportConfigValid,
        settingsLoading,
        settingsSaving,
        storageSource,
        storageWarning,
    } = config

    const { programs, loading: programsLoading, error: programsError } = useTrackerPrograms()
    const { stages, loading: stagesLoading, error: stagesError } = useProgramStages(programId)

    const appConfigRows = [
        { key: 'REACT_APP_DHIS2_ORG_UNIT_ID', value: envConfig.orgUnitId },
        { key: 'REACT_APP_DHIS2_TE_TYPE_ID', value: envConfig.teTypeId },
    ]

    const programInList = programs.some((p) => p.id === programId)
    const stageInList = stages.some((s) => s.id === programStageId)

    const programSelectValue = programInList ? programId : ''
    const stageSelectValue = stageInList ? programStageId : ''

    useEffect(() => {
        if (settingsLoading) return
        if (!programsLoading && programs.length > 0 && programId && !programInList) {
            setProgramId('')
        }
    }, [settingsLoading, programsLoading, programs, programId, programInList, setProgramId])

    useEffect(() => {
        if (settingsLoading) return
        if (
            programId &&
            !stagesLoading &&
            stages.length > 0 &&
            programStageId &&
            !stageInList
        ) {
            setProgramStageId('')
        }
    }, [
        settingsLoading,
        programId,
        stagesLoading,
        stages,
        programStageId,
        stageInList,
        setProgramStageId,
    ])

    const storageInfoMessage = useMemo(() => {
        if (storageSource === 'dataStore') {
            return i18n.t(
                'Settings are saved in the DHIS2 data store ({{namespace}}/{{key}}) and shared by all users on this instance.',
                {
                    namespace: DATA_STORE_NAMESPACE,
                    key: dataStoreKey,
                    nsSeparator: false,
                }
            )
        }
        if (storageSource === 'localStorage') {
            return i18n.t(
                'Could not save to the DHIS2 data store. Settings are stored in this browser only.'
            )
        }
        return i18n.t(
            'Settings will be saved to the DHIS2 data store ({{namespace}}/{{key}}) when you make changes.',
            {
                namespace: DATA_STORE_NAMESPACE,
                key: dataStoreKey,
                nsSeparator: false,
            }
        )
    }, [storageSource, dataStoreKey])

    const selectedProgramLabel = programs.find((p) => p.id === programId)?.displayName

    return (
        <div className={classes.page}>
            <h1 className={classes.pageTitle}>{title}</h1>
            <p className={classes.pageDescription}>{description}</p>

            {!isEnvValid ? (
                <NoticeBox error title={i18n.t('Missing configuration')}>
                    {i18n.t('The following environment variables are not set: {{vars}}', {
                        vars: missing.join(', '),
                        nsSeparator: false,
                    })}
                    <br />
                    {i18n.t('Add them to a .env or dhis2.env file in the project root, then restart yarn start.')}
                </NoticeBox>
            ) : null}

            {storageWarning ? (
                <NoticeBox warning title={i18n.t('Storage notice')}>
                    {storageWarning}
                </NoticeBox>
            ) : null}

            {storageSource === 'dataStore' && !storageWarning ? (
                <NoticeBox valid title={i18n.t('Shared settings')}>
                    {storageInfoMessage}
                </NoticeBox>
            ) : storageSource === 'localStorage' ? (
                <NoticeBox warning title={i18n.t('Local settings only')}>
                    {storageInfoMessage}
                </NoticeBox>
            ) : null}

            {!settingsLoading && !isImportConfigValid ? (
                <NoticeBox warning title={i18n.t('Import settings incomplete')}>
                    {incompleteSettingsMessage}
                </NoticeBox>
            ) : !settingsLoading && isEnvValid ? (
                <NoticeBox valid title={i18n.t('Configuration complete')}>
                    {i18n.t('Import settings are ready.')}
                </NoticeBox>
            ) : null}

            <Card className={classes.settingsCard}>
                <div className={classes.cardBody}>
                    <h2 className={classes.sectionTitle}>{i18n.t('Import settings')}</h2>
                    <p className={classes.helpText}>
                        {storageInfoMessage}
                        {settingsSaving ? ` ${i18n.t('Saving…')}` : ''}
                    </p>

                    {settingsLoading ? (
                        <div className={classes.settingsLoader}>
                            <CircularLoader />
                        </div>
                    ) : null}

                    {programsError ? (
                        <NoticeBox error title={i18n.t('Could not load programs')}>
                            {programsError.message}
                        </NoticeBox>
                    ) : null}

                    <div className={classes.settingsFields} style={{ display: settingsLoading ? 'none' : undefined }}>
                        <SingleSelectField
                            label={i18n.t('Program ID')}
                            helpText={i18n.t('Tracker programs you have access to on this instance')}
                            selected={programSelectValue}
                            onChange={({ selected }) => setProgramId(selected)}
                            placeholder={i18n.t('Select a program')}
                            filterable
                            filterPlaceholder={i18n.t('Filter programs')}
                            noMatchText={i18n.t('No programs found')}
                            loading={programsLoading}
                            disabled={programsLoading}
                        >
                            {programs.map((program) => (
                                <SingleSelectOption
                                    key={program.id}
                                    label={program.displayName}
                                    value={program.id}
                                />
                            ))}
                        </SingleSelectField>

                        {stagesError ? (
                            <NoticeBox error title={i18n.t('Could not load program stages')}>
                                {stagesError.message}
                            </NoticeBox>
                        ) : null}

                        <SingleSelectField
                            label={i18n.t('Program stage ID')}
                            helpText={
                                programId
                                    ? i18n.t('Stages for {{program}}', {
                                          program: selectedProgramLabel || programId,
                                          nsSeparator: false,
                                      })
                                    : i18n.t('Select a program first')
                            }
                            selected={stageSelectValue}
                            onChange={({ selected }) => setProgramStageId(selected)}
                            placeholder={
                                programId
                                    ? i18n.t('Select a program stage')
                                    : i18n.t('Select a program first')
                            }
                            filterable
                            filterPlaceholder={i18n.t('Filter program stages')}
                            noMatchText={i18n.t('No program stages found')}
                            loading={stagesLoading}
                            disabled={!programId || stagesLoading}
                        >
                            {stages.map((stage) => (
                                <SingleSelectOption
                                    key={stage.id}
                                    label={stage.displayName}
                                    value={stage.id}
                                />
                            ))}
                        </SingleSelectField>
                    </div>

                    {!settingsLoading ? (
                        <>
                            <h3 className={classes.subsectionTitle}>{i18n.t('Field mapping')}</h3>
                            <p className={classes.helpText}>
                                {i18n.t(
                                    'Map each imported value to a tracked entity attribute or program stage data element on your instance.'
                                )}
                            </p>
                            <FieldMappingFields
                                fieldMappingFields={fieldMappingFields}
                                programId={programId}
                                programStageId={programStageId}
                                fieldMappings={fieldMappings}
                                setFieldMapping={setFieldMapping}
                                groupByCategory={groupFieldMappingsByCategory}
                            />
                        </>
                    ) : null}

                    {appConfigRows.some((row) => row.value) ? (
                        <>
                            <h3 className={classes.subsectionTitle}>{i18n.t('Additional settings')}</h3>
                            <div className={classes.tableWrap}>
                                <Table>
                                    <TableBody>
                                        {appConfigRows.map(({ key, value }) =>
                                            value ? (
                                                <TableRow key={key}>
                                                    <TableCell dense>
                                                        {APP_CONFIG_LABELS[key] || key}
                                                    </TableCell>
                                                    <TableCell dense>{value}</TableCell>
                                                </TableRow>
                                            ) : null
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </>
                    ) : null}

                    {programsLoading && !programs.length ? (
                        <div className={classes.settingsLoader}>
                            <CircularLoader small />
                        </div>
                    ) : null}
                </div>
            </Card>
        </div>
    )
}

export default DeviceImportSettingsForm
