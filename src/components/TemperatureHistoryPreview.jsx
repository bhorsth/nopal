import React from 'react'
import i18n from '@dhis2/d2-i18n'
import { Table, TableBody, TableCell, TableCellHead, TableHead, TableRow, TableRowHead } from '@dhis2/ui'
import classes from '../App.module.css'

const formatDate = (dateStr) => {
    if (!dateStr) return ''
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        const [year, month, day] = dateStr.split('-')
        return `${day}.${month}.${year}`
    }
    return dateStr
}

const TemperatureHistoryPreview = ({ history, config, historyMetadata, isOpen }) => {
    const formatAlarmStatus = (alarm) => alarm?.status || 'ok'

    return (
        <div>
            <details open={isOpen}>
                <summary style={{ cursor: 'pointer' }}>
                    <strong>{i18n.t('Data Logger Temperature History Preview')}</strong>
                </summary>

                <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', color: 'var(--colors-grey900)' }}>
                        <div>
                            <strong>{i18n.t('Identification number')}:</strong> {config?.serial || ''}
                        </div>
                        <div>
                            <strong>{i18n.t('Date and time of report creation')}:</strong> {historyMetadata?.reportCreationTimestamp || ''}
                        </div>
                        <div>
                            <strong>{i18n.t('Activation date')}:</strong> {historyMetadata?.activationTimestamp || ''}
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', color: 'var(--colors-grey900)' }}>
                        <div>
                            <strong>{i18n.t('Lower alarm limit')}:</strong> {i18n.t('Below -0.5°C for 1h')}
                        </div>
                        <div>
                            <strong>{i18n.t('Upper alarm limit')}:</strong> {i18n.t('Above +8.0°C for 10h')}
                        </div>
                    </div>

                    <div className={classes.tableWrap}>
                        <Table>
                            <TableHead>
                                <TableRowHead>
                                    <TableCellHead dense>{i18n.t('No.')}</TableCellHead>
                                    <TableCellHead dense>
                                        {i18n.t('Date')}
                                        <br />
                                        (dd.MM.yyyy)
                                    </TableCellHead>
                                    <TableCellHead dense>{i18n.t('Events')}</TableCellHead>
                                    <TableCellHead dense>
                                        {i18n.t('Average')}
                                        <br />
                                        temp. (°C)
                                    </TableCellHead>
                                    <TableCellHead dense colSpan="4">
                                        {i18n.t('Lower alarm limit')}
                                    </TableCellHead>
                                    <TableCellHead dense colSpan="4">
                                        {i18n.t('Upper alarm limit')}
                                    </TableCellHead>
                                    <TableCellHead dense>
                                        {i18n.t('Signature /')}
                                        <br />
                                        {i18n.t('notes')}
                                    </TableCellHead>
                                </TableRowHead>
                                <TableRowHead>
                                    <TableCellHead dense colSpan="4" />
                                    <TableCellHead dense>{i18n.t('Status')}</TableCellHead>
                                    <TableCellHead dense>
                                        {i18n.t('Min. temp')}
                                        <br />
                                        (°C)
                                    </TableCellHead>
                                    <TableCellHead dense>
                                        {i18n.t('Cumulative')}
                                        <br />
                                        {i18n.t('daily time (min)')}
                                    </TableCellHead>
                                    <TableCellHead dense>{i18n.t('Alarm trigger time')}</TableCellHead>
                                    <TableCellHead dense>{i18n.t('Status')}</TableCellHead>
                                    <TableCellHead dense>
                                        {i18n.t('Max. temp')}
                                        <br />
                                        (°C)
                                    </TableCellHead>
                                    <TableCellHead dense>
                                        {i18n.t('Cumulative')}
                                        <br />
                                        {i18n.t('daily time (min)')}
                                    </TableCellHead>
                                    <TableCellHead dense>{i18n.t('Alarm trigger time')}</TableCellHead>
                                    <TableCellHead dense />
                                </TableRowHead>
                            </TableHead>
                            <TableBody>
                                {history.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan="13" dense>
                                            {i18n.t('No history records available')}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    history.map((rec, idx) => {
                                        const coldAlarm = rec.alarms?.find((a) => a.level === 0)
                                        const hotAlarm = rec.alarms?.find((a) => a.level === 1)

                                        return (
                                            <TableRow key={idx}>
                                                <TableCell dense>{idx + 1}</TableCell>
                                                <TableCell dense>{formatDate(rec.date)}</TableCell>
                                                <TableCell dense>{rec.temperature?.minTime || rec.temperature?.maxTime || ''}</TableCell>
                                                <TableCell dense>{rec.temperature?.avg ?? ''}</TableCell>

                                                <TableCell dense>{formatAlarmStatus(coldAlarm)}</TableCell>
                                                <TableCell dense>{rec.temperature?.min ?? ''}</TableCell>
                                                <TableCell dense>
                                                    {coldAlarm?.accumulatedMinutes && coldAlarm.accumulatedMinutes > 0
                                                        ? coldAlarm.accumulatedMinutes
                                                        : ''}
                                                </TableCell>
                                                <TableCell dense>{coldAlarm?.triggerTime || ''}</TableCell>

                                                <TableCell dense>{formatAlarmStatus(hotAlarm)}</TableCell>
                                                <TableCell dense>{rec.temperature?.max ?? ''}</TableCell>
                                                <TableCell dense>
                                                    {hotAlarm?.accumulatedMinutes && hotAlarm.accumulatedMinutes > 0
                                                        ? hotAlarm.accumulatedMinutes
                                                        : ''}
                                                </TableCell>
                                                <TableCell dense>{hotAlarm?.triggerTime || ''}</TableCell>

                                                <TableCell dense />
                                            </TableRow>
                                        )
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </details>
        </div>
    )
}

export default TemperatureHistoryPreview

