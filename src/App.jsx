import React from 'react'
import { createHashRouter, Navigate, Outlet, RouterProvider } from 'react-router-dom'
import { CssReset, CssVariables } from '@dhis2/ui'
import { Layout } from './components/layout/Layout'
import { PageWrapper } from './components/layout/PageWrapper'
import DataImportPage from './pages/DataImportPage'
import EmsSettingsPage from './pages/EmsSettingsPage'
import GeneralSettingsPage from './pages/GeneralSettingsPage'
import FridgeTagSettingsPage from './pages/FridgeTagSettingsPage'
import { AppSettingsProvider } from './context/AppSettingsContext'
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
                                element: <Navigate to="/settings/fridge-tag" replace />,
                            },
                            {
                                path: '/settings/fridge-tag',
                                element: <FridgeTagSettingsPage />,
                            },
                            {
                                path: '/settings/ems',
                                element: <EmsSettingsPage />,
                            },
                            {
                                path: '/settings/general',
                                element: <GeneralSettingsPage />,
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
            <AppSettingsProvider>
                <RouterProvider router={router} />
            </AppSettingsProvider>
        </ImportConfigProvider>
    </>
)

export default App
