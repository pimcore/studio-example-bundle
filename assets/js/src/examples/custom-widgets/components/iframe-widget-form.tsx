import { Form, Input, InputNumber } from '@pimcore/studio-ui-bundle/components'
import React from 'react'

export const IframeWidgetForm = (): React.JSX.Element => {
  return (
    <>
      <Form.Item
        label='URL'
        name='url'
        rules={ [{ required: true, message: 'Please enter a URL' }] }
      >
        <Input placeholder='https://example.com' />
      </Form.Item>

      <Form.Item
        label='Height (px)'
        name='height'
      >
        <InputNumber
          min={ 100 }
          placeholder='600'
        />
      </Form.Item>
    </>
  )
}
