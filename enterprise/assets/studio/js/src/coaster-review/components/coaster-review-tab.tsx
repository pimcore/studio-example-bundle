import React, { useCallback, useMemo, useState } from 'react'
import { Alert, Button, Content, Flex, Header } from '@pimcore/studio-ui-bundle/components'
import { useElementContext } from '@pimcore/studio-ui-bundle/modules/element'
import {
  SlotDiffTable,
  buildSlotRows,
  useBundleChangeControlGetChangeSetReviewQuery,
  useBundleChangeControlListChangeSetsQuery,
  useBundleChangeControlMergeChangeSetMutation
} from '@pimcore/change-control-bundle/sdk'
import {
  METADATA_SLOT, coasterShaping, mergeRequest, mergeSummary, readableRows, type MergeSummary
} from '../coaster-review-model'

/** change sets still waiting for a review: 'draft' and 'in_review' (merged and discarded ones are done) */
const isOpen = (state: string): boolean => state === 'draft' || state === 'in_review'

interface ChangeSetReviewProps {
  readonly changeSetId: string
  readonly onMerged: (summary: MergeSummary) => void
}

/**
 * One change set in Change Control's own diff table: one readable line per coaster leaf, each with the table's
 * include checkbox; Merge sends the unticked rows as excludePaths.
 */
const CoasterChangeSetReview = ({ changeSetId, onMerged }: ChangeSetReviewProps): React.JSX.Element => {
  const { data: review, isLoading, error } = useBundleChangeControlGetChangeSetReviewQuery({ changeSetId })
  const [merge, { isLoading: isMerging }] = useBundleChangeControlMergeChangeSetMutation()
  const [excluded, setExcluded] = useState<string[]>([])
  const [mergeError, setMergeError] = useState<string>()

  const slot = review?.slots[METADATA_SLOT]
  // every changed leaf, the element list entry included: the merge request needs it
  const allRows = useMemo(() => (slot === undefined ? [] : buildSlotRows(slot, coasterShaping, 'current')), [slot])
  const rows = useMemo(() => readableRows(allRows), [allRows])

  const handleMerge = useCallback(async () => {
    setMergeError(undefined)
    const result = await merge(mergeRequest(changeSetId, allRows, excluded))
    if ('error' in result) {
      setMergeError('The merge failed: ' + JSON.stringify(result.error))
      return
    }
    onMerged(mergeSummary(rows, excluded))
  }, [merge, changeSetId, allRows, rows, excluded, onMerged])

  if (isLoading) return <Content loading />
  if (error !== undefined || review === undefined) {
    return <Alert message="The change set could not be loaded." showIcon type="error" />
  }

  return (
    <Flex gap="small" vertical>
      <Header title={ review.meta.label } />
      <SlotDiffTable
        conflicts={ review.meta.preview.conflicts }
        onToggleInclude={ setExcluded }
        readOnly={ !review.meta.canMerge }
        rows={ rows }
      />
      {mergeError !== undefined && <Alert message={ mergeError } showIcon type="error" />}
      <Flex justify="flex-end">
        <Button
          disabled={ !review.meta.canMerge || excluded.length === rows.length }
          loading={ isMerging }
          onClick={ () => { void handleMerge() } }
          type="primary"
        >
          Merge ticked changes
        </Button>
      </Flex>
    </Flex>
  )
}

/** The asset editor tab: the open change set on this coaster asset, or the outcome of the last merge. */
export const CoasterReviewTab = (): React.JSX.Element => {
  const { id } = useElementContext()
  const { data: changeSets, isLoading } = useBundleChangeControlListChangeSetsQuery({ subjectType: 'asset', subjectRef: String(id) })
  const [summary, setSummary] = useState<MergeSummary>()
  const open = changeSets?.find(changeSet => isOpen(changeSet.state))

  return (
    <Content loading={ isLoading } padded>
      <Header title="Review" />
      {summary !== undefined && (
        <Alert
          description={ (
            <>
              <div>Merged: { summary.merged.join('; ') }</div>
              {summary.leftOut.length > 0 && <div>Left out: { summary.leftOut.join('; ') }</div>}
            </>
          ) }
          message="Change set merged"
          showIcon
          type="success"
        />
      )}
      {open !== undefined && (
        <CoasterChangeSetReview
          changeSetId={ open.id }
          key={ open.id }
          onMerged={ setSummary }
        />
      )}
      {!isLoading && open === undefined && summary === undefined && (
        <Alert message="No open change set for this ride." showIcon type="info" />
      )}
    </Content>
  )
}
