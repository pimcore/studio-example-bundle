import React, { Suspense, lazy } from 'react'
import type { PreviewStageComponent, PreviewStageProps } from '@pimcore/portal-plugin-sdk'
import { isCoasterAsset } from './coaster-stage-model'

// The stage's body (the kit's buttons, the shared viewer and its three.js) is a chunk of its own, fetched the first
// time a .coaster asset is opened: plugin.tsx imports this file at the portal's start-up, so it holds no more than the
// decision (accepts) and the lazy import. See README.md, "Loaded on demand".
const CoasterStageView = lazy(async () => await import('./CoasterStageView'))

/** What the stage shows while its chunk loads: an empty box of the stage's height, so the page does not jump. */
function StageLoading ({ height }: { height: number }): React.JSX.Element {
  return <div aria-busy="true" aria-label="Loading the ride design" data-testid="coaster-preview-stage-loading" style={ { height } } />
}

/**
 * The asset detail's preview stage for a .coaster file: the track in 3D, to orbit around or to ride from the front
 * seat. Registered under the portal's `previewStage` name in plugin.tsx; `accepts` declines every other asset, so the
 * portal keeps its own stage for images, videos and documents, and never loads the 3D chunk for them.
 */
export const CoasterPreviewStage: PreviewStageComponent = (props: PreviewStageProps) => (
  <Suspense fallback={ <StageLoading height={ props.height } /> }>
    <CoasterStageView { ...props } />
  </Suspense>
)

// The portal asks this before it renders the stage; false hands the asset back to the portal's own stage.
CoasterPreviewStage.accepts = isCoasterAsset
