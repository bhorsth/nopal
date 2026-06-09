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
import {
    buildEmsAttributeValues,
    groupEmsRecordDataValuesByStage,
} from '../utils/buildEmsEventDataValues'
import { computeEmsOccurredAtTimes } from '../utils/isoDuration'
import { formatEmsValue } from '../utils/emsValue'
import { getTeiAttributeByName, lookupTrackedEntitiesBySerial } from '../services/trackerLookup'
import DeviceRegistrationPanel from './DeviceRegistrationPanel'
import classes from '../App.module.css'

const getDataValue = (dataValues, dataElementId) => {
    if (!Array.isArray(dataValues)) return null
    const dv = dataValues.find((item) => item.dataElement === dataElementId)
    return dv?.value || null
}

const resolveStageId = (stageName, stages) => {
    if (!stageName || !Array.isArray(stages)) {
        return null
    }

    const normalized = stageName.trim().toLowerCase()
    const exact = stages.find((stage) => stage.displayName.trim().toLowerCase() === normalized)
    if (exact) {
        return exact.id
    }

    return stages.find((stage) => stage.displayName.toLowerCase().includes(normalized))?.id || null
}

const EmsDhis2Actions = ({ parsedData }) => {
    const engine = useDataEngine()
    const { programId, fieldMappings, isImportConfigValid } = useEmsImportConfig()
    const { stages, loading: stagesLoading } = useProgramMetadata(programId)

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

    const serial = parsedData?.config?.serial
    const serialAttributeId = fieldMappings.LSER
    const records = parsedData?.records ?? []
    const metadata = parsedData?.metadata ?? {}

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

    const handleGetEvents = async () => {
        setEventsError('')
        setEventsResult(null)

        if (!serial) {
            setEventsError(i18n.t('No logger serial found in parsed data. Parse a file first.'))
            return
        }

        if (!isImportConfigValid) {
            setEventsError(
                i18n.t('Complete EMS import settings and field mappings in Settings before using DHIS2 actions.')
            )
            return
        }

        setEventsLoading(true)
        try {
            const query = {
                trackedEntities: {
                    resource: 'tracker/trackedEntities',
                    params: {
                        filter: `${serialAttributeId}:like:${serial}`,
                        fields: 'trackedEntity,enrollments[enrollment,events[event,occurredAt,status,programStage,dataValues[dataElement,value]]]',
                        program: programId,
                        orgUnitMode: 'ACCESSIBLE',
                    },
                },
            }
            const result = await engine.query(query)
            const entities = result?.trackedEntities?.trackedEntities ?? []

            const allEvents = []
            entities.forEach((tei) => {
                if (Array.isArray(tei.enrollments)) {
                    tei.enrollments.forEach((enrollment) => {
                        if (Array.isArray(enrollment.events)) {
                            allEvents.push(
                                ...enrollment.events.map((evt) => ({
                                    ...evt,
                                    trackedEntity: tei.trackedEntity,
                                    enrollment: enrollment.enrollment,
                                }))
                            )
                        }
                    })
                }
            })

            const sortedEvents = allEvents
                .sort((a, b) => new Date(b.occurredAt || 0) - new Date(a.occurredAt || 0))
                .slice(0, 60)

            setEventsResult({ serial, events: sortedEvents })
        } catch (err) {
            // eslint-disable-next-line no-console
            console.error('DHIS2 get events failed', err)
            setEventsError(i18n.t('DHIS2 get events failed: {{message}}', { message: err.message, nsSeparator: false }))
        } finally {
            setEventsLoading(false)
        }
    }

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

        if (stagesLoading) {
            setSyncError(i18n.t('Program metadata is still loading. Please try again in a moment.'))
            return
        }

        const tei = lookupResult.entities[0]
        const trackedEntity = tei.trackedEntity
        const enrollment = tei.enrollments?.[0]?.enrollment
        const orgUnit = tei.orgUnit

        if (!trackedEntity || !enrollment || !orgUnit) {
            setSyncError(i18n.t('Missing tracked entity, enrollment, or org unit. Please lookup the device again.'))
            return
        }

        const existingEventsByRelT = new Map()
        if (eventsResult && Array.isArray(eventsResult.events)) {
            const reltMappingId = fieldMappings.RELT
            eventsResult.events.forEach((evt) => {
                if (!reltMappingId) return
                const relt = getDataValue(evt.dataValues, reltMappingId)
                if (relt) {
                    existingEventsByRelT.set(relt, evt.event)
                }
            })
        }

        const occurredAtTimes = computeEmsOccurredAtTimes(records)
        const events = []

        records.forEach((record, index) => {
            const relt = formatEmsValue(record.RELT)
            if (relt && existingEventsByRelT.has(relt)) {
                return
            }

            const byStage = groupEmsRecordDataValuesByStage(record, fieldMappings)
            const occurredAt = occurredAtTimes[index]

            Object.entries(byStage).forEach(([stageName, dataValues]) => {
                if (dataValues.length === 0) {
                    return
                }

                const programStage = resolveStageId(stageName, stages)
                if (!programStage) {
                    return
                }

                events.push({
                    orgUnit,
                    occurredAt,
                    status: 'ACTIVE',
                    program: programId,
                    programStage,
                    trackedEntity,
                    enrollment,
                    dataValues,
                })
            })
        })

        const attributeValues = buildEmsAttributeValues(metadata, fieldMappings)
        const hasEvents = events.length > 0
        const hasAttributes = attributeValues.length > 0

        if (!hasEvents && !hasAttributes) {
            setSyncError(i18n.t('No EMS data available to sync with the current field mappings.'))
            return
        }

        setSyncLoading(true)
        try {
            const payload = {}
            if (hasAttributes) {
                payload.trackedEntities = [
                    {
                        trackedEntity,
                        orgUnit,
                        attributes: attributeValues,
                    },
                ]
            }
            if (hasEvents) {
                payload.events = events
            }

            const mutation = {
                resource: 'tracker',
                type: 'create',
                params: { async: false },
                data: payload,
            }
            const result = await engine.mutate(mutation)
            setSyncResult(result)
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
        const tei = lookupResult.entities[0]

        return {
            manufacturer: getTeiAttributeByName(tei, 'Appliance Manufacturer'),
            manufacturerSerial: getTeiAttributeByName(tei, 'Appliance Manufacturer Serial Number'),
            model: getTeiAttributeByName(tei, 'Appliance Model'),
        }
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
                        <Button onClick={handleGetEvents} disabled={busy}>
                            {eventsLoading ? i18n.t('Loading events...') : i18n.t('Show existing data')}
                        </Button>
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
                                                <TableCellHead dense>{i18n.t('Occurred at')}</TableCellHead>
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
                                                        {event.occurredAt ? event.occurredAt.replace('T', ' ').slice(0, 19) : ''}
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
