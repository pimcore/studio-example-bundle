import React from 'react'
import { container, type AbstractModule } from '@pimcore/studio-ui-bundle'
import { serviceIds, useTranslation } from '@pimcore/studio-ui-bundle/app'
import {
  TAB_DEPENDENCIES,
  TAB_NOTES_AND_EVENTS,
  TAB_PROPERTIES,
  TAB_TAGS,
  TAB_WORKFLOW,
  type TypeRegistryInterface
} from '@pimcore/studio-ui-bundle/modules/element'
import {
  TAB_VERSIONS,
  TAB_EDIT,
  TAB_PREVIEW,
  SIDEBAR_AREABLOCK_TYPES,
  SIDEBAR_CONTENT_SETTINGS,
  SIDEBAR_DOCUMENT_CONFIGURATION,
  type DocumentSidebarManager,
  useAddDocument,
  AddDocumentFormType
} from '@pimcore/studio-ui-bundle/modules/document'
import {
  contextMenuConfig,
  type ContextMenuRegistry,
  type TreeContextMenuProps
} from '@pimcore/studio-ui-bundle/modules/app'
import { Icon } from '@pimcore/studio-ui-bundle/components'
import { type BookTabManager } from '../document/editor/types/book/tab-manager/book-tab-manager'

const BOOK_TAB_MANAGER_SERVICE_ID = 'ExampleBundle/Document/Editor/BookTabManager'
const BOOK_SIDEBAR_MANAGER_SERVICE_ID = 'Document/Editor/Sidebar/BookSidebarManager'

const registerDocumentType = (): void => {
  const typeRegistry = container.get<TypeRegistryInterface>(
    serviceIds['Document/Editor/TypeRegistry']
  )

  typeRegistry.register({
    name: 'book',
    tabManagerServiceId: BOOK_TAB_MANAGER_SERVICE_ID
  })
}

const registerTabs = (): void => {
  const bookTabManager = container.get<BookTabManager>(BOOK_TAB_MANAGER_SERVICE_ID)
  bookTabManager.register(TAB_EDIT)
  bookTabManager.register(TAB_PREVIEW)
  bookTabManager.register(TAB_PROPERTIES)
  bookTabManager.register(TAB_VERSIONS)
  bookTabManager.register(TAB_DEPENDENCIES)
  bookTabManager.register(TAB_NOTES_AND_EVENTS)
  bookTabManager.register(TAB_TAGS)
  bookTabManager.register(TAB_WORKFLOW)
}

const registerSidebars = (): void => {
  const sidebarManager = container.get<DocumentSidebarManager>(BOOK_SIDEBAR_MANAGER_SERVICE_ID)
  sidebarManager.registerEntry(SIDEBAR_AREABLOCK_TYPES)
  sidebarManager.registerEntry(SIDEBAR_CONTENT_SETTINGS)
  sidebarManager.registerEntry(SIDEBAR_DOCUMENT_CONFIGURATION)
}

const registerContextMenu = (): void => {
  const contextMenuRegistry = container.get<ContextMenuRegistry>(
    serviceIds['App/ContextMenuRegistry/ContextMenuRegistry']
  )
  const config = contextMenuConfig.documentTree

  contextMenuRegistry.registerToSlot(config.name, {
    name: 'addBook',
    priority: config.priority.addHardlink + 2,
    useMenuItem: (context: TreeContextMenuProps) => {
      const { t } = useTranslation()
      const { addDocumentTreeContextMenuItem } = useAddDocument({
        type: 'book',
        iconValue: 'book',
        contextMenuKey: 'addBook',
        formType: AddDocumentFormType.KEY_ONLY,
        modalTitle: t('document.tree.context-menu.add-book', 'Add Book')
      })
      return addDocumentTreeContextMenuItem(context.target)
    }
  })
}

export const BookDocumentModule: AbstractModule = {
  onInit: (): void => {
    registerDocumentType()
    registerTabs()
    registerSidebars()
    registerContextMenu()
  }
}
