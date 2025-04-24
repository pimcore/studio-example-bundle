import { Button, Content, Header, Select, Space, type SelectProps } from '@pimcore/studio-ui-bundle/components'
import { useWidgetManager } from '@pimcore/studio-ui-bundle/modules/widget-manager'
import React from 'react'

export const ExampleWidget = (): React.JSX.Element => {
  const widgetManager = useWidgetManager()
  const [selectedOption, setSelectedOption] = React.useState<SelectProps['value']>(undefined)
  const [selectedWidget, setSelectedWidget] = React.useState<Record<string, any> | undefined>(undefined)

  const widgets = [
    {
      name: 'Example widget',
      component: 'example-widget',
      config: {
        icon: {
          type: 'name',
          value: 'pimcore'
        }
      }
    },

    {
      name: 'Example widget with fixed id',
      id: 'example-widget-fixed-id',
      component: 'example-widget',
      config: {
        icon: {
          type: 'name',
          value: 'pimcore'
        }
      }
    },

    {
      name: 'Another example widget',
      component: 'another-example-widget',
      config: {
        icon: {
          type: 'name',
          value: 'pimcore'
        }
      }
    }
  ]

  const onSelectChange: SelectProps['onChange'] = (value) => {
    setSelectedOption(value)
    const selected = widgets.find((widget) => widget.name === value)
    setSelectedWidget(selected)
  }

  const selectOptions: SelectProps['options'] = widgets.map((widget) => ({
    label: widget.name,
    value: widget.name
  }))

  return (
    <Content padded>
      <Header title='Example widget' />

      <div>
        Select a widget:
      </div>

      <Select
        minWidth={ 'normal' }
        onChange={ onSelectChange }
        options={ selectOptions }
        value={ selectedOption }
      />

      <Space
        direction='vertical'
        size='small'
      >
        <Button onClick={ () => { widgetManager.openMainWidget(selectedWidget) } }>
          Open main widget
        </Button>

        <Button onClick={ () => { widgetManager.openLeftWidget(selectedWidget) } }>
          Open left widget
        </Button>

        <Button onClick={ () => { widgetManager.openRightWidget(selectedWidget) } }>
          Open right widget
        </Button>

        <Button onClick={ () => { widgetManager.openBottomWidget(selectedWidget) } }>
          Open bottom widget
        </Button>
      </Space>
    </Content>
  )
}
