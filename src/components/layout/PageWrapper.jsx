import React from 'react'
import { useMatches } from 'react-router-dom'

export const defaultMaxWidth = '1400px'

const baseStyle = {
    maxInlineSize: defaultMaxWidth,
    marginInlineStart: 'auto',
    marginInlineEnd: 'auto',
    padding: '20px 16px',
    inlineSize: '100%',
    boxSizing: 'border-box',
}

export const PageWrapper = ({ children, maxWidth }) => {
    const fullWidthRoute = useMatches().some((match) => !!match.handle?.fullWidth)

    return (
        <div
            style={{
                ...baseStyle,
                maxInlineSize: fullWidthRoute ? 'none' : maxWidth || defaultMaxWidth,
            }}
        >
            {children}
        </div>
    )
}
