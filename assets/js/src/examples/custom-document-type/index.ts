import { type IAbstractPlugin } from '@pimcore/studio-ui-bundle'
import { DocumentSidebarManager } from '@pimcore/studio-ui-bundle/modules/document'
import { BookTabManager } from './document/editor/types/book/tab-manager/book-tab-manager'
import { BookDocumentModule } from './modules/book-document-module'

export const CustomDocumentTypePlugin: IAbstractPlugin = {
  name: 'CustomDocumentTypePlugin',

  onInit: ({ container }): void => {
    container.bind('ExampleBundle/Document/Editor/BookTabManager')
      .to(BookTabManager)
      .inSingletonScope()
    container.bind('Document/Editor/Sidebar/BookSidebarManager')
      .to(DocumentSidebarManager)
      .inSingletonScope()
  },

  onStartup: ({ moduleSystem }): void => {
    moduleSystem.registerModule(BookDocumentModule)
  }
}
