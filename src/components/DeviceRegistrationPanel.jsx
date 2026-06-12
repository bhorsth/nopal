import i18n from '@dhis2/d2-i18n'
import React, { useEffect, useState } from 'react'
import { useDataEngine } from '@dhis2/app-runtime'
import {
    Button,
    ButtonStrip,
    CircularLoader,
    NoticeBox,
    SingleSelectField,
    SingleSelectOption,
} from '@dhis2/ui'
import { getDhis2Config } from '../config/dhis2'
import {
    formatTeiOptionLabel,
    getTeiOrgUnitId,
    linkLoggerToExistingAppliance,
    listProgramTrackedEntities,
    lookupTrackedEntitiesBySerial,
    registerNewAppliance,
} from '../services/trackerLookup'
import classes from '../App.module.css'

const DeviceRegistrationPanel = ({
    serial,
    programId,
    serialAttributeId,
    onRegistered,
}) => {
    const engine = useDataEngine()
    const { config: envConfig } = getDhis2Config()

    const [mode, setMode] = useState(null)
    const [registerLoading, setRegisterLoading] = useState(false)
    const [registerError, setRegisterError] = useState('')

    const [appliancesLoading, setAppliancesLoading] = useState(false)
    const [appliancesError, setAppliancesError] = useState('')
    const [appliances, setAppliances] = useState([])
    const [selectedTeiId, setSelectedTeiId] = useState('')

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
        if (!envConfig.orgUnitId || !envConfig.teTypeId) {
            setRegisterError(
                i18n.t(
                    'Organisation unit ID and tracked entity type ID must be set in environment configuration before registering a new appliance.'
                )
            )
            return
        }

        setRegisterLoading(true)
        try {
            await registerNewAppliance(engine, {
                programId,
                orgUnitId: envConfig.orgUnitId,
                teTypeId: envConfig.teTypeId,
                serialAttributeId,
                serial,
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

    if (mode === null) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <NoticeBox warning title={i18n.t('No matching device found')}>
                    {i18n.t(
                        'No tracked entity in DHIS2 matches logger serial {{serial}}. Register the device to continue.',
                        { serial, nsSeparator: false }
                    )}
                </NoticeBox>
                <ButtonStrip>
                    <Button
                        primary
                        onClick={() => setMode('new')}
                        disabled={registerLoading}
                    >
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
                        'A new tracked entity will be created with logger serial {{serial}} and enrolled in the configured program.',
                        { serial, nsSeparator: false }
                    )}
                </NoticeBox>
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
                    'Select an appliance and assign logger serial {{serial}} to it.',
                    { serial, nsSeparator: false }
                )}
            </NoticeBox>

            {appliancesError ? <NoticeBox error>{appliancesError}</NoticeBox> : null}
            {registerError ? <NoticeBox error>{registerError}</NoticeBox> : null}

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
