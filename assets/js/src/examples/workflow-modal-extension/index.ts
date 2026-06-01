import { type IAbstractPlugin } from '@pimcore/studio-ui-bundle'
import { WorkflowModalExtension } from './modules/workflow-modal-extension'

export const WorkflowModalExtensionPlugin: IAbstractPlugin = {
  name: 'WorkflowModalExtensionPlugin',

  onStartup ({ moduleSystem }) {
    moduleSystem.registerModule(WorkflowModalExtension)
  }
}
