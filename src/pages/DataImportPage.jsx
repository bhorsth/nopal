import i18n from '@dhis2/d2-i18n'
import React from 'react'
import { Card } from '@dhis2/ui'
import FileUploader from '../components/FileUploader'
import classes from '../App.module.css'

const DataImportPage = () => {
    return (
        <div className={classes.page}>
            <h1 className={classes.pageTitle}>{i18n.t('Data Import')}</h1>
            <p className={classes.pageDescription}>
                {i18n.t(
                    'Import from your temperature data logger or EMS appliance and sync with the system.'
                )}
            </p>
            <Card>
                <div className={classes.cardBody}>
                    <FileUploader />
                </div>
            </Card>
        </div>
    )
}

export default DataImportPage
