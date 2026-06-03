import i18n from '@dhis2/d2-i18n'
import { IconChevronLeft24 } from '@dhis2/ui'
import cx from 'classnames'
import React, { useState } from 'react'
import { NavLink } from 'react-router-dom'
import styles from './Sidebar.module.css'
import { Sidenav, SidenavItems, SidenavLink } from '../sidenav/Sidenav'

const SidebarNavLink = ({ to, label, end }) => (
    <SidenavLink to={to} label={label} end={end} LinkComponent={NavLink} />
)

export const Sidebar = ({ className, hideSidebar }) => {
    const [collapsed, setCollapsed] = useState(false)
    const isCollapsed = collapsed || hideSidebar

    return (
        <aside className={cx(styles.asideWrapper, className, { [styles.collapsed]: isCollapsed })}>
            <Sidenav>
                <SidenavItems className={styles.navItems}>
                    <SidebarNavLink to="/" label={i18n.t('Data Import')} end />
                    <SidebarNavLink to="/settings" label={i18n.t('Settings')} />
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
