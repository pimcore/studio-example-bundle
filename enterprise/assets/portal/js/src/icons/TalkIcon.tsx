import type React from 'react'
import { CoasterIcon, type CoasterIconProps } from './CoasterIcon'

/** Talk: a presentation screen on its stand (the portal page "Talk" in the navigation rail). */
export function TalkIcon (props: CoasterIconProps): React.JSX.Element {
  return (
    <CoasterIcon { ...props }>
      <rect x="3" y="4" width="18" height="12" rx="1.5" />
      <path d="M12 16v4M8 20h8" />
    </CoasterIcon>
  )
}
