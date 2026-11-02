import type React from 'react'
import { CoasterIcon, type CoasterIconProps } from './CoasterIcon'

/** Upload: an arrow rising out of a tray (a supplier uploads a ride design). */
export function UploadIcon (props: CoasterIconProps): React.JSX.Element {
  return (
    <CoasterIcon { ...props }>
      <path d="M12 15V4M7 9l5-5 5 5" />
      <path d="M4 15v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4" />
    </CoasterIcon>
  )
}
