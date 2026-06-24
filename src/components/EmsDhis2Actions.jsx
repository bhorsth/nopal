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
import { EMS_FIELD_MAPPING_FIELDS } from '../config/emsFieldMappingDefinitions'
import { useEmsImportConfig } from '../context/ImportConfigContext'
import { useProgramMetadata } from '../hooks/useProgramMetadata'
import { aggregateEmsRecordsByDay } from '../utils/aggregateEmsRecordsDaily'
import {
    buildEmsDailyEventsByStage,
    buildStageNameToIdMap,
} from '../utils/buildEmsEventDataValues'
import {
    getTeiOrgUnitId,
    getTeiSummaryInfo,
    lookupTrackedEntitiesBySerial,
} from '../services/trackerLookup'
import { fetchTrackerEventsBySerial, syncTrackerEventPayloads } from '../services/trackerEvents'
import {
    buildExistingEventIdIndex,
    partitionPlannedEventsForSync,
    todayIsoDate,
} from '../utils/trackerEventSync'
import DeviceRegistrationPanel from './DeviceRegistrationPanel'
import classes from '../App.module.css'

const getDataValue = (dataValues, dataElementId) => {
    if (!Array.isArray(dataValues)) return null
    const dv = dataValues.find((item) => item.dataElement === dataElementId)
    return dv?.value || null
}

const EmsDhis2Actions = ({ parsedData }) => {
    const engine = useDataEngine()
    const { programId, fieldMappings, isImportConfigValid } = useEmsImportConfig()
    const { stages, programMetadataReady } = useProgramMetadata(programId)
    const stageNameToId = useMemo(() => buildStageNameToIdMap(stages), [stages])

    const [lookupLoading, setLookupLoading] = useState(false)
    const [lookupError, setLookupError] = useState('')
    const [lookupResult, setLookupResult] = useState(null)

    const [eventsLoading, setEventsLoading] = useState(false)
    const [eventsError, setEventsError] = useState('')
    const [eventsResult, setEventsResult] = useState(null)

    const [syncLoading, setSyncLoading] = useState(false)
    const [syncError, setSyncError] = useState('')
    const [syncResult, setSyncResult] = useState(null)

    const resultScrollRef = useRef(null)
    const lastAutoLookupKeyRef = useRef('')
    const lastAutoEventsKeyRef = useRef('')

    const serial = parsedData?.config?.serial
    const serialAttributeId = fieldMappings.LSER
    const records = parsedData?.records ?? []

    const previewEventFields = useMemo(() => {
        return EMS_FIELD_MAPPING_FIELDS.filter(
            (field) => field.kind === 'dataElement' && fieldMappings[field.key]
        ).slice(0, 4)
    }, [fieldMappings])

    const runLookup = useCallback(async () => {
        setLookupError('')
        setLookupResult(null)
        setEventsResult(null)
        setEventsError('')
        setSyncResult(null)
        setSyncError('')
        lastAutoEventsKeyRef.current = ''

        if (!serial) {
            setLookupError(i18n.t('No logger serial found in parsed data. Parse a file first.'))
            return
        }

        if (!isImportConfigValid) {
            setLookupError(
                i18n.t('Complete EMS import settings and field mappings in Settings before using DHIS2 actions.')
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

    const handleSyncData = async () => {
        setSyncError('')
        setSyncResult(null)

        if (!serial) {
            setSyncError(i18n.t('No logger serial found in parsed data. Parse a file first.'))
            return
        }

        if (!lookupResult || lookupResult.entities.length === 0) {
            setSyncError(i18n.t('Please lookup the device in DHIS2 first to get tracked entity and enrollment.'))
            return
        }

        if (!isImportConfigValid) {
            setSyncError(
                i18n.t('Complete EMS import settings and field mappings in Settings before using DHIS2 actions.')
            )
            return
        }

        if (!programMetadataReady) {
            setSyncError(
                i18n.t('Program metadata is still loading. Wait a moment and try syncing again.')
            )
            return
        }

        const tei = lookupResult.entities[0]
        const trackedEntity = tei.trackedEntity
        const enrollment = tei.enrollments?.[0]?.enrollment
        const orgUnit = getTeiOrgUnitId(tei)

        if (!trackedEntity || !enrollment || !orgUnit) {
            setSyncError(i18n.t('Missing tracked entity, enrollment, or org unit. Please lookup the device again.'))
            return
        }

        let existingEvents = eventsResult
        if (!existingEvents || !Array.isArray(existingEvents.events)) {
            existingEvents = await loadExistingEvents()
        }
        if (!existingEvents || !Array.isArray(existingEvents.events)) {
            setSyncError(i18n.t('Could not load existing DHIS2 events. Try again in a moment.'))
            return
        }

        const referenceTime = new Date()
        const todayDate = todayIsoDate(referenceTime)
        const existingEventIdsByKey = buildExistingEventIdIndex(
            existingEvents.events,
            (evt) =>
                evt.occurredAt && evt.programStage
                    ? `${String(evt.occurredAt).slice(0, 10)}:${evt.programStage}`
                    : null
        )

        const dailyRecords = aggregateEmsRecordsByDay(records, referenceTime)
        const plannedEvents = buildEmsDailyEventsByStage(dailyRecords, fieldMappings, stageNameToId)
        const unresolvedStages = new Set()
        const eventPayloads = []

        plannedEvents.forEach((plannedEvent) => {
            if (!plannedEvent.programStageId) {
                unresolvedStages.add(plannedEvent.stageName)
                return
            }

            eventPayloads.push({
                date: plannedEvent.date,
                orgUnit,
                occurredAt: plannedEvent.date,
                status: 'ACTIVE',
                program: programId,
                programStage: plannedEvent.programStageId,
                trackedEntity,
                enrollment,
                dataValues: plannedEvent.dataValues,
            })
        })

        if (unresolvedStages.size > 0 && eventPayloads.length === 0) {
            setSyncError(
                i18n.t(
                    'Could not resolve program stages for: {{stages}}. Check that stage names on the selected program match the EMS field mapping groups.',
                    { stages: [...unresolvedStages].join(', '), nsSeparator: false }
                )
            )
            return
        }

        const { creates, updates } = partitionPlannedEventsForSync(
            eventPayloads,
            existingEventIdsByKey,
            todayDate,
            (item) => `${item.date}:${item.programStage}`
        )

        if (creates.length === 0 && updates.length === 0) {
            if (unresolvedStages.size > 0) {
                setSyncError(
                    i18n.t(
                        'Could not resolve program stages for: {{stages}}. Check that stage names on the selected program match the EMS field mapping groups.',
                        { stages: [...unresolvedStages].join(', '), nsSeparator: false }
                    )
                )
            } else if (eventPayloads.length > 0) {
                setSyncError(i18n.t('All daily records already exist in DHIS2. No new events to create.'))
            } else {
                setSyncError(i18n.t('No EMS data available to sync with the current field mappings.'))
            }
            return
        }

        setSyncLoading(true)
        try {
            const result = await syncTrackerEventPayloads(engine, {
                eventsToCreate: creates,
                eventsToUpdate: updates,
            })
            setSyncResult(result)
            lastAutoEventsKeyRef.current = ''
            await loadExistingEvents()
        } catch (err) {
            // eslint-disable-next-line no-console
            console.error('DHIS2 EMS sync failed', err)
            setSyncError(i18n.t('DHIS2 create/update failed: {{message}}', { message: err.message, nsSeparator: false }))
        } finally {
            setSyncLoading(false)
        }
    }

    const handleRegistered = useCallback(
        (result) => {
            setLookupResult(result)
            setLookupError('')
            lastAutoLookupKeyRef.current = `${result.serial}:${programId}:${serialAttributeId}:${isImportConfigValid}`
        },
        [programId, serialAttributeId, isImportConfigValid]
    )

    useEffect(() => {
        if (resultScrollRef.current) {
            resultScrollRef.current.scrollTop = resultScrollRef.current.scrollHeight
        }
    }, [lookupResult, eventsResult, syncResult, lookupError, eventsError, syncError])

    const teiSummaryRows = useMemo(() => {
        if (!lookupResult?.entities?.length) return null
        return getTeiSummaryInfo(lookupResult.entities[0])
    }, [lookupResult])

    const busy = lookupLoading || eventsLoading || syncLoading
    const deviceFound = lookupResult?.entities?.length > 0
    const lookupComplete = lookupResult !== null && !lookupLoading

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div
                style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    justifyContent: 'space-between',
                    gap: '12px',
                    flexWrap: 'wrap',
                }}
            >
                <h2 style={{ margin: 0, fontSize: '16px' }}>{i18n.t('DHIS2 Actions')}</h2>
                {deviceFound ? (
                    <ButtonStrip>
                        <Button primary onClick={handleSyncData} disabled={busy}>
                            {syncLoading ? i18n.t('Syncing...') : i18n.t('Update data')}
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
            {syncError ? <NoticeBox error>{syncError}</NoticeBox> : null}

            <div ref={resultScrollRef} style={{ maxHeight: 420, overflow: 'auto' }}>
                {lookupComplete && !deviceFound && isImportConfigValid && serial ? (
                    <DeviceRegistrationPanel
                        serial={serial}
                        programId={programId}
                        serialAttributeId={serialAttributeId}
                        onRegistered={handleRegistered}
                    />
                ) : null}

                {lookupResult && deviceFound ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div className={classes.tableWrap}>
                            <Table>
                                <TableBody>
                                    <TableRow>
                                        <TableCell dense>{i18n.t('Logger serial number')}</TableCell>
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
                                            <TableCell dense>
                                                {i18n.t('Appliance Manufacturer Serial Number')}
                                            </TableCell>
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
                                                {previewEventFields.map((field) => (
                                                    <TableCellHead dense key={field.key}>
                                                        {field.label()}
                                                    </TableCellHead>
                                                ))}
                                            </TableRowHead>
                                        </TableHead>
                                        <TableBody>
                                            {eventsResult.events.map((event, index) => (
                                                <TableRow key={event.event || index}>
                                                    <TableCell dense>
                                                        {event.occurredAt ? event.occurredAt.split('T')[0] : ''}
                                                    </TableCell>
                                                    {previewEventFields.map((field) => (
                                                        <TableCell dense key={field.key}>
                                                            {getDataValue(event.dataValues, fieldMappings[field.key]) || ''}
                                                        </TableCell>
                                                    ))}
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </>
                        )}
                    </div>
                ) : null}

                {syncResult ? (
                    <div style={{ marginTop: '12px' }}>
                        <div className={classes.tableWrap}>
                            <Table>
                                <TableBody>
                                    <TableRow>
                                        <TableCell dense>{i18n.t('Status')}</TableCell>
                                        <TableCell dense>
                                            <strong>{syncResult.status || ''}</strong>
                                        </TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell dense>{i18n.t('Created')}</TableCell>
                                        <TableCell dense>
                                            <strong>{syncResult.stats?.created || 0}</strong>
                                        </TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell dense>{i18n.t('Updated')}</TableCell>
                                        <TableCell dense>
                                            <strong>{syncResult.stats?.updated || 0}</strong>
                                        </TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell dense>{i18n.t('Total')}</TableCell>
                                        <TableCell dense>
                                            <strong>{syncResult.stats?.total || 0}</strong>
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

export default EmsDhis2Actions
