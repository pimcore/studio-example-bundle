import { defineConfig } from '@rsbuild/core'
import { pluginReact } from '@rsbuild/plugin-react'
import { pluginModuleFederation } from '@module-federation/rsbuild-plugin';
import { pluginGenerateEntrypoints } from './bundler/plugins/entrypoints-generate';
import path from 'path'
import fs from 'fs';
import { v4 } from 'uuid';

const buildId = v4();
const buildPath = path.resolve(__dirname, '..', 'public', 'build', buildId);

if (fs.existsSync( path.resolve(__dirname, '..', 'public', 'build'))) {
  fs.readdirSync(path.resolve(__dirname, '..', 'public', 'build')).forEach((file) => {
    if (file !== 'studio-npm-package.tgz') {
      fs.rmSync(path.resolve(__dirname, '..', 'public', 'build', file), { recursive: true });
    }
  })
}

if (!fs.existsSync(buildPath)) {
  fs.mkdirSync(buildPath, { recursive: true });
}

let nodeEnv = process.env.NODE_ENV;
let env: 'development' | 'production' = 'production';

const isDevServer = nodeEnv === 'dev-server';
if (nodeEnv !== env) {
  env = 'development';
}

export default defineConfig({
  mode: env,
  server: {
    port: 3032,
  },
  dev: {
    ...(!isDevServer ? {assetPrefix: './bundles/pimcorestudioexample/build/' + buildId} : {}),
    client: {
      host: 'localhost',
      port: 3032,
      protocol: 'ws'
    }
  },
  source: {
    entry: {
      main: './js/src/main.ts'
    },
    decorators: {
      version: 'legacy'
    }
  },
  output: {
    manifest: true,
    assetPrefix: '/bundles/pimcorestudioexample/build/' + buildId,
    distPath: {
      root: buildPath
    },
  },
  tools: {
    bundlerChain: (chain, { env }) => {
      chain.output.uniqueName('pimcore_studio_example_bundle');
    },
  },
  plugins: [
    pluginGenerateEntrypoints(),
    pluginReact(),
    pluginModuleFederation({
      name: 'pimcore_studio_example_bundle',
      filename: './static/js/remoteEntry.js',
      exposes: {
        '.': './js/src/plugins.ts',
      },
      dts: false,
      remotes: {
        '@pimcore/studio-ui-bundle': `promise new Promise(resolve => {
          const studioUIBundleRemoteUrl = window.StudioUIBundleRemoteUrl
          const script = document.createElement('script')
          script.src = studioUIBundleRemoteUrl
          script.onload = () => {
            const proxy = {
              get: (request) => window['pimcore_studio_ui_bundle'].get(request),
              init: (...arg) => {
                try {
                  return window['pimcore_studio_ui_bundle'].init(...arg)
                } catch(e) {
                  console.log('remote container already initialized')
                }
              }
            }
            resolve(proxy)
          }
          document.head.appendChild(script);
        })
        `,
      },
      shared: {
        react: {
          singleton: true,
          eager: true,
          requiredVersion: false,
        },
        'react-dom': {
          singleton: true,
          eager: true,
          requiredVersion: false,
        },
        'inversify': {
          // singleton: true,
          eager: true,
          version: '6.1.x',
          requiredVersion: '6.1.x',
        },
      },
    })
  ]
})
