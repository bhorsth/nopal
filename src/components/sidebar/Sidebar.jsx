import i18n from '@dhis2/d2-i18n'
import { IconChevronLeft24 } from '@dhis2/ui'
import cx from 'classnames'
import React, { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import styles from './Sidebar.module.css'
import { Sidenav, SidenavItems, SidenavLink, SidenavParent } from '../sidenav/Sidenav'

const SidebarNavLink = ({ to, label, end }) => (
    <SidenavLink to={to} label={label} end={end} LinkComponent={NavLink} />
)

export const Sidebar = ({ className, hideSidebar }) => {
    const location = useLocation()
    const onSettingsRoute = location.pathname.startsWith('/settings')
    const [settingsOpen, setSettingsOpen] = useState(onSettingsRoute)
    const [collapsed, setCollapsed] = useState(false)
    const isCollapsed = collapsed || hideSidebar

    const isSettingsExpanded = settingsOpen || onSettingsRoute

    return (
        <aside className={cx(styles.asideWrapper, className, { [styles.collapsed]: isCollapsed })}>
            <Sidenav>
                <SidenavItems className={styles.navItems}>
                    <SidebarNavLink to="/" label={i18n.t('Data Import')} end />
                    <SidenavParent
                        label={i18n.t('Settings')}
                        open={isSettingsExpanded}
                        onClick={() => setSettingsOpen(!isSettingsExpanded)}
                    >
                        <SidebarNavLink to="/settings/general" label={i18n.t('General')} />
                        <SidebarNavLink to="/settings/ems" label={i18n.t('EMS')} />
                        <SidebarNavLink to="/settings/fridge-tag" label={i18n.t('Fridge-tag')} />
                    </SidenavParent>
                </SidenavItems>
            </Sidenav>
            <button
                className={styles.collapseButton}
                type="button"
                aria-label={i18n.t('Toggle navigation')}
                onClick={() => setCollapsed(!collapsed)}
            >
                <div className={cx(styles.iconWrapper, { [styles.collapsed]: isCollapsed })}>
                    <IconChevronLeft24 />
                </div>
            </button>
        </aside>
    )
}
