import React, { useMemo, useState } from 'react'
import i18n from '@dhis2/d2-i18n'
import { Button, ButtonStrip, FileInputField, NoticeBox } from '@dhis2/ui'
import { FridgeTagParser, toJson } from '../utils/fridgeTagParser'
import classes from '../App.module.css'
import TemperatureHistoryPreview from './TemperatureHistoryPreview'
import Dhis2Actions from './Dhis2Actions'

const FileUploader = () => {
    const [selectedFile, setSelectedFile] = useState(null)
    const [uploadStatus, setUploadStatus] = useState({ kind: null, text: '' })
    const [parsedData, setParsedData] = useState(null)
    const [historyPreviewOpen, setHistoryPreviewOpen] = useState(false)

    const parseFile = async (file) => {
        if (!file) {
            setUploadStatus({ kind: 'error', text: i18n.t('Please select a file to upload.') })
            return
        }

        setUploadStatus({ kind: null, text: i18n.t('Parsing…') })

        try {
            const fileContent = await file.text()
            const parser = new FridgeTagParser()
            const rawData = parser.parseText(fileContent)

            const outputData = toJson(rawData)
            setParsedData(outputData)
            setHistoryPreviewOpen(true)

            setUploadStatus({ kind: 'valid', text: i18n.t('Successful!') })
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error(error)
            setUploadStatus({ kind: 'error', text: i18n.t('An error occurred during parsing.') })
        }
    }

    const handleFileChange = async ({ files }) => {
        const file = files?.length > 0 ? files[0] : null
        setSelectedFile(file || null)
        setUploadStatus(
            file
                ? {
                      kind: 'valid',
                      text: `${i18n.t('Selected file')}: ${file.name}`,
                  }
                : { kind: 'error', text: i18n.t('No file selected. Please try again.') }
        )
        setParsedData(null)
        setHistoryPreviewOpen(false)

        if (file) {
            await parseFile(file)
        }
    }

    const handleParse = async () => {
        await parseFile(selectedFile)
    }

    const downloadJSON = () => {
        if (!parsedData) return
        const dataStr = JSON.stringify(parsedData, null, 2)
        const dataBlob = new Blob([dataStr], { type: 'application/json' })
        const url = URL.createObjectURL(dataBlob)
        const link = document.createElement('a')
        link.href = url
        link.download = `fridge-tag-${new Date().toISOString().split('T')[0]}.json`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
    }

    const history = useMemo(() => parsedData?.history?.records ?? [], [parsedData])
    const config = parsedData?.config
    const historyMetadata = useMemo(
        () => ({
            activationTimestamp: parsedData?.history?.activationTimestamp,
            reportCreationTimestamp: parsedData?.history?.reportCreationTimestamp,
        }),
        [parsedData]
    )

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
                <h2 style={{ margin: 0, fontSize: '16px' }}>{i18n.t('Import Data Logger File')}</h2>
            </div>

            <div className={classes.buttonRow}>
                <FileInputField
                    accept=".txt,.TXT,text/plain"
                    buttonLabel={i18n.t('Choose file')}
                    name="fridgeTagFile"
                    onChange={handleFileChange}
                    helpText={i18n.t('Choose a Fridge-tag export file (.txt)')}
                />
            </div>

            <ButtonStrip>
                <Button primary onClick={handleParse} disabled={!selectedFile}>
                    {i18n.t('Parse again')}
                </Button>
                <Button onClick={downloadJSON} disabled={!parsedData}>
                    {i18n.t('Download JSON')}
                </Button>
            </ButtonStrip>

            {uploadStatus.text ? (
                <NoticeBox error={uploadStatus.kind === 'error'} valid={uploadStatus.kind === 'valid'}>
                    {uploadStatus.text}
                </NoticeBox>
            ) : null}

            {parsedData ? (
                <details>
                    <summary>{i18n.t('View Parsed Data')}</summary>
                    <pre className={classes.monospacePre}>{JSON.stringify(parsedData, null, 2)}</pre>
                </details>
            ) : null}

            {parsedData ? <Dhis2Actions parsedData={parsedData} /> : null}

            {parsedData ? (
                <TemperatureHistoryPreview
                    history={history}
                    config={config}
                    historyMetadata={historyMetadata}
                    isOpen={historyPreviewOpen}
                />
            ) : null}
        </div>
    )
}

export default FileUploader

