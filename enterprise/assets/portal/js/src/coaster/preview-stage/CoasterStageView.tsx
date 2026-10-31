import React, { useEffect, useState } from 'react'
import type { PreviewStageProps } from '@pimcore/portal-plugin-sdk'
import { Alert, Button, Content } from '@pimcore/portal-ui-kit/components'
import { createCoasterRide, createCoasterViewer } from '../../../../../shared/coaster/viewer/react.mjs'
import {
  DEFAULT_VIEW,
  STAGE_VIEWS,
  coasterFileUrl,
  readCoasterResponse,
  type CoasterFileResult,
  type StageView
} from './coaster-stage-model'

// The viewer takes the host's React, so the portal's own copy draws it (shared/coaster/viewer/README.md).
const CoasterViewer = createCoasterViewer(React)
const CoasterRide = createCoasterRide(React)

/** Height of the Orbit/Ride bar above the track, taken from the stage height the portal hands over. */
const BAR_HEIGHT = 40

/** Loads the asset's .coaster text from the bundle route (coaster-stage-model.ts, coasterFileUrl). */
function useCoasterFile (id: number, dataPoolId: number, shareHash?: string): CoasterFileResult | undefined {
  const [result, setResult] = useState<CoasterFileResult | undefined>(undefined)
  useEffect(() => {
    let current = true
    setResult(undefined)
    fetch(coasterFileUrl(id, dataPoolId, shareHash), { credentials: 'include' })
      .then(async (response) => readCoasterResponse(response.status, await response.text()))
      .catch(() => ({ error: 'The ride design could not be loaded.' }))
      .then((loaded) => { if (current) setResult(loaded) })
    return () => { current = false }
  }, [id, dataPoolId, shareHash])
  return result
}

/**
 * The stage itself: the track in 3D, to orbit around or to ride from the front seat. CoasterPreviewStage.tsx loads
 * this module (with the kit and the viewer's three.js) on demand, the first time a .coaster asset is opened, so the
 * plugin's start-up code stays small.
 */
export function CoasterStageView ({ data, dataPoolId, shareHash, height }: PreviewStageProps): React.JSX.Element {
  const [view, setView] = useState<StageView>(DEFAULT_VIEW)
  const result = useCoasterFile(data.id, dataPoolId, shareHash)
  const trackHeight = Math.max(height - BAR_HEIGHT, 120)

  return (
    <div className="studio-example-coaster-stage" data-testid="coaster-preview-stage">
      <div
        role="group"
        aria-label="Coaster view"
        style={ { display: 'flex', gap: 'var(--p-space-xs)', height: BAR_HEIGHT, alignItems: 'center' } }
      >
        { STAGE_VIEWS.map(({ key, label }) => (
          <Button
            key={ key }
            aria-pressed={ view === key }
            onClick={ () => { setView(key) } }
            type={ view === key ? 'primary' : 'default' }
          >
            { label }
          </Button>
        )) }
      </div>
      <div style={ { height: trackHeight, borderRadius: 'var(--p-radius)', overflow: 'hidden' } }>
        { result === undefined && <Content loading /> }
        { result !== undefined && 'error' in result && <Alert message={ result.error } showIcon type="warning" /> }
        { result !== undefined && 'file' in result && (view === 'orbit'
          ? <CoasterViewer file={ result.file } />
          : <CoasterRide file={ result.file } />) }
      </div>
    </div>
  )
}

// the module React.lazy loads
export default CoasterStageView
