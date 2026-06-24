import i18n from '@dhis2/d2-i18n'
import React, { useEffect, useMemo, useState } from 'react'
import { useDataEngine } from '@dhis2/app-runtime'
import {
    Button,
    ButtonStrip,
    CircularLoader,
    NoticeBox,
    SingleSelectField,
    SingleSelectOption,
    Table,
    TableBody,
    TableCell,
    TableRow,
} from '@dhis2/ui'
import { getDhis2Config } from '../config/dhis2'
import { EMS_FIELD_MAPPING_FIELDS } from '../config/emsFieldMappingDefinitions'
import {
    formatTeiOptionLabel,
    getTeiOrgUnitId,
    linkLoggerToExistingAppliance,
    listProgramTrackedEntities,
    lookupTrackedEntitiesBySerial,
    registerNewAppliance,
} from '../services/trackerLookup'
import { buildRegistrationAttributes } from '../utils/buildRegistrationAttributes'
import OrganisationUnitPicker from './OrganisationUnitPicker'
import classes from '../App.module.css'

const DeviceRegistrationPanel = ({
    deviceType = 'fridgeTag',
    serial,
    programId,
    serialAttributeId,
    fieldMappings = {},
    parsedData = null,
    onRegistered,
}) => {
    const engine = useDataEngine()
    const { config: envConfig } = getDhis2Config()

    const [mode, setMode] = useState(null)
    const [registerLoading, setRegisterLoading] = useState(false)
    const [registerError, setRegisterError] = useState('')
    const [selectedOrgUnitId, setSelectedOrgUnitId] = useState(envConfig.orgUnitId || '')

    const [appliancesLoading, setAppliancesLoading] = useState(false)
    const [appliancesError, setAppliancesError] = useState('')
    const [appliances, setAppliances] = useState([])
    const [selectedTeiId, setSelectedTeiId] = useState('')

    const registrationAttributes = useMemo(
        () =>
            buildRegistrationAttributes({
                deviceType,
                parsedData,
                fieldMappings,
                serialAttributeId,
                serial,
            }),
        [deviceType, parsedData, fieldMappings, serialAttributeId, serial]
    )

    const attributePreviewRows = useMemo(() => {
        if (deviceType === 'ems') {
            return EMS_FIELD_MAPPING_FIELDS.filter((field) => field.kind === 'attribute')
                .map((field) => {
                    const attributeId = fieldMappings[field.key]
                    const sourceValue = parsedData?.metadata?.[field.key]
                    const willWrite = registrationAttributes.find((a) => a.attribute === attributeId)
                    return {
                        key: field.key,
                        label: field.label(),
                        attributeId,
                        sourceValue,
                        willWrite: Boolean(willWrite),
                        value: willWrite?.value ?? '',
                    }
                })
                .filter((row) => row.attributeId || row.sourceValue != null)
        }

        return registrationAttributes.map((attr) => ({
            key: attr.attribute,
            label: attr.attribute === serialAttributeId ? i18n.t('Logger serial') : attr.attribute,
            attributeId: attr.attribute,
            sourceValue: attr.value,
            willWrite: true,
            value: attr.value,
        }))
    }, [deviceType, fieldMappings, parsedData, registrationAttributes, serialAttributeId])

    useEffect(() => {
        if (mode !== 'existing') return

        let cancelled = false
        const load = async () => {
            setAppliancesLoading(true)
            setAppliancesError('')
            try {
                const entities = await listProgramTrackedEntities(engine, { programId })
                if (cancelled) return
                setAppliances(entities)
            } catch (err) {
                if (cancelled) return
                setAppliancesError(err.message)
            } finally {
                if (!cancelled) setAppliancesLoading(false)
            }
        }

        load()
        return () => {
            cancelled = true
        }
    }, [mode, engine, programId])

    const refreshLookup = async () => {
        const entities = await lookupTrackedEntitiesBySerial(engine, {
            serial,
            programId,
            serialAttributeId,
        })
        onRegistered({ serial, entities })
    }

    const handleRegisterNewAppliance = async () => {
        setRegisterError('')
        const orgUnitId = selectedOrgUnitId || envConfig.orgUnitId
        if (!orgUnitId || !envConfig.teTypeId) {
            setRegisterError(
                i18n.t(
                    'Select an organisation unit and ensure tracked entity type ID is set in environment configuration.'
                )
            )
            return
        }

        setRegisterLoading(true)
        try {
            await registerNewAppliance(engine, {
                programId,
                orgUnitId,
                teTypeId: envConfig.teTypeId,
                serialAttributeId,
                serial,
                attributes: registrationAttributes,
            })
            await refreshLookup()
        } catch (err) {
            setRegisterError(
                i18n.t('Registration failed: {{message}}', {
                    message: err.message,
                    nsSeparator: false,
                })
            )
        } finally {
            setRegisterLoading(false)
        }
    }

    const handleLinkToExisting = async () => {
        setRegisterError('')
        const tei = appliances.find((a) => a.trackedEntity === selectedTeiId)
        if (!tei) {
            setRegisterError(i18n.t('Select an existing appliance to continue.'))
            return
        }

        setRegisterLoading(true)
        try {
            await linkLoggerToExistingAppliance(engine, {
                trackedEntity: tei.trackedEntity,
                trackedEntityType: tei.trackedEntityType,
                orgUnit: getTeiOrgUnitId(tei),
                programId,
                serialAttributeId,
                serial,
                enrollments: tei.enrollments ?? [],
                attributes: registrationAttributes,
            })
            await refreshLookup()
        } catch (err) {
            setRegisterError(
                i18n.t('Registration failed: {{message}}', {
                    message: err.message,
                    nsSeparator: false,
                })
            )
        } finally {
            setRegisterLoading(false)
        }
    }

    const deviceLabel =
        deviceType === 'ems' ? i18n.t('EMS device') : i18n.t('Fridge-tag logger')

    const attributePreviewTable =
        attributePreviewRows.length > 0 ? (
            <div className={classes.tableWrap}>
                <Table>
                    <TableBody>
                        {attributePreviewRows.map((row) => (
                            <TableRow key={row.key}>
                                <TableCell dense>{row.label}</TableCell>
                                <TableCell dense>
                                    {row.willWrite ? row.value || row.sourceValue : i18n.t('Skipped')}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        ) : null

    if (mode === null) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <NoticeBox warning title={i18n.t('No matching device found')}>
                    {i18n.t(
                        'No tracked entity in DHIS2 matches {{deviceType}} serial {{serial}}. Register or link the device to continue.',
                        { deviceType: deviceLabel, serial, nsSeparator: false }
                    )}
                </NoticeBox>
                <ButtonStrip>
                    <Button primary onClick={() => setMode('new')} disabled={registerLoading}>
                        {i18n.t('Register new appliance')}
                    </Button>
                    <Button onClick={() => setMode('existing')} disabled={registerLoading}>
                        {i18n.t('Register logger on existing appliance')}
                    </Button>
                </ButtonStrip>
            </div>
        )
    }

    if (mode === 'new') {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <NoticeBox title={i18n.t('Register new appliance')}>
                    {i18n.t(
                        'A new tracked entity will be created for {{deviceType}} serial {{serial}} and enrolled in the configured program.',
                        { deviceType: deviceLabel, serial, nsSeparator: false }
                    )}
                </NoticeBox>
                <OrganisationUnitPicker
                    selectedOrgUnitId={selectedOrgUnitId}
                    onChange={setSelectedOrgUnitId}
                    disabled={registerLoading}
                />
                {attributePreviewTable}
                {registerError ? <NoticeBox error>{registerError}</NoticeBox> : null}
                <ButtonStrip>
                    <Button primary onClick={handleRegisterNewAppliance} loading={registerLoading}>
                        {i18n.t('Confirm registration')}
                    </Button>
                    <Button onClick={() => setMode(null)} disabled={registerLoading}>
                        {i18n.t('Back')}
                    </Button>
                </ButtonStrip>
            </div>
        )
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <NoticeBox title={i18n.t('Register logger on existing appliance')}>
                {i18n.t(
                    'Select an appliance and assign {{deviceType}} serial {{serial}} to it.',
                    { deviceType: deviceLabel, serial, nsSeparator: false }
                )}
            </NoticeBox>

            {appliancesError ? <NoticeBox error>{appliancesError}</NoticeBox> : null}
            {registerError ? <NoticeBox error>{registerError}</NoticeBox> : null}
            {attributePreviewTable}

            {appliancesLoading ? (
                <div className={classes.settingsLoader}>
                    <CircularLoader small />
                </div>
            ) : (
                <SingleSelectField
                    label={i18n.t('Existing appliance')}
                    selected={selectedTeiId}
                    onChange={({ selected }) => setSelectedTeiId(selected)}
                    placeholder={i18n.t('Select an appliance')}
                    filterable
                    filterPlaceholder={i18n.t('Filter appliances')}
                    noMatchText={i18n.t('No appliances found')}
                    disabled={registerLoading || appliances.length === 0}
                >
                    {appliances.map((tei) => (
                        <SingleSelectOption
                            key={tei.trackedEntity}
                            value={tei.trackedEntity}
                            label={formatTeiOptionLabel(tei, serialAttributeId)}
                        />
                    ))}
                </SingleSelectField>
            )}

            <ButtonStrip>
                <Button
                    primary
                    onClick={handleLinkToExisting}
                    loading={registerLoading}
                    disabled={!selectedTeiId || appliancesLoading}
                >
                    {i18n.t('Confirm registration')}
                </Button>
                <Button onClick={() => setMode(null)} disabled={registerLoading}>
                    {i18n.t('Back')}
                </Button>
            </ButtonStrip>
        </div>
    )
}

export default DeviceRegistrationPanel
