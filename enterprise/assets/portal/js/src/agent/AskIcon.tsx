import type React from 'react'
import { CoasterIcon, type CoasterIconProps } from '../icons/CoasterIcon'

/**
 * Ask: a speech bubble with a question mark (the header button "Ask the brief", AskBriefButton.tsx). It lives here,
 * not in ../icons/: that folder is the coaster set, of which only the Talk entry's icon is in the start-up chunk.
 */
export function AskIcon (props: CoasterIconProps): React.JSX.Element {
  return (
    <CoasterIcon { ...props }>
      <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v9a1.5 1.5 0 0 1-1.5 1.5H10l-4.5 4v-4h0A1.5 1.5 0 0 1 4 14.5z" />
      <path d="M10 8.25a2 2 0 1 1 2.75 1.85c-.45.2-.75.62-.75 1.1v.3" />
      <path d="M12 13.75h.01" />
    </CoasterIcon>
  )
}
