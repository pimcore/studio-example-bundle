import { componentRegistry, pluginSystem, previewStage, slots, tileRegions, type IAbstractPlugin } from '@pimcore/portal-plugin-sdk'
import { TalkNavEntry } from '../../talk/TalkNavEntry'
import { AskBriefButton } from './agent/AskBriefButton'
import { CoasterPreviewStage } from './coaster/preview-stage/CoasterPreviewStage'
import { CoasterTileMedia } from './coaster/tile/CoasterTileMedia'

// The enterprise examples' portal plugin. Each example registers its extension points (slots, action surfaces) in
// the module's onInit below.
export const studioExampleEnterprisePlugin: IAbstractPlugin = pluginSystem.definePlugin({
  name: 'studio-example-enterprise',

  onStartup ({ moduleSystem }) {
    moduleSystem.registerModule({
      onInit () {
        // the portal page "Talk" (talk/README.md): its entry under the navigation rail's own items
        componentRegistry.registerToSlot(slots.navEntries, { name: 'studio-example-enterprise/talk', component: TalkNavEntry })
        // the asset detail's preview stage for .coaster files (coaster/preview-stage/README.md); every other asset
        // keeps the portal's own stage, because CoasterPreviewStage.accepts declines it
        componentRegistry.register({ name: previewStage, component: CoasterPreviewStage })
        // the picture of the grid and rail tiles (coaster/tile/README.md): the track outline for .coaster files; the
        // region takes every tile's picture, so CoasterTileMedia draws the kit's default for all others
        componentRegistry.register({ name: tileRegions.media, component: CoasterTileMedia })
        // the "Ask the brief" button in the header of every signed-in page (agent/README.md); it renders nothing
        // without config().agent, and its panel loads on the first click
        componentRegistry.registerToSlot(slots.headerActions, { name: 'studio-example-enterprise/ask-brief', component: AskBriefButton })
      }
    })
  }
})
