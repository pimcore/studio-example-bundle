import type React from 'react'
import { CoasterIcon, type CoasterIconProps } from './CoasterIcon'

/** Review: an open eye (look at a design from all sides; the stage's Orbit view). */
export function ReviewIcon (props: CoasterIconProps): React.JSX.Element {
  return (
    <CoasterIcon { ...props }>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </CoasterIcon>
  )
}
