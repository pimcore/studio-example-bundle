import React from 'react'
import { type AbstractModule, container } from '@pimcore/studio-ui-bundle'
import { serviceIds } from '@pimcore/studio-ui-bundle/app'
import { useAlertModal, Icon } from '@pimcore/studio-ui-bundle/components'
import { contextMenuConfig, type ContextMenuRegistryInterface, type DataObjectTreeContextMenuProps } from '@pimcore/studio-ui-bundle/modules/app'

export const DataObjectContextMenuExtension: AbstractModule = {
  onInit () {
    // Get the ContextMenuRegistry from the dependency injection container
    const contextMenuRegistry = container.get<ContextMenuRegistryInterface>(serviceIds['App/ContextMenuRegistry/ContextMenuRegistry'])

    // contextMenuConfig provides configurations for all available context menu locations
    // Available: dataObjectTree, assetTree, documentTree, etc.
    const config = contextMenuConfig.dataObjectTree

    // Example 1: Add a new custom menu item
    contextMenuRegistry.registerToSlot(config.name, {
      name: 'custom-item',

      // Priority controls the position in the menu (lower number = higher position)
      // Use config.priority to position items relative to existing ones (e.g., rename - 1 places it just above "rename")
      priority: config.priority.rename - 1,

      // useMenuItem hook returns the menu item configuration
      useMenuItem: (context: DataObjectTreeContextMenuProps) => {
        const alertModal = useAlertModal()

        return {
          key: 'custom-item',
          label: 'Custom Item',
          icon: <Icon value="pimcore" />,

          // context.target contains information about the selected node (id, type, etc.)
          onClick: () => {
            alertModal.info({
              title: `Custom item clicked for data object with id: ${context.target.id}`,
              content: 'This is a custom context menu item for the data object.'
            })
          }
        }
      }
    })

    // Example 2: Modify an existing menu item
    contextMenuRegistry.updateSlotProvider(config.name, 'delete', (existingItem) => {
      return {
        ...existingItem,
        useMenuItem: (context: DataObjectTreeContextMenuProps) => {
          // Get the original menu item configuration
          const existingMenuItem = existingItem.useMenuItem(context)

          // Preserve existing visibility logic
          if (existingMenuItem === null) {
            return null
          }

          // Hide delete option for non-folder items
          if (context.target.type !== 'folder') {
            return null
          }

          // Customize the menu item properties
          return {
            ...existingMenuItem,
            label: 'Customized Delete (visible only for folders)',
            icon: <Icon
              subIconName="pimcore"
              value="trash"
                  />
          }
        }
      }
    })
  }
}
