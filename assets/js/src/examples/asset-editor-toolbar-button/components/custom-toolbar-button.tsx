import React, { useContext } from 'react'
import { Button, useAlertModal } from '@pimcore/studio-ui-bundle/components'
import { AssetContext, useAssetDraft } from '@pimcore/studio-ui-bundle/modules/asset'

const CustomToolbarButton: React.FC = () => {
  const alertModal = useAlertModal()
  const { id } = useContext(AssetContext)
  const { asset } = useAssetDraft(id)

  const onClick = (): void => {
    alertModal.info({
      title: 'Hello!',
      content: 'Hello from the custom toolbar button! The button will only be shown for image assets. Have a nice day!'
    })
  }

  return (
    <>
      { asset?.type === 'image' && (
      <Button onClick={ onClick }>Custom Image Button</Button>
      ) }
    </>
  )
}

export default CustomToolbarButton
