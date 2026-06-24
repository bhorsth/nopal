import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import i18n from '@dhis2/d2-i18n'
import { useDataEngine } from '@dhis2/app-runtime'
import {
    Button,
    ButtonStrip,
    NoticeBox,
    Table,
    TableBody,
    TableCell,
    TableCellHead,
    TableHead,
    TableRow,
    TableRowHead,
} from '@dhis2/ui'
import { useImportConfig } from '../context/ImportConfigContext'
import { FIELD_MAPPING_FIELDS } from '../config/fieldMappingDefinitions'
import { buildFridgeTagEventPayloads } from '../utils/buildFridgeTagEventPayloads'
import {
    getTeiOrgUnitId,
    getTeiSummaryInfo,
    lookupTrackedEntitiesBySerial,
} from '../services/trackerLookup'
import { fetchTrackerEventsBySerial, syncTrackerEventPayloads } from '../services/trackerEvents'
import DeviceRegistrationPanel from './DeviceRegistrationPanel'
import classes from '../App.module.css'

const formatDate = (dateStr) => {
    if (!dateStr) return ''
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        const [year, month, day] = dateStr.split('-')
        return `${day}.${month}.${year}`
    }
    try {
        const date = new Date(dateStr)
        if (!Number.isNaN(date.getTime())) {
            const day = String(date.getDate()).padStart(2, '0')
            const month = String(date.getMonth() + 1).padStart(2, '0')
            const year = date.getFullYear()
            return `${day}.${month}.${year}`
        }
    } catch (e) {
        // ignore
    }
    return dateStr
}

const getDataValue = (dataValues, dataElementId) => {
    if (!Array.isArray(dataValues)) return null
    const dv = dataValues.find((dv) => dv.dataElement === dataElementId)
    return dv?.value || null
}

const Dhis2Actions = ({ parsedData }) => {
    const engine = useDataEngine()
    const { programId, programStageId, fieldMappings, isImportConfigValid } = useImportConfig()

    const [lookupLoading, setLookupLoading] = useState(false)
    const [lookupError, setLookupError] = useState('')
    const [lookupResult, setLookupResult] = useState(null)

    const [eventsLoading, setEventsLoading] = useState(false)
    const [eventsError, setEventsError] = useState('')
    const [eventsResult, setEventsResult] = useState(null)

    const [createLoading, setCreateLoading] = useState(false)
    const [createError, setCreateError] = useState('')
    const [createResult, setCreateResult] = useState(null)

    const resultScrollRef = useRef(null)
    const lastAutoLookupKeyRef = useRef('')
    const lastAutoEventsKeyRef = useRef('')

    const serial = parsedData?.config?.serial
    const serialAttributeId = fieldMappings.serialAttribute

    const runLookup = useCallback(async () => {
        setLookupError('')
        setLookupResult(null)
        setEventsResult(null)
        setEventsError('')
        setCreateResult(null)
        setCreateError('')
        lastAutoEventsKeyRef.current = ''

        if (!serial) {
            setLookupError(i18n.t('No serial found in parsed data. Parse a file first.'))
            return
        }

        if (!isImportConfigValid) {
            setLookupError(
                i18n.t('Complete import settings and field mappings in Settings before using DHIS2 actions.')
            )
            return
        }

        setLookupLoading(true)
        try {
            const entities = await lookupTrackedEntitiesBySerial(engine, {
                serial,
                programId,
                serialAttributeId,
            })
            setLookupResult({ serial, entities })
        } catch (err) {
            // eslint-disable-next-line no-console
            console.error('DHIS2 lookup failed', err)
            setLookupError(i18n.t('DHIS2 lookup failed: {{message}}', { message: err.message, nsSeparator: false }))
        } finally {
            setLookupLoading(false)
        }
    }, [engine, serial, isImportConfigValid, programId, serialAttributeId])

    useEffect(() => {
        if (!parsedData || !serial) return

        const lookupKey = `${serial}:${programId}:${serialAttributeId}:${isImportConfigValid}`
        if (lastAutoLookupKeyRef.current === lookupKey) return
        lastAutoLookupKeyRef.current = lookupKey

        runLookup()
    }, [parsedData, serial, programId, serialAttributeId, isImportConfigValid, runLookup])

    const loadExistingEvents = useCallback(async () => {
        if (!serial || !isImportConfigValid) {
            return null
        }

        setEventsError('')
        setEventsLoading(true)
        try {
            const result = await fetchTrackerEventsBySerial(engine, {
                serial,
                programId,
                serialAttributeId,
            })
            setEventsResult(result)
            return result
        } catch (err) {
            // eslint-disable-next-line no-console
            console.error('DHIS2 get events failed', err)
            setEventsError(i18n.t('DHIS2 get events failed: {{message}}', { message: err.message, nsSeparator: false }))
            return null
        } finally {
            setEventsLoading(false)
        }
    }, [engine, serial, isImportConfigValid, programId, serialAttributeId])

    useEffect(() => {
        if (!lookupResult?.entities?.length || !isImportConfigValid || !serial) {
            return
        }

        const eventsKey = `${serial}:${programId}:${serialAttributeId}`
        if (lastAutoEventsKeyRef.current === eventsKey) {
            return
        }
        lastAutoEventsKeyRef.current = eventsKey
        loadExistingEvents()
    }, [lookupResult, serial, programId, serialAttributeId, isImportConfigValid, loadExistingEvents])

    const plannedSync = useMemo(() => {
        if (!lookupResult?.entities?.length || !eventsResult?.events) {
            return null
        }

        const tei = lookupResult.entities[0]
        const trackedEntity = tei.trackedEntity
        const enrollment = tei.enrollments?.[0]?.enrollment
        const orgUnit = getTeiOrgUnitId(tei)

        if (!trackedEntity || !enrollment || !orgUnit) {
            return null
        }

        return buildFridgeTagEventPayloads({
            parsedData,
            fieldMappings,
            programId,
            programStageId,
            trackedEntity,
            enrollment,
            orgUnit,
            existingEvents: eventsResult.events,
        })
    }, [lookupResult, eventsResult, parsedData, fieldMappings, programId, programStageId])

    const previewFields = useMemo(
        () =>
            FIELD_MAPPING_FIELDS.filter(
                (field) => field.kind === 'dataElement' && fieldMappings[field.key]
            ).slice(0, 6),
        [fieldMappings]
    )

    const handleCreateEvents = async () => {
        setCreateError('')
        setCreateResult(null)

        if (!serial) {
            setCreateError(i18n.t('No serial found in parsed data. Parse a file first.'))
            return
        }

        if (!lookupResult || lookupResult.entities.length === 0) {
            setCreateError(i18n.t('Please lookup the device in DHIS2 first to get tracked entity and enrollment.'))
            return
        }

        if (!isImportConfigValid) {
            setCreateError(
                i18n.t('Complete import settings and field mappings in Settings before using DHIS2 actions.')
            )
            return
        }

        const tei = lookupResult.entities[0]
        const trackedEntity = tei.trackedEntity
        const enrollment = tei.enrollments?.[0]?.enrollment
        const orgUnit = getTeiOrgUnitId(tei)

        if (!trackedEntity || !enrollment || !orgUnit) {
            setCreateError(i18n.t('Missing tracked entity, enrollment, or org unit. Please lookup the device again.'))
            return
        }

        let existingEvents = eventsResult
        if (!existingEvents || !Array.isArray(existingEvents.events)) {
            existingEvents = await loadExistingEvents()
        }
        if (!existingEvents || !Array.isArray(existingEvents.events)) {
            setCreateError(i18n.t('Could not load existing DHIS2 events. Try again in a moment.'))
            return
        }

        const syncPlan = buildFridgeTagEventPayloads({
            parsedData,
            fieldMappings,
            programId,
            programStageId,
            trackedEntity,
            enrollment,
            orgUnit,
            existingEvents: existingEvents.events,
        })

        const { creates, updates, validRecords } = syncPlan

        if (creates.length === 0 && updates.length === 0) {
            if (validRecords.length > 0) {
                setCreateError(i18n.t('All history records already exist in DHIS2. No new events to create.'))
            } else {
                setCreateError(i18n.t('No valid history records with dates found to create events.'))
            }
            return
        }

        setCreateLoading(true)
        try {
            const result = await syncTrackerEventPayloads(engine, {
                eventsToCreate: creates,
                eventsToUpdate: updates,
            })
            setCreateResult(result)
            lastAutoEventsKeyRef.current = ''
            await loadExistingEvents()
        } catch (err) {
            // eslint-disable-next-line no-console
            console.error('DHIS2 create events failed', err)
            setCreateError(i18n.t('DHIS2 create/update events failed: {{message}}', { message: err.message, nsSeparator: false }))
        } finally {
            setCreateLoading(false)
        }
    }

    const handleRegistered = useCallback((result) => {
        setLookupResult(result)
        setLookupError('')
        lastAutoLookupKeyRef.current = `${result.serial}:${programId}:${serialAttributeId}:${isImportConfigValid}`
    }, [programId, serialAttributeId, isImportConfigValid])

    useEffect(() => {
        if (resultScrollRef.current) {
            resultScrollRef.current.scrollTop = resultScrollRef.current.scrollHeight
        }
    }, [lookupResult, eventsResult, createResult, lookupError, eventsError, createError])

    const teiSummaryRows = useMemo(() => {
        if (!lookupResult?.entities?.length) return null
        return getTeiSummaryInfo(lookupResult.entities[0])
    }, [lookupResult])

    const busy = lookupLoading || eventsLoading || createLoading
    const deviceFound = lookupResult?.entities?.length > 0
    const lookupComplete = lookupResult !== null && !lookupLoading

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                <h2 style={{ margin: 0, fontSize: '16px' }}>{i18n.t('DHIS2 Actions')}</h2>
                {deviceFound ? (
                    <ButtonStrip>
                        <Button primary onClick={handleCreateEvents} disabled={busy}>
                            {createLoading ? i18n.t('Creating/updating...') : i18n.t('Update data')}
                        </Button>
                    </ButtonStrip>
                ) : null}
            </div>

            {lookupLoading ? (
                <NoticeBox title={i18n.t('Looking up device in DHIS2…')}>
                    {i18n.t('Searching for logger serial {{serial}}.', { serial, nsSeparator: false })}
                </NoticeBox>
            ) : null}

            {lookupError ? <NoticeBox error>{lookupError}</NoticeBox> : null}
            {eventsLoading ? (
                <NoticeBox title={i18n.t('Loading existing DHIS2 events…')}>
                    {i18n.t('Fetching events for logger serial {{serial}}.', { serial, nsSeparator: false })}
                </NoticeBox>
            ) : null}
            {eventsError ? <NoticeBox error>{eventsError}</NoticeBox> : null}
            {createError ? <NoticeBox error>{createError}</NoticeBox> : null}

            <div ref={resultScrollRef} style={{ maxHeight: 420, overflow: 'auto' }}>
                {lookupComplete && !deviceFound && isImportConfigValid && serial ? (
                    <DeviceRegistrationPanel
                        deviceType="fridgeTag"
                        serial={serial}
                        programId={programId}
                        serialAttributeId={serialAttributeId}
                        fieldMappings={fieldMappings}
                        parsedData={parsedData}
                        onRegistered={handleRegistered}
                    />
                ) : null}

                {lookupResult && deviceFound ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div className={classes.tableWrap}>
                            <Table>
                                <TableBody>
                                    <TableRow>
                                        <TableCell dense>{i18n.t('Serial')}</TableCell>
                                        <TableCell dense>
                                            <strong>{lookupResult.serial}</strong>
                                        </TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell dense>{i18n.t('Tracked Entities Found')}</TableCell>
                                        <TableCell dense>
                                            <strong>{lookupResult.entities.length}</strong>
                                        </TableCell>
                                    </TableRow>
                                    {teiSummaryRows?.orgUnit?.name || teiSummaryRows?.orgUnit?.id ? (
                                        <TableRow>
                                            <TableCell dense>{i18n.t('Organisation unit')}</TableCell>
                                            <TableCell dense>
                                                <strong>
                                                    {teiSummaryRows.orgUnit.name || teiSummaryRows.orgUnit.id}
                                                </strong>
                                                {teiSummaryRows.orgUnit.name && teiSummaryRows.orgUnit.id ? (
                                                    <span style={{ color: 'var(--colors-grey700)' }}>
                                                        {' '}
                                                        ({teiSummaryRows.orgUnit.id})
                                                    </span>
                                                ) : null}
                                            </TableCell>
                                        </TableRow>
                                    ) : null}
                                    {teiSummaryRows?.facilityName ? (
                                        <TableRow>
                                            <TableCell dense>{i18n.t('Facility name')}</TableCell>
                                            <TableCell dense>
                                                <strong>{teiSummaryRows.facilityName}</strong>
                                            </TableCell>
                                        </TableRow>
                                    ) : null}
                                    {teiSummaryRows?.manufacturer ? (
                                        <TableRow>
                                            <TableCell dense>{i18n.t('Appliance Manufacturer')}</TableCell>
                                            <TableCell dense>
                                                <strong>{teiSummaryRows.manufacturer.value}</strong>
                                            </TableCell>
                                        </TableRow>
                                    ) : null}
                                    {teiSummaryRows?.manufacturerSerial ? (
                                        <TableRow>
                                            <TableCell dense>{i18n.t('Appliance Manufacturer Serial Number')}</TableCell>
                                            <TableCell dense>
                                                <strong>{teiSummaryRows.manufacturerSerial.value}</strong>
                                            </TableCell>
                                        </TableRow>
                                    ) : null}
                                    {teiSummaryRows?.model ? (
                                        <TableRow>
                                            <TableCell dense>{i18n.t('Appliance Model')}</TableCell>
                                            <TableCell dense>
                                                <strong>{teiSummaryRows.model.value}</strong>
                                            </TableCell>
                                        </TableRow>
                                    ) : null}
                                </TableBody>
                            </Table>
                        </div>

                        {plannedSync ? (
                            <details>
                                <summary style={{ cursor: 'pointer' }}>
                                    <strong>{i18n.t('Planned sync preview')}</strong>
                                    {' — '}
                                    {i18n.t('{{creates}} to create, {{updates}} to update, {{skipped}} skipped', {
                                        creates: plannedSync.creates.length,
                                        updates: plannedSync.updates.length,
                                        skipped: plannedSync.skippedPastDuplicates,
                                        nsSeparator: false,
                                    })}
                                </summary>
                                <div className={classes.tableWrap} style={{ marginTop: '8px' }}>
                                    <Table>
                                        <TableHead>
                                            <TableRowHead>
                                                <TableCellHead dense>{i18n.t('Date')}</TableCellHead>
                                                <TableCellHead dense>{i18n.t('Action')}</TableCellHead>
                                                {previewFields.map((field) => (
                                                    <TableCellHead dense key={field.key}>
                                                        {field.label()}
                                                    </TableCellHead>
                                                ))}
                                            </TableRowHead>
                                        </TableHead>
                                        <TableBody>
                                            {plannedSync.planned.slice(0, 60).map((item) => {
                                                const action = plannedSync.creates.some((c) => c.date === item.date)
                                                    ? 'create'
                                                    : plannedSync.updates.some((u) => u.date === item.date)
                                                      ? 'update'
                                                      : 'skip'
                                                return (
                                                    <TableRow key={item.date}>
                                                        <TableCell dense>{formatDate(item.date)}</TableCell>
                                                        <TableCell dense>{action}</TableCell>
                                                        {previewFields.map((field) => (
                                                            <TableCell dense key={field.key}>
                                                                {getDataValue(
                                                                    item.dataValues,
                                                                    fieldMappings[field.key]
                                                                ) || ''}
                                                            </TableCell>
                                                        ))}
                                                    </TableRow>
                                                )
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>
                            </details>
                        ) : null}
                    </div>
                ) : null}

                {eventsResult ? (
                    <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div>
                            {i18n.t('Serial')}: <strong>{eventsResult.serial}</strong>
                        </div>

                        {eventsResult.events.length === 0 ? (
                            <NoticeBox warning>{i18n.t('No events found')}</NoticeBox>
                        ) : (
                            <>
                                <div>
                                    {i18n.t('Events found')}: <strong>{eventsResult.events.length}</strong>{' '}
                                    {eventsResult.events.length === 60 ? `(${i18n.t('showing 60 most recent')})` : ''}
                                </div>

                                <div className={classes.tableWrap}>
                                    <Table>
                                        <TableHead>
                                            <TableRowHead>
                                                <TableCellHead dense>{i18n.t('Date')}</TableCellHead>
                                                <TableCellHead dense>{i18n.t('Average storage temperature')}</TableCellHead>
                                                <TableCellHead dense>{i18n.t('Min. temp')}</TableCellHead>
                                                <TableCellHead dense>{i18n.t('Max. temp')}</TableCellHead>
                                            </TableRowHead>
                                        </TableHead>
                                        <TableBody>
                                            {eventsResult.events.map((event, index) => {
                                                const dataValues = event.dataValues || []
                                                const avgTemp =
                                                    getDataValue(dataValues, fieldMappings.avgStorageTemp) ||
                                                    getDataValue(dataValues, fieldMappings.avgAmbientTemp)
                                                const minTemp = getDataValue(dataValues, fieldMappings.minTemp)
                                                const maxTemp = getDataValue(dataValues, fieldMappings.maxTemp)
                                                const eventDate = event.occurredAt ? event.occurredAt.split('T')[0] : ''

                                                return (
                                                    <TableRow key={event.event || index}>
                                                        <TableCell dense>{formatDate(eventDate)}</TableCell>
                                                        <TableCell dense>{avgTemp || ''}</TableCell>
                                                        <TableCell dense>{minTemp || ''}</TableCell>
                                                        <TableCell dense>{maxTemp || ''}</TableCell>
                                                    </TableRow>
                                                )
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>
                            </>
                        )}
                    </div>
                ) : null}

                {createResult ? (
                    <div style={{ marginTop: '12px' }}>
                        <div className={classes.tableWrap}>
                            <Table>
                                <TableBody>
                                    <TableRow>
                                        <TableCell dense>{i18n.t('Status')}</TableCell>
                                        <TableCell dense>
                                            <strong>{createResult.status || ''}</strong>
                                        </TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell dense>{i18n.t('Created')}</TableCell>
                                        <TableCell dense>
                                            <strong>{createResult.stats?.created || 0}</strong>
                                        </TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell dense>{i18n.t('Updated')}</TableCell>
                                        <TableCell dense>
                                            <strong>{createResult.stats?.updated || 0}</strong>
                                        </TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell dense>{i18n.t('Total')}</TableCell>
                                        <TableCell dense>
                                            <strong>{createResult.stats?.total || 0}</strong>
                                        </TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                ) : null}
            </div>
        </div>
    )
}

export default Dhis2Actions
