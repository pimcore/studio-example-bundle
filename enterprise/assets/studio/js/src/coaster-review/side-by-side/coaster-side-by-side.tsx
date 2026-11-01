import React, { useEffect, useMemo, useState } from 'react'
import { Alert, Content } from '@pimcore/studio-ui-bundle/components'
import { createRidePair } from '../../../../../shared/coaster/viewer/react.mjs'
import { previewPair, type MetadataSlot } from './side-by-side-model'

// The viewer takes the host's React, so Studio's own copy draws it.
const RidePair = createRidePair(React)

/** the asset's file as text, by the download endpoint: the text endpoint refuses a .coaster (an unknown asset type) */
export const liveFileUrl = (assetId: number): string => `/pimcore-studio/api/assets/${assetId}/download`

type LiveFile = { state: 'loading' } | { state: 'error' } | { state: 'loaded', text: string }

const useLiveFile = (assetId: number): LiveFile => {
  const [file, setFile] = useState<LiveFile>({ state: 'loading' })
  useEffect(() => {
    let current = true
    setFile({ state: 'loading' })
    fetch(liveFileUrl(assetId), { credentials: 'include' })
      .then(async response => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return await response.text()
      })
      .then(text => { if (current) setFile({ state: 'loaded', text }) })
      .catch(() => { if (current) setFile({ state: 'error' }) })
    return () => { current = false }
  }, [assetId])
  return file
}

interface CoasterSideBySideProps {
  /** the coaster asset */
  readonly assetId: number
  /** the change set's 'metadata' slot: the proposal the right ride shows */
  readonly slot: MetadataSlot | undefined
}

/**
 * Both rides of the review side by side: the asset's live file on the left, the change set's proposal on the right,
 * the changed elements marked, one Play for both trains. It takes the change set, not the reviewer's ticks, so
 * unticking a row leaves both rides as they are.
 */
export const CoasterSideBySide = ({ assetId, slot }: CoasterSideBySideProps): React.JSX.Element => {
  const file = useLiveFile(assetId)
  const text = file.state === 'loaded' ? file.text : undefined
  const pair = useMemo(() => (text === undefined ? undefined : previewPair(text, slot)), [text, slot])

  if (file.state === 'loading') return <Content loading />
  if (pair === undefined || 'error' in pair) {
    const reason = pair !== undefined && 'error' in pair ? pair.error : 'The live file could not be loaded.'
    return <Alert message={ reason } showIcon type="warning" />
  }

  return (
    <RidePair
      left={ pair.left }
      right={ pair.right }
    />
  )
}
