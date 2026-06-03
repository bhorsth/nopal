import React from 'react'
import { IconChevronDown16 } from '@dhis2/ui'
import cx from 'classnames'
import styles from './Sidenav.module.css'

export const Sidenav = ({ children, className }) => (
    <nav className={cx(styles.sidenavWrap, className)}>{children}</nav>
)

export const SidenavItems = ({ children, className }) => (
    <ul className={cx(styles.sidenavItems, className)}>{children}</ul>
)

export const SidenavFooter = ({ children }) => <div className={styles.sidenavFooter}>{children}</div>

export const SidenavParent = ({ label, open, onClick, children }) => (
    <li className={cx(styles.sidenavParent, { [styles.parentIsOpen]: open })}>
        <button type="button" onClick={onClick}>
            <span>{label}</span>
            <span className={styles.sidenavParentChevron}>
                <IconChevronDown16 />
            </span>
        </button>
        {open && <ul className={styles.sidenavSubmenu}>{children}</ul>}
    </li>
)

export const SidenavLink = ({ to, label, end, disabled, LinkComponent }) => (
    <li className={cx(styles.sidenavLink, { [styles.sidenavLinkDisabled]: disabled })}>
        {LinkComponent ? (
            <LinkComponent to={to} end={end}>
                {label}
            </LinkComponent>
        ) : (
            <a href={to}>{label}</a>
        )}
    </li>
)
