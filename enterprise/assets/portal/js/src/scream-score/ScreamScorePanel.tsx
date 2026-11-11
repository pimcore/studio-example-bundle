import React, { Suspense, lazy } from 'react'
import { isPublicShare, type DetailPanelsProps } from '@pimcore/portal-plugin-sdk'
import { panelHash } from './scream-score-model'

// The form (the kit's Panel, Form and Button) is a chunk of its own, fetched only on a share's detail page: plugin.tsx
// imports this file at the portal's start-up, so it holds no more than the show rule and the lazy import. See
// README.md.
const ScreamScoreForm = lazy(async () => await import('./ScreamScoreForm'))

/**
 * The scream-score panel under a public share's coaster detail, registered in the portal's `detailPanels` slot
 * (plugin.tsx). It renders nothing for a signed-in portal user (isPublicShare() of the SDK), for a data object and on a
 * page without a share hash; whether the asset is a coaster the endpoint answers (ScreamScoreForm renders nothing on
 * its 404).
 */
export function ScreamScorePanel ({ id, dataPoolId, kind }: DetailPanelsProps): React.JSX.Element | null {
  const hash = panelHash({ publicShare: isPublicShare(), id, dataPoolId, kind, pathname: window.location.pathname })
  if (hash === null) return null
  if (id === undefined) return null
  return (
    <Suspense fallback={ null }>
      <ScreamScoreForm hash={ hash } assetId={ id } />
    </Suspense>
  )
}
