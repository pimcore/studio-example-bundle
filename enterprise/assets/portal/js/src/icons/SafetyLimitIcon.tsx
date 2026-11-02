import type React from 'react'
import { CoasterIcon, type CoasterIconProps } from './CoasterIcon'

/** Safety limit: a shield with an exclamation mark (a design over a safety limit). */
export function SafetyLimitIcon (props: CoasterIconProps): React.JSX.Element {
  return (
    <CoasterIcon { ...props }>
      <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />
      <path d="M12 8v5M12 16.5v.01" />
    </CoasterIcon>
  )
}
