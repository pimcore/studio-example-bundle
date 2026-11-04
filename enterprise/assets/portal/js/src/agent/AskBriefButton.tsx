import React, { Suspense, lazy, useCallback, useRef, useState } from 'react'
import { config } from '@pimcore/portal-plugin-sdk'
import { AskIcon } from '../icons/AskIcon'
import { agentConfigOf } from './agent-config'

// The plugin id of src/Portal/StudioExampleEnterprisePortalPlugin.php, whose getFrontendConfig() hands over `agent`.
const PLUGIN_ID = 'studio-example-enterprise'

// The panel, the stream reader and the UI kit are a chunk of their own: plugin.tsx imports this file at the portal's
// start-up, so it holds the button only. The chunk is fetched on the first click (README.md, "Loaded on click").
const AskBriefPanel = lazy(async () => await import('./AskBriefPanel'))

// The header icons' glyph size (Search, Collections, Cart in layout/studio.html.twig).
const ICON_SIZE = 20

/**
 * The "Ask the brief" button in the portal header (slots.headerActions, on every signed-in page). It is shown only
 * when the server sent config().agent; a click opens the panel, closing it puts the focus back on the button.
 *
 * It is drawn as the portal draws its own header icons (`p-hdr-ic`, the tooltip from `data-tip`; the SDK's
 * components.HeaderAction renders the same markup), icon-only at every width: a text label breaks the header row.
 * Its own <button> rather than HeaderAction because the panel needs aria-haspopup, aria-expanded, a ref for the
 * focus and the data-agent-button hook, which HeaderAction does not pass through.
 */
export function AskBriefButton (): React.JSX.Element | null {
  const agent = agentConfigOf(config<unknown>(PLUGIN_ID))
  const [open, setOpen] = useState(false)
  const button = useRef<HTMLButtonElement>(null)
  const close = useCallback(() => {
    setOpen(false)
    button.current?.focus()
  }, [])
  if (agent === null) return null

  return (
    <>
      <button
        ref={ button }
        className="p-hdr-ic"
        type="button"
        data-agent-button
        data-tip={ agent.label }
        aria-label={ agent.label }
        aria-haspopup="dialog"
        aria-expanded={ open }
        onClick={ () => { setOpen(true) } }
      >
        <AskIcon size={ ICON_SIZE } />
      </button>
      { open && (
        <Suspense fallback={ null }>
          <AskBriefPanel agent={ agent } onClose={ close } />
        </Suspense>
      ) }
    </>
  )
}
