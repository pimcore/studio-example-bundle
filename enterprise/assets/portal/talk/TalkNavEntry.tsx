import { config } from '@pimcore/portal-plugin-sdk'

// The plugin id of src/Portal/StudioExampleEnterprisePortalPlugin.php, whose getFrontendConfig() hands over the URL.
const PLUGIN_ID = 'studio-example-enterprise'

interface TalkConfig {
  talk?: { url: string, label: string }
}

// The "Talk" entry under the portal navigation rail's own items (slots.navEntries). It links to the portal page
// "Talk" (config/pimcore/routing.yaml). The URL comes from the server: the portal's prefix cannot be derived from
// the current path. p-rail-it gives it the rail's own look and closes the mobile drawer on click.
export function TalkNavEntry () {
  const talk = config<TalkConfig>(PLUGIN_ID)?.talk
  if (talk === undefined || typeof talk.url !== 'string') return null
  const label = typeof talk.label === 'string' ? talk.label : 'Talk'

  return (
    <a className="p-rail-it" href={ talk.url } aria-label={ label }>
      <span className="pe-rail-ico">
        { /* a presentation screen on its stand */ }
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"
          strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="4" width="18" height="12" rx="1.5" />
          <path d="M12 16v4M8 20h8" />
        </svg>
      </span>
      <span className="p-rail-lbl">{ label }</span>
      { /* the collapsed rail's tooltip */ }
      <span className="p-rail-fly">{ label }</span>
    </a>
  )
}
