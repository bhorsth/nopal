import React, { useMemo } from 'react'
import i18n from '@dhis2/d2-i18n'
import {
    Table,
    TableBody,
    TableCell,
    TableCellHead,
    TableHead,
    TableRow,
    TableRowHead,
} from '@dhis2/ui'
import { EMS_FIELD_MAPPING_FIELDS } from '../config/emsFieldMappingDefinitions'
import { aggregateEmsRecordsByDay } from '../utils/aggregateEmsRecordsDaily'
import { formatEmsValue } from '../utils/emsValue'
import classes from '../App.module.css'

const EMS_FIELD_LABELS = Object.fromEntries(
    EMS_FIELD_MAPPING_FIELDS.map((field) => [field.key, field.label])
)

const PREVIEW_RECORD_LIMIT = 60

const formatDate = (dateStr) => {
    if (!dateStr) return ''
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        const [year, month, day] = dateStr.split('-')
        return `${day}.${month}.${year}`
    }
    return dateStr
}

const EmsDataPreview = ({ parsedData, isOpen }) => {
    const records = parsedData?.records ?? []
    const metadata = parsedData?.metadata ?? {}
    const serial = parsedData?.config?.serial

    const dailyRecords = useMemo(() => aggregateEmsRecordsByDay(records), [records])

    const previewColumns = useMemo(() => {
        const keys = new Set()
        dailyRecords.forEach((dailyRecord) => {
            Object.entries(dailyRecord.fields).forEach(([key, value]) => {
                if (formatEmsValue(value) != null && EMS_FIELD_LABELS[key]) {
                    keys.add(key)
                }
            })
        })
        return [...keys].sort()
    }, [dailyRecords])

    const metadataEntries = useMemo(() => {
        return EMS_FIELD_MAPPING_FIELDS.filter(
            (field) => field.kind === 'attribute' && formatEmsValue(metadata[field.key]) != null
        ).map((field) => ({
            key: field.key,
            label: field.label(),
            value: formatEmsValue(metadata[field.key]),
        }))
    }, [metadata])

    const previewRecords = dailyRecords.slice(0, PREVIEW_RECORD_LIMIT)

    return (
        <div>
            <details open={isOpen}>
                <summary style={{ cursor: 'pointer' }}>
                    <strong>{i18n.t('EMS Device Data Preview')}</strong>
                </summary>

                <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', color: 'var(--colors-grey900)' }}>
                        <div>
                            <strong>{i18n.t('Logger serial number')}:</strong> {serial || ''}
                        </div>
                        <div>
                            <strong>{i18n.t('Interval readings')}:</strong> {records.length}
                        </div>
                        <div>
                            <strong>{i18n.t('Daily records')}:</strong> {dailyRecords.length}
                        </div>
                    </div>

                    {metadataEntries.length > 0 ? (
                        <div className={classes.tableWrap}>
                            <Table>
                                <TableHead>
                                    <TableRowHead>
                                        <TableCellHead dense>{i18n.t('Device metadata')}</TableCellHead>
                                        <TableCellHead dense>{i18n.t('Value')}</TableCellHead>
                                    </TableRowHead>
                                </TableHead>
                                <TableBody>
                                    {metadataEntries.map((entry) => (
                                        <TableRow key={entry.key}>
                                            <TableCell dense>{entry.label}</TableCell>
                                            <TableCell dense>{entry.value}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    ) : null}

                    {previewColumns.length === 0 ? (
                        <div>{i18n.t('No measurement records available in this file.')}</div>
                    ) : (
                        <div className={classes.tableWrap}>
                            <Table>
                                <TableHead>
                                    <TableRowHead>
                                        <TableCellHead dense>{i18n.t('Date')}</TableCellHead>
                                        {previewColumns.map((key) => (
                                            <TableCellHead dense key={key}>
                                                {EMS_FIELD_LABELS[key]?.() || key}
                                            </TableCellHead>
                                        ))}
                                    </TableRowHead>
                                </TableHead>
                                <TableBody>
                                    {previewRecords.map((dailyRecord) => (
                                        <TableRow key={dailyRecord.date}>
                                            <TableCell dense>{formatDate(dailyRecord.date)}</TableCell>
                                            {previewColumns.map((key) => (
                                                <TableCell dense key={key}>
                                                    {formatEmsValue(dailyRecord.fields[key]) ?? ''}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            {dailyRecords.length > PREVIEW_RECORD_LIMIT ? (
                                <div style={{ marginTop: '8px', color: 'var(--colors-grey700)' }}>
                                    {i18n.t('Showing {{count}} of {{total}} daily records', {
                                        count: PREVIEW_RECORD_LIMIT,
                                        total: dailyRecords.length,
                                        nsSeparator: false,
                                    })}
                                </div>
                            ) : null}
                        </div>
                    )}
                </div>
            </details>
        </div>
    )
}

export default EmsDataPreview
