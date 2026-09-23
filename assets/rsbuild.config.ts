import { defineConfig } from '@rsbuild/core'
import { pluginReact } from '@rsbuild/plugin-react'
import { pluginModuleFederation } from '@module-federation/rsbuild-plugin';
import { pluginGenerateEntrypoints, pluginWriteBuildId } from '@pimcore/studio-ui-bundle/rsbuild/plugins';
import { createDynamicRemote } from '@pimcore/studio-ui-bundle/rsbuild/utils';
import { getBuildGroupId } from '@pimcore/studio-ui-bundle/bundler/build-id';
import path from 'path'
import fs from 'fs';
import packages from './package.json'

// Content-derived id for this assets tree (node_modules and dist excluded), so an unchanged
// source yields the same id - and therefore the same build-dist/build-<id>.zip - instead of a
// fresh archive on every build. The build output lives outside this directory, otherwise each
// build would change the id.
const buildId = getBuildGroupId(__dirname);
const buildRoot = path.resolve(__dirname, '..', 'public', 'build');
const buildPath = path.resolve(buildRoot, buildId);

// Drop stale build dirs: studio-package-build picks the build id deterministically from the
// .build-id files it finds on disk, not "the newest", so a leftover dir from an earlier source
// state could otherwise end up in the archive instead of this build.
// Only directories are swept: plain files at this level must survive, in particular the
// tracked .gitkeep that keeps public/build/ in git once the expanded build is gitignored.
if (fs.existsSync(buildRoot)) {
  fs.readdirSync(buildRoot, { withFileTypes: true }).forEach((entry) => {
    if (entry.isDirectory() && entry.name !== buildId) {
      fs.rmSync(path.resolve(buildRoot, entry.name), { recursive: true, force: true });
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
    ...(!isDevServer ? {assetPrefix: '/bundles/pimcorestudioexample/build/' + buildId} : {}),
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
    pluginWriteBuildId({ buildId }),
    pluginGenerateEntrypoints(),
    pluginReact(),
    pluginModuleFederation({
      name: 'pimcore_studio_example_bundle',
      filename: 'static/js/remoteEntry.js',
      exposes: {
        '.': './js/src/plugins.ts',
      },
      dts: false,
      remotes: {
        '@pimcore/studio-ui-bundle': createDynamicRemote('pimcore_studio_ui_bundle'),
      },
      shared: {
        ...packages.dependencies,
        react: {
          singleton: true,
          eager: true,
          requiredVersion: false,
        },
        'react-dom': {
          singleton: true,
          eager: true,
          requiredVersion: false,
        }
      },
    })
  ]
})
