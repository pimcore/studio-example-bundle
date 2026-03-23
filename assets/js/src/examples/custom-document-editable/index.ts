import { type IAbstractPlugin } from '@pimcore/studio-ui-bundle'
import { DynamicTypeDocumentEditableMarkdown } from './dynamic-types/definitions/dynamic-type-document-editable-markdown'
import { MarkdownEditableModule } from './modules/markdown-editable-module'

const MARKDOWN_SERVICE_ID = 'ExampleBundle/DynamicTypes/DocumentEditable/Markdown'

export const CustomDocumentEditablePlugin: IAbstractPlugin = {
  name: 'CustomDocumentEditablePlugin',

  onInit: ({ container }): void => {
    container.bind(MARKDOWN_SERVICE_ID)
      .to(DynamicTypeDocumentEditableMarkdown)
      .inSingletonScope()
  },

  onStartup: ({ moduleSystem }): void => {
    moduleSystem.registerModule(MarkdownEditableModule)
  }
}
