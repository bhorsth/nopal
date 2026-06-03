import React from 'react'
import { Outlet, useMatches } from 'react-router-dom'
import { Sidebar } from '../sidebar/Sidebar'
import styles from './Layout.module.css'

export const Layout = () => {
    const collapseSidebar = useMatches().some((match) => match.handle?.collapseSidebar)

    return (
        <div className={styles.wrapper}>
            <Sidebar className={styles.sidebar} hideSidebar={collapseSidebar} />
            <main className={styles.main}>
                <Outlet />
            </main>
        </div>
    )
}
