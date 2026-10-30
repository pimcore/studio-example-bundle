# Pimcore Studio Example Enterprise Bundle

Examples for Pimcore enterprise bundles (Portal Engine, Change Control), kept apart from the public
[Pimcore Studio Example Bundle](../README.md). This folder is its own Composer package,
`pimcore/studio-example-enterprise-bundle`, so the public bundle keeps requiring only public packages: its
`composer.json`, `assets/` build and CI do not change.

The package is not published to a Composer repository. You install it from this folder through a Composer path
repository.

## Enterprise access

The package requires `pimcore/portal-engine` and `pimcore/change-control-bundle`. Both are enterprise bundles: your
project needs enterprise access, i.e. a Pimcore enterprise subscription and the credentials for the enterprise Composer
repository (`https://repo.pimcore.com/...`, configured in your project's `composer.json` and `auth.json`). Without them
step 2 fails because Composer cannot find these two packages.

## Installation

Run these three steps in the root of your Pimcore application, in this order. The application already has
`pimcore/studio-example-bundle` installed (in `vendor/pimcore/studio-example-bundle`), which contains this folder.

1. **Add the path repository** to the `repositories` of your application's `composer.json`:

   ```json
   {
     "repositories": [
       {
         "type": "path",
         "url": "vendor/pimcore/studio-example-bundle/enterprise",
         "options": { "symlink": false }
       }
     ]
   }
   ```

   To work on the examples, point `url` at the `enterprise` folder of a checkout of this repository instead, and drop
   `"symlink": false` so your changes take effect at once.

2. **Require the package with Composer:**

   ```bash
   composer require pimcore/studio-example-enterprise-bundle:@dev
   ```

   Then register the bundle like any other Pimcore bundle, in `config/bundles.php`:

   ```php
   Pimcore\Bundle\StudioExampleEnterpriseBundle\PimcoreStudioExampleEnterpriseBundle::class => ['all' => true],
   ```

3. **Warm the cache:**

   ```bash
   bin/console cache:warmup
   ```

## Layout

- `src/PimcoreStudioExampleEnterpriseBundle.php`: the bundle class
- `src/DependencyInjection/PimcoreStudioExampleEnterpriseExtension.php`: loads every `config/*.yaml` of this folder
- `config/services.yaml`: the services of the examples; an example may add its own `config/<name>.yaml`
- `config/pimcore/routing.yaml`: the bundle's routes, read by Pimcore from every registered bundle
- `templates/`: the bundle's Twig templates (`@PimcoreStudioExampleEnterprise/...`)
- `assets/studio/`: the sub-bundle's own Studio frontend (Module Federation remote `pimcore_studio_example_enterprise_bundle`,
  plugins in `js/src/plugins.ts`); build it with `npm install && npm run build && npm run package-build` there, which writes
  `build-dist/build-<id>.zip`
- `src/Webpack/WebpackEntryPointProvider.php` (registered in `config/studio.yaml`): extracts `build-dist/build*.zip` into
  `public/build/` on `cache:warmup`, so Studio loads the plugins

## Examples

- [Portal page "Talk"](assets/portal/talk/README.md): the slide viewer as a portal page, with its own route,
  a chrome-less page template and an entry in the portal navigation
