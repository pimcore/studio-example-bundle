import React, { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react'
import { config, ui } from '@pimcore/portal-plugin-sdk'
import { agentConfigOf } from './agent-config'

// The plugin id of src/Portal/StudioExampleEnterprisePortalPlugin.php, whose getFrontendConfig() hands over `agent`.
const PLUGIN_ID = 'studio-example-enterprise'

// The panel, the stream reader and the UI kit are a chunk of their own: plugin.tsx imports this file at the portal's
// start-up, so it holds the button only. The chunk is fetched on the first click (README.md, "Loaded on click").
const AskBriefPanel = lazy(async () => await import('./AskBriefPanel'))

// On a phone the header has no room for the full label next to search, collections, cart and the user menu.
const NARROW = '(max-width: 600px)'
const SHORT_LABEL = 'Ask'

function useNarrow (): boolean {
  const query = typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia(NARROW) : null
  const [narrow, setNarrow] = useState(query?.matches ?? false)
  useEffect(() => {
    if (query === null) return
    const onChange = (): void => { setNarrow(query.matches) }
    query.addEventListener('change', onChange)
    return () => { query.removeEventListener('change', onChange) }
  }, [query?.media])
  return narrow
}

/**
 * The "Ask the brief" button in the portal header (slots.headerActions, on every signed-in page). It is shown only
 * when the server sent config().agent; a click opens the panel, closing it puts the focus back on the button.
 */
export function AskBriefButton (): React.JSX.Element | null {
  const agent = agentConfigOf(config<unknown>(PLUGIN_ID))
  const [open, setOpen] = useState(false)
  const narrow = useNarrow()
  const anchor = useRef<HTMLSpanElement>(null)
  const close = useCallback(() => {
    setOpen(false)
    anchor.current?.querySelector('button')?.focus()
  }, [])
  if (agent === null) return null

  return (
    <span ref={ anchor }>
      <ui.Button
        data-agent-button
        aria-label={ agent.label }
        aria-haspopup="dialog"
        aria-expanded={ open }
        onClick={ () => { setOpen(true) } }
      >
        { narrow ? SHORT_LABEL : agent.label }
      </ui.Button>
      { open && (
        <Suspense fallback={ null }>
          <AskBriefPanel agent={ agent } onClose={ close } />
        </Suspense>
      ) }
    </span>
  )
}
