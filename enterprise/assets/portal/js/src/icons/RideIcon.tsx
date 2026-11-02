import type React from 'react'
import { CoasterIcon, type CoasterIconProps } from './CoasterIcon'

/** Ride: a track running into a loop and out again (the stage's Ride view, the coaster tile). */
export function RideIcon (props: CoasterIconProps): React.JSX.Element {
  return (
    <CoasterIcon { ...props }>
      <path d="M2 20h7c4 0 7-3 7-7a4 4 0 0 0-8 0c0 4 3 7 7 7h7" />
    </CoasterIcon>
  )
}
