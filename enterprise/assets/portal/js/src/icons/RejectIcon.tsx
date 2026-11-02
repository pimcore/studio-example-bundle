import type React from 'react'
import { CoasterIcon, type CoasterIconProps } from './CoasterIcon'

/** Reject: a cross in a circle (a reviewer sends the change back). */
export function RejectIcon (props: CoasterIconProps): React.JSX.Element {
  return (
    <CoasterIcon { ...props }>
      <circle cx="12" cy="12" r="9" />
      <path d="M9 9l6 6M15 9l-6 6" />
    </CoasterIcon>
  )
}
