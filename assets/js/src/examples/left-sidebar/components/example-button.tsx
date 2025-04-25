import React from 'react'
import { Icon, IconButton, useAlertModal } from '@pimcore/studio-ui-bundle/components'

export const ExampleButton = (): React.JSX.Element => {
  const alertModal = useAlertModal()

  const onClick = (): void => {
    alertModal.info({
      title: 'Thank You!',
      content: (<div>
        <p>We appreciate your kindness! Clicking the heart button shows your support and positivity.</p>
        <Icon value="favorites" />
      </div>
      )
    })
  }

  return (
    <IconButton
      icon={ { value: 'favorites' } }
      onClick={ onClick }
      type={ 'text' }
    />
  )
}
