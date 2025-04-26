import { Card, Content, Flex, Header, Icon, IconButton, IconTextButton, Space } from '@pimcore/studio-ui-bundle/components'
import React from 'react'

export const CustomIcons = (): React.JSX.Element => {
  return (
    <Content padded>
      <Header title="Custom Icons" />
      <Card>
        <Flex
          align='center'
          gap='small'
        >
          <h1>Icon Example</h1>
          <Icon
            options={ { height: 35, width: 35, style: { rotate: '90deg' } } }
            value="rocket-example"
          />
        </Flex>
      </Card>

      <Space
        direction='vertical'
        size='small'
      >
        <IconButton
          icon={ { value: 'rocket-example' } }
          size='large'
          type='default'
        />

        <IconTextButton icon={ { value: 'rocket-example' } }>
          Rocket
        </IconTextButton>

        <IconTextButton
          icon={ { value: 'rocket-example' } }
          type='primary'
        >
          Rocket
        </IconTextButton>
      </Space>
    </Content>
  )
}
