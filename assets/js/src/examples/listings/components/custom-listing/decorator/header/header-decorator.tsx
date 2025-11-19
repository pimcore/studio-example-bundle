import { type AbstractDecorator } from '@pimcore/studio-ui-bundle/modules/element'
import { withHeader } from './with-header'

export const HeaderDecorator: AbstractDecorator = (props) => {
  const { ViewComponent } = props

  return {
    ...props,
    ViewComponent: withHeader(ViewComponent)
  }
}
