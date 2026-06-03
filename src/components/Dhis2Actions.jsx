import React, { useEffect, useMemo, useRef, useState } from 'react'
import i18n from '@dhis2/d2-i18n'
import { useDataEngine } from '@dhis2/app-runtime'
import { Button, ButtonStrip, NoticeBox, Table, TableBody, TableCell, TableCellHead, TableHead, TableRow, TableRowHead } from '@dhis2/ui'
import { useImportConfig } from '../context/ImportConfigContext'
import { buildEventDataValues } from '../utils/buildEventDataValues'
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

    const serial = parsedData?.config?.serial

    const handleLookupInDhis2 = async () => {
        setLookupError('')
        setLookupResult(null)

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
            const query = {
                trackedEntities: {
                    resource: 'tracker/trackedEntities',
                    params: {
                        filter: `${fieldMappings.serialAttribute}:like:${serial}`,
                        fields: 'trackedEntity,orgUnit,attributes[attribute,displayName,value],enrollments[enrollment,orgUnit]',
                        program: programId,
                        orgUnitMode: 'ACCESSIBLE',
                    },
                },
            }
            const result = await engine.query(query)
            const entities = result?.trackedEntities?.trackedEntities ?? []
            setLookupResult({ serial, entities })
        } catch (err) {
            // eslint-disable-next-line no-console
            console.error('DHIS2 lookup failed', err)
            setLookupError(i18n.t('DHIS2 lookup failed: {{message}}', { message: err.message, nsSeparator: false }))
        } finally {
            setLookupLoading(false)
        }
    }

    const handleGetEvents = async () => {
        setEventsError('')
        setEventsResult(null)

        if (!serial) {
            setEventsError(i18n.t('No serial found in parsed data. Parse a file first.'))
            return
        }

        if (!isImportConfigValid) {
            setEventsError(
                i18n.t('Complete import settings and field mappings in Settings before using DHIS2 actions.')
            )
            return
        }

        setEventsLoading(true)
        try {
            const query = {
                trackedEntities: {
                    resource: 'tracker/trackedEntities',
                    params: {
                        filter: `${fieldMappings.serialAttribute}:like:${serial}`,
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
                .sort((a, b) => {
                    const dateA = new Date(a.occurredAt || 0)
                    const dateB = new Date(b.occurredAt || 0)
                    return dateB - dateA
                })
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

    const mapHistoryRecordToEvent = (record, trackedEntity, enrollment, orgUnit, existingEventId = null) => {
        const dataValues = buildEventDataValues(record, fieldMappings)

        const eventObj = {
            orgUnit,
            occurredAt: record.date || '',
            status: 'ACTIVE',
            program: programId,
            programStage: programStageId,
            trackedEntity,
            enrollment,
            dataValues,
        }

        if (existingEventId) {
            eventObj.event = existingEventId
        }

        return eventObj
    }

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
        const orgUnit = tei.orgUnit

        if (!trackedEntity || !enrollment || !orgUnit) {
            setCreateError(i18n.t('Missing tracked entity, enrollment, or org unit. Please lookup the device again.'))
            return
        }

        const existingEventsByDate = new Map()
        if (eventsResult && Array.isArray(eventsResult.events)) {
            eventsResult.events.forEach((evt) => {
                if (evt.occurredAt) {
                    const dateKey = String(evt.occurredAt).slice(0, 10)
                    existingEventsByDate.set(dateKey, evt.event)
                }
            })
        }

        const datePattern = /^\d{4}-\d{2}-\d{2}$/
        const validRecords = parsedData.history.records.filter((record) => {
            const date = record.date?.trim()
            return date && datePattern.test(date)
        })

        const events = validRecords
            .map((record) => {
                const recordDate = record.date?.trim()
                const existingEventId = existingEventsByDate.get(recordDate)
                if (existingEventId) return null
                return mapHistoryRecordToEvent(record, trackedEntity, enrollment, orgUnit)
            })
            .filter(Boolean)

        if (events.length === 0) {
            if (validRecords.length > 0) {
                setCreateError(i18n.t('All history records already exist in DHIS2. No new events to create.'))
            } else {
                setCreateError(i18n.t('No valid history records with dates found to create events.'))
            }
            return
        }

        setCreateLoading(true)
        try {
            const mutation = {
                resource: 'tracker',
                type: 'create',
                params: { async: false },
                data: { events },
            }
            const result = await engine.mutate(mutation)
            setCreateResult(result)
        } catch (err) {
            // eslint-disable-next-line no-console
            console.error('DHIS2 create events failed', err)
            setCreateError(i18n.t('DHIS2 create/update events failed: {{message}}', { message: err.message, nsSeparator: false }))
        } finally {
            setCreateLoading(false)
        }
    }

    useEffect(() => {
        if (resultScrollRef.current) {
            resultScrollRef.current.scrollTop = resultScrollRef.current.scrollHeight
        }
    }, [lookupResult, eventsResult, createResult, lookupError, eventsError, createError])

    const teiSummaryRows = useMemo(() => {
        if (!lookupResult?.entities?.length) return null
        const tei = lookupResult.entities[0]
        const attributes = Array.isArray(tei.attributes) ? tei.attributes : []
        const byName = (needle) =>
            attributes.find((attr) => attr.displayName === needle || attr.displayName?.toLowerCase().includes(needle.toLowerCase()))

        const manufacturer = byName('Appliance Manufacturer')
        const manufacturerSerial = byName('Appliance Manufacturer Serial Number')
        const model = byName('Appliance Model')

        return { manufacturer, manufacturerSerial, model }
    }, [lookupResult])

    const busy = lookupLoading || eventsLoading || createLoading

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                <h2 style={{ margin: 0, fontSize: '16px' }}>{i18n.t('DHIS2 Actions')}</h2>
                <ButtonStrip>
                    <Button onClick={handleLookupInDhis2} disabled={busy}>
                        {lookupLoading ? i18n.t('Looking up...') : i18n.t('Find Device in DHIS2')}
                    </Button>
                    <Button onClick={handleGetEvents} disabled={busy}>
                        {eventsLoading ? i18n.t('Loading events...') : i18n.t('Show existing data')}
                    </Button>
                    <Button primary onClick={handleCreateEvents} disabled={busy}>
                        {createLoading ? i18n.t('Creating/updating...') : i18n.t('Update data')}
                    </Button>
                </ButtonStrip>
            </div>

            {lookupError ? <NoticeBox error>{lookupError}</NoticeBox> : null}
            {eventsError ? <NoticeBox error>{eventsError}</NoticeBox> : null}
            {createError ? <NoticeBox error>{createError}</NoticeBox> : null}

            <div ref={resultScrollRef} style={{ maxHeight: 420, overflow: 'auto' }}>
                {lookupResult ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {lookupResult.entities.length === 0 ? (
                            <NoticeBox warning>{i18n.t('No tracked entities found')}</NoticeBox>
                        ) : (
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
                        )}
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

                {!lookupError && !lookupResult && !eventsError && !eventsResult && !createError && !createResult ? (
                    <div style={{ color: 'var(--colors-grey700)', fontSize: '14px' }}>{i18n.t('Run a DHIS2 action to see results here.')}</div>
                ) : null}
            </div>
        </div>
    )
}

export default Dhis2Actions

