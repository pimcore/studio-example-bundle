import type React from 'react'
import { CoasterIcon, type CoasterIconProps } from './CoasterIcon'

/** Approve: a tick in a circle (a reviewer accepts the change). */
export function ApproveIcon (props: CoasterIconProps): React.JSX.Element {
  return (
    <CoasterIcon { ...props }>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.5l2.5 2.5L16 9.5" />
    </CoasterIcon>
  )
}
