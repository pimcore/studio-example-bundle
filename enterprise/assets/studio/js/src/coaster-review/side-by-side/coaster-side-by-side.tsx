import React, { useMemo } from 'react'
import { Alert, Content } from '@pimcore/studio-ui-bundle/components'
import { AssetApiSlice } from '@pimcore/studio-ui-bundle/modules/asset'
import { createRidePair } from '../../../../../shared/coaster/viewer/react.mjs'
import { previewPair, type MetadataSlot } from './side-by-side-model'

// The viewer takes the host's React, so Studio's own copy draws it.
const RidePair = createRidePair(React)

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
  const { data: text, isLoading, error } = AssetApiSlice.useAssetGetTextDataByIdQuery({ id: assetId })
  const pair = useMemo(() => (text === undefined ? undefined : previewPair(text.data, slot)), [text, slot])

  if (isLoading) return <Content loading />
  if (error !== undefined || pair === undefined || 'error' in pair) {
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
