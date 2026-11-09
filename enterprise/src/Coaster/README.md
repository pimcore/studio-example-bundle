# Coaster metadata on upload

Saving a `.coaster` asset fills five of its metadata entries: `maxHeight`, `length`, `inversions`, `topSpeed` and
`duration`. The portal shows them in the asset's General card, so a supplier who uploads a ride design sees its key
figures at once.

## What it shows

Upload `demo-data/thunder-loop-rev2.coaster` and the asset's metadata gets one input entry per figure, in the units of
`CoasterMetadataExtractor::UNITS`:

| Entry | Unit |
| --- | --- |
| `maxHeight` | m |
| `length` | m |
| `inversions` | (count) |
| `topSpeed` | km/h |
| `duration` | s |

The values are computed by a PHP port of [the TypeScript reference](../../assets/shared/coaster/metadata/metadata.ts)
and checked against the same golden file, [`demo-data/expected-metadata.json`](../../demo-data/expected-metadata.json).
Saving the same file twice gives the same values. An invalid file (not JSON, or not a valid `.coaster` design) gets no
metadata; the application log says why ("Coaster metadata not set: ...").

## How to run

1. Install the sub-bundle as described in [the enterprise README](../../README.md); `config/coaster.yaml` registers
   the listener, there is nothing else to configure.
2. In Studio (or through the portal's upload), upload a `.coaster` file from `demo-data/`, or save an existing one.
3. Open the asset's metadata: the five entries are there. `bin/console coaster-demo:setup` (see
   [`src/Command/README.md`](../Command/README.md)) uploads revision 1 this way.

Tests, from the repository root: `enterprise/tests/coaster-metadata.test.mjs` checks the TypeScript reference against
the golden file; `enterprise/tests/coaster-php.test.mjs` runs the listener and the PHP extractor on revisions 1 to 3
and on an invalid file (it needs `php` on the PATH). Both run with `node --test 'enterprise/tests/*.test.mjs'`.

## Extension point

**An asset event listener**: `CoasterMetadataListener::onAssetSave()` listens to Pimcore's `pimcore.asset.preAdd` and
`pimcore.asset.preUpdate` events (tags in `config/coaster.yaml`). It runs before the asset is written, so the values
are saved with it, without a second save. It skips every asset whose file name does not end in `.coaster`.

```yaml
Pimcore\Bundle\StudioExampleEnterpriseBundle\Coaster\CoasterMetadataListener:
    tags:
        - { name: kernel.event_listener, event: pimcore.asset.preAdd, method: onAssetSave }
        - { name: kernel.event_listener, event: pimcore.asset.preUpdate, method: onAssetSave }
```

## Code

- `CoasterMetadataListener.php`: the listener; reads the file, validates it, writes the five entries or logs why not
- `CoasterValidator.php`: the schema check of a `.coaster` file
- `CoasterMetadataExtractor.php`: the key figures of a design (the PHP port of `metadata.ts`)
