import React, { type ReactElement } from 'react'
import { type AbstractGridCellDefinition } from '@pimcore/studio-ui-bundle/modules/element'

export const ProgressBarCell = (props: AbstractGridCellDefinition): ReactElement => {
  const raw = Number(props.getValue())
  const value = isNaN(raw) ? 0 : raw
  const clampedValue = Math.min(100, Math.max(0, value))

  const getColor = (val: number): string => {
    if (val < 30) return '#f5222d'
    if (val <= 70) return '#faad14'
    return '#52c41a'
  }

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    padding: '0 8px'
  }

  const trackStyle: React.CSSProperties = {
    flex: 1,
    height: 16,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    overflow: 'hidden'
  }

  const fillStyle: React.CSSProperties = {
    width: `${clampedValue}%`,
    height: '100%',
    backgroundColor: getColor(clampedValue),
    borderRadius: 4,
    transition: 'width 0.3s ease'
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 12,
    whiteSpace: 'nowrap',
    minWidth: 36,
    textAlign: 'right'
  }

  return (
    <div style={ containerStyle }>
      <div style={ trackStyle }>
        <div style={ fillStyle } />
      </div>
      <span style={ labelStyle }>{ clampedValue }%</span>
    </div>
  )
}
