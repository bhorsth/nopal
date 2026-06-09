import React, { useMemo, useState } from 'react'
import i18n from '@dhis2/d2-i18n'
import { Button, ButtonStrip, FileInput, NoticeBox, Tag } from '@dhis2/ui'
import classes from '../App.module.css'
import { useAppSettings } from '../context/AppSettingsContext'
import { parseImportFile } from '../utils/parseImportFile'
import TemperatureHistoryPreview from './TemperatureHistoryPreview'
import EmsDataPreview from './EmsDataPreview'
import Dhis2Actions from './Dhis2Actions'
import EmsDhis2Actions from './EmsDhis2Actions'

const FileUploader = () => {
    const { showDownloadJson, showViewParsedData } = useAppSettings()
    const [uploadStatus, setUploadStatus] = useState({ kind: null, text: '' })
    const [parsedData, setParsedData] = useState(null)
    const [deviceType, setDeviceType] = useState(null)
    const [historyPreviewOpen, setHistoryPreviewOpen] = useState(false)
    const [selectedFileName, setSelectedFileName] = useState(null)
    const [fileInputKey, setFileInputKey] = useState(0)

    const parseFile = async (file) => {
        if (!file) {
            setUploadStatus({ kind: 'error', text: i18n.t('Please select a file to upload.') })
            return
        }

        setUploadStatus({ kind: null, text: i18n.t('Parsing…') })

        try {
            const outputData = await parseImportFile(file)
            setDeviceType(outputData.deviceType)
            setParsedData(outputData)
            setHistoryPreviewOpen(true)

            const deviceLabel =
                outputData.deviceType === 'ems' ? i18n.t('EMS device') : i18n.t('Fridge-tag')
            setUploadStatus({
                kind: 'valid',
                text: i18n.t('{{deviceType}} file parsed successfully.', {
                    deviceType: deviceLabel,
                    nsSeparator: false,
                }),
            })
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error(error)
            const message =
                error.message === 'UNKNOWN_FORMAT' || error.message === 'UNKNOWN_JSON'
                    ? i18n.t('Unrecognized file format. Upload a Fridge-tag export or EMS JSON file.')
                    : error.message === 'INVALID_JSON'
                      ? i18n.t('The file contains invalid JSON.')
                      : i18n.t('An error occurred during parsing.')
            setDeviceType(null)
            setUploadStatus({ kind: 'error', text: message })
        }
    }

    const handleFileChange = async ({ files }) => {
        const file = files?.length > 0 ? files[0] : null
        if (!file) {
            return
        }

        setSelectedFileName(file.name)
        setParsedData(null)
        setDeviceType(null)
        setHistoryPreviewOpen(false)
        await parseFile(file)
    }

    const handleClear = () => {
        setSelectedFileName(null)
        setParsedData(null)
        setDeviceType(null)
        setHistoryPreviewOpen(false)
        setUploadStatus({ kind: null, text: '' })
        setFileInputKey((key) => key + 1)
    }

    const downloadJSON = () => {
        if (!parsedData) return
        const dataStr = JSON.stringify(parsedData, null, 2)
        const dataBlob = new Blob([dataStr], { type: 'application/json' })
        const url = URL.createObjectURL(dataBlob)
        const link = document.createElement('a')
        link.href = url
        const prefix = deviceType === 'ems' ? 'ems' : 'fridge-tag'
        link.download = `${prefix}-${new Date().toISOString().split('T')[0]}.json`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
    }

    const isFridgeTag = deviceType === 'fridgeTag'
    const isEms = deviceType === 'ems'

    const history = useMemo(
        () => (isFridgeTag ? parsedData?.history?.records ?? [] : []),
        [parsedData, isFridgeTag]
    )
    const config = isFridgeTag ? parsedData?.config : null
    const historyMetadata = useMemo(
        () =>
            isFridgeTag
                ? {
                      activationTimestamp: parsedData?.history?.activationTimestamp,
                      reportCreationTimestamp: parsedData?.history?.reportCreationTimestamp,
                  }
                : null,
        [parsedData, isFridgeTag]
    )

    const deviceTypeLabel = isEms ? i18n.t('EMS device') : isFridgeTag ? i18n.t('Fridge-tag') : null

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className={classes.buttonRow}>
                <FileInput
                    key={fileInputKey}
                    accept=".txt,.TXT,.json,.JSON,text/plain,application/json"
                    buttonLabel={i18n.t('Choose file')}
                    name="importFile"
                    onChange={handleFileChange}
                />
                <span className={classes.fileStatus}>
                    {selectedFileName ?? i18n.t('No file uploaded yet')}
                </span>
                {selectedFileName ? (
                    <Button secondary small onClick={handleClear}>
                        {i18n.t('Clear')}
                    </Button>
                ) : null}
            </div>

            {showDownloadJson ? (
                <ButtonStrip>
                    <Button onClick={downloadJSON} disabled={!parsedData}>
                        {i18n.t('Download JSON')}
                    </Button>
                </ButtonStrip>
            ) : null}

            {deviceTypeLabel ? <Tag>{deviceTypeLabel}</Tag> : null}

            {uploadStatus.text ? (
                <NoticeBox error={uploadStatus.kind === 'error'} valid={uploadStatus.kind === 'valid'}>
                    {uploadStatus.text}
                </NoticeBox>
            ) : null}

            {parsedData && showViewParsedData ? (
                <details>
                    <summary>{i18n.t('View Parsed Data')}</summary>
                    <pre className={classes.monospacePre}>{JSON.stringify(parsedData, null, 2)}</pre>
                </details>
            ) : null}

            {isFridgeTag && parsedData ? <Dhis2Actions parsedData={parsedData} /> : null}
            {isEms && parsedData ? <EmsDhis2Actions parsedData={parsedData} /> : null}

            {isFridgeTag && parsedData ? (
                <TemperatureHistoryPreview
                    history={history}
                    config={config}
                    historyMetadata={historyMetadata}
                    isOpen={historyPreviewOpen}
                />
            ) : null}

            {isEms && parsedData ? (
                <EmsDataPreview parsedData={parsedData} isOpen={historyPreviewOpen} />
            ) : null}
        </div>
    )
}

export default FileUploader

