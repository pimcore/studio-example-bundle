import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from '@rsbuild/core'
import { pluginReact } from '@rsbuild/plugin-react'
import { pluginModuleFederation } from '@module-federation/rsbuild-plugin'
import { pluginPortalEntrypoints } from '@pimcore/portal-plugin-sdk/rsbuild'

// The portal plugin of the enterprise sub-bundle, built as the Portal Engine doc "Portal Frontend Plugins"
// describes. src/Portal/StudioExampleEnterprisePortalPlugin.php points the portal at DIST/entrypoints.json.

// exposeRemote.js assigns window.pluginRemotes.<name>, so it must be a JS identifier (snake_case, not kebab)
const REMOTE_NAME = 'pimcore_studio_example_enterprise'
// the bundle's public/portal, which assets:install publishes under this prefix
const ASSET_PREFIX = '/bundles/pimcorestudioexampleenterprise/portal'
const DIST = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../public/portal')

export default defineConfig({
  output: {
    assetPrefix: `${ASSET_PREFIX}/`,
    distPath: { root: DIST },
    cleanDistPath: true
  },
  // the portal's Twig layout is the page; the provider points Portal Engine at entrypoints.json
  tools: {
    htmlPlugin: false
  },
  plugins: [
    pluginReact(),
    pluginPortalEntrypoints({ remoteName: REMOTE_NAME, assetPrefix: ASSET_PREFIX, distPath: DIST }),
    pluginModuleFederation({
      name: REMOTE_NAME,
      filename: 'static/js/remoteEntry.js',
      exposes: { '.': './js/src/plugin.tsx' },
      // the remote key is the package installed for its types; the host exposes its runtime under it
      remotes: {
        '@pimcore/portal-plugin-sdk':
          'portal_engine_host@/bundles/pimcoreportalengine/portal-frontend/static/js/remoteEntry.js'
      },
      // the host shares these as singletons: its React, antd theme and DI container, not copies
      shared: {
        react: { singleton: true, requiredVersion: false },
        'react-dom': { singleton: true, requiredVersion: false },
        antd: { singleton: true, requiredVersion: false },
        'antd-style': { singleton: true, requiredVersion: false },
        inversify: { requiredVersion: false },
        'reflect-metadata': { singleton: true, requiredVersion: false }
      },
      // types come from the SDK package; the host serves none
      dts: false
    })
  ]
})
