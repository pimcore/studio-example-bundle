# Pimcore Studio Example Bundle

This bundle provides the basic structure of a Pimcore Studio example extension bundle and various examples of how to extend the Pimcore Studio UI.

The Pimcore Studio Example Bundle was created to help developers quickly get started with creating custom extensions for Pimcore Studio. It includes a set of examples for extending the UI and integrating new features.

For further information, visit the [Pimcore Studio UI Plugin Development Examples documentation](https://github.com/pimcore/studio-ui-bundle/blob/2026.x/doc/04_Extending/02_Plugin_Development_Examples/README.md).

## Frontend build

The compiled frontend is shipped as a single committed archive, `build-dist/build-<id>.zip`,
instead of a committed `public/build/` directory. On the target installation the Studio UI
Bundle extracts it into `public/build/` during `bin/console cache:warmup`, so a deployment
needs no Node.js and no per-bundle build step. See
[Shipping the Frontend Build as an Archive](https://github.com/pimcore/studio-ui-bundle/blob/2026.x/doc/04_Extending/04_Shipping_the_Frontend_Build_as_an_Archive.md)
for the full mechanism.

To rebuild it after changing anything under `assets/`:

```bash
cd assets
npm ci
npm run build && npm run package-build
```

The build id is derived from the contents of `assets/`, so an unchanged source produces the
same archive and nothing to commit. `public/build/` is gitignored — a build you produced
locally is never overwritten by the extractor; delete the directory and warm the cache to go
back to the committed archive.

CI runs both scripts on every push touching `assets/` and commits `build-dist/` back to the
branch, so committing the archive by hand is optional.
