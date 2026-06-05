import i18n from '@dhis2/d2-i18n'
import React, { useMemo } from 'react'
import { Card, CircularLoader, NoticeBox, SwitchField } from '@dhis2/ui'
import { APP_SETTINGS_DATA_STORE_KEY } from '../config/appSettingsDefaults'
import { DATA_STORE_NAMESPACE } from '../config/importSettingsDataStore'
import { useAppSettings } from '../context/AppSettingsContext'
import classes from '../App.module.css'

const GeneralSettingsPage = () => {
    const {
        parserDebug,
        showDownloadJson,
        showViewParsedData,
        setParserDebug,
        setShowDownloadJson,
        setShowViewParsedData,
        settingsLoading,
        settingsSaving,
        storageSource,
        storageWarning,
    } = useAppSettings()

    const storageInfoMessage = useMemo(() => {
        if (storageSource === 'dataStore') {
            return i18n.t(
                'Settings are saved in the DHIS2 data store ({{namespace}}/{{key}}) and shared by all users on this instance.',
                {
                    namespace: DATA_STORE_NAMESPACE,
                    key: APP_SETTINGS_DATA_STORE_KEY,
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
                key: APP_SETTINGS_DATA_STORE_KEY,
                nsSeparator: false,
            }
        )
    }, [storageSource])

    return (
        <div className={classes.page}>
            <h1 className={classes.pageTitle}>{i18n.t('General')}</h1>
            <p className={classes.pageDescription}>
                {i18n.t('General app settings and Data Import options.')}
            </p>

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

            <Card className={classes.settingsCard}>
                <div className={classes.cardBody}>
                    <h2 className={classes.sectionTitle}>{i18n.t('Debugging')}</h2>
                    <p className={classes.helpText}>
                        {storageInfoMessage}
                        {settingsSaving ? ` ${i18n.t('Saving…')}` : ''}
                    </p>

                    {settingsLoading ? (
                        <div className={classes.settingsLoader}>
                            <CircularLoader />
                        </div>
                    ) : (
                        <div className={classes.settingsFields}>
                            <SwitchField
                                label={i18n.t('Parser debug logging')}
                                helpText={i18n.t(
                                    'When enabled, detailed parser steps are written to the browser console while importing a file (open Developer Tools → Console).'
                                )}
                                checked={parserDebug}
                                onChange={({ checked }) => setParserDebug(checked)}
                                disabled={settingsLoading || settingsSaving}
                            />
                        </div>
                    )}
                </div>
            </Card>

            <Card className={classes.settingsCard}>
                <div className={classes.cardBody}>
                    <h2 className={classes.sectionTitle}>{i18n.t('Data Import')}</h2>
                    <p className={classes.helpText}>
                        {i18n.t(
                            'Control which optional actions appear on the Data Import page after a file is parsed.'
                        )}
                    </p>

                    {settingsLoading ? (
                        <div className={classes.settingsLoader}>
                            <CircularLoader />
                        </div>
                    ) : (
                        <div className={classes.settingsFields}>
                            <SwitchField
                                label={i18n.t('Download JSON')}
                                helpText={i18n.t(
                                    'Show the Download JSON button on the Data Import page.'
                                )}
                                checked={showDownloadJson}
                                onChange={({ checked }) => setShowDownloadJson(checked)}
                                disabled={settingsLoading || settingsSaving}
                            />
                            <SwitchField
                                label={i18n.t('View Parsed Data')}
                                helpText={i18n.t(
                                    'Show the expandable View Parsed Data panel on the Data Import page.'
                                )}
                                checked={showViewParsedData}
                                onChange={({ checked }) => setShowViewParsedData(checked)}
                                disabled={settingsLoading || settingsSaving}
                            />
                        </div>
                    )}
                </div>
            </Card>
        </div>
    )
}

export default GeneralSettingsPage
