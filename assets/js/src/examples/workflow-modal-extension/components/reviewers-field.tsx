import React from 'react'
import { Form, Select } from '@pimcore/studio-ui-bundle/components'
// TODO: remove this directive once studio-ui-bundle#3647 is released and the SDK pin here is bumped.
// @ts-expect-error useWorkflow becomes a public export of modules/element in studio-ui-bundle#3647, which is not yet in a published canary.
import { useWorkflow } from '@pimcore/studio-ui-bundle/modules/element'
import { useUserGetCollectionQuery } from '@pimcore/studio-ui-bundle/api/user'

export const ReviewersField = (): React.JSX.Element | null => {
  const { triggeredWorkflowAction } = useWorkflow()

  const shouldRender =
    triggeredWorkflowAction?.workflowId === 'simple_approval' &&
    triggeredWorkflowAction?.transitionId === 'request_review'

  // skip: don't fetch users on transitions this field doesn't render for.
  const { data: userCollection, isLoading } = useUserGetCollectionQuery(undefined, { skip: !shouldRender })

  if (!shouldRender) {
    return null
  }

  const options = (userCollection?.items ?? []).map(user => ({
    label: user.username,
    value: user.id
  }))

  return (
    <Form.Item
      label="Reviewers"
      name="reviewers"
      rules={ [{ required: true, message: 'Please select at least one reviewer.' }] }
    >
      <Select
        loading={ isLoading }
        mode="multiple"
        options={ options }
        placeholder="Select reviewers"
      />
    </Form.Item>
  )
}
