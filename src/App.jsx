import React from 'react'
import { createHashRouter, Outlet, RouterProvider } from 'react-router-dom'
import { CssReset, CssVariables } from '@dhis2/ui'
import { Layout } from './components/layout/Layout'
import { PageWrapper } from './components/layout/PageWrapper'
import DataImportPage from './pages/DataImportPage'
import SettingsPage from './pages/SettingsPage'
import { ImportConfigProvider } from './context/ImportConfigContext'
import { SyncUrlWithGlobalShell } from './utils/SyncUrlWithGlobalShell'
// './locales' will be populated after running start or build scripts
import './locales'

const router = createHashRouter([
    {
        element: <SyncUrlWithGlobalShell />,
        children: [
            {
                element: <Layout />,
                children: [
                    {
                        element: (
                            <PageWrapper>
                                <Outlet />
                            </PageWrapper>
                        ),
                        children: [
                            {
                                path: '/',
                                element: <DataImportPage />,
                            },
                            {
                                path: '/settings',
                                element: <SettingsPage />,
                            },
                        ],
                    },
                ],
            },
        ],
    },
])

const App = () => (
    <>
        <CssReset />
        <CssVariables theme spacers colors elevations />
        <ImportConfigProvider>
            <RouterProvider router={router} />
        </ImportConfigProvider>
    </>
)

export default App
