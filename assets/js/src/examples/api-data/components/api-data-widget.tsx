import { Content, Header } from '@pimcore/studio-ui-bundle/components'
import { useAssetGetTreeQuery } from '@pimcore/studio-ui-bundle/api/asset'
import React, { useEffect } from 'react'
import { ApiError, trackError } from '@pimcore/studio-ui-bundle/modules/app'

export const ApiDataWidget = (): React.JSX.Element => {
  const { isLoading, data, isError, error } = useAssetGetTreeQuery({
    page: 1,
    pageSize: 10
  })

  useEffect(() => {
    if (isError) {
      trackError(new ApiError(error))
    }
  }, [isError])

  return (
    <Content
      loading={ isLoading }
      padded
    >
      <Header title="API data" />

      {data?.items.map((item) => (
        <div key={ item.id }>
          {item.filename}
        </div>
      ))}
    </Content>
  )
}
