// F49: the portal plugin's tile picture for .coaster assets (assets/portal/js/src/coaster/tile/), on the portal's
// tileRegions.media name. Run (node 24 needs the glob): node --test 'enterprise/tests/*.test.mjs'
// The tile's decisions and the track outline (coaster-tile-model.ts) run in Node; the component, its registration
// and the README are read.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const enterpriseDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const portalSrc = join(enterpriseDir, 'assets/portal/js/src');
const tileDir = join(portalSrc, 'coaster/tile');
const read = (path) => readFileSync(path, 'utf8');
const model = await import(join(tileDir, 'coaster-tile-model.ts'));
const stageModel = await import(join(portalSrc, 'coaster/preview-stage/coaster-stage-model.ts'));

// the registered component (CoasterTileMedia.tsx) and what it loads on demand (F88): the picture and the thumbnail
const tileSource = () => ['CoasterTileMedia.tsx', 'CoasterTilePicture.tsx', 'TileThumbnail.tsx'].map((f) => read(join(tileDir, f))).join('\n');
const pluginSource = () => read(join(portalSrc, 'plugin.tsx'));
const rev1Text = read(join(enterpriseDir, 'demo-data/thunder-loop-rev1.coaster'));
const rev3Text = read(join(enterpriseDir, 'demo-data/thunder-loop-rev3.coaster'));

// What the portal hands a tile region (TileRegionProps of the portal's plugin SDK).
const tile = (name, fileExtension, thumbnail = null) => ({ id: 7, name, thumbnail, fileExtension });
const SIZE = { width: 240, height: 150 };

// The points of an SVG path "M x y L x y ...".
const pathPoints = (d) => [...d.matchAll(/[ML] (-?[\d.]+) (-?[\d.]+)/g)].map(([, x, y]) => ({ x: Number(x), y: Number(y) }));

test('AC1: a .coaster tile is recognised, by its extension or its name', () => {
  assert.equal(model.isCoasterTile(tile('thunder-loop-rev3.coaster', 'coaster')), true);
  assert.equal(model.isCoasterTile(tile('THUNDER.COASTER', 'COASTER')), true);
  assert.equal(model.isCoasterTile(tile('thunder-loop.coaster', undefined)), true, 'no extension: the name decides');
  // the same decision as the preview stage, so tile and detail never disagree
  assert.deepEqual(model.tileAsset(tile('a.coaster', 'coaster')), { id: 7, filename: 'a.coaster', extension: 'coaster' });
  assert.equal(stageModel.isCoasterAsset(model.tileAsset(tile('a.coaster', 'coaster'))), true);
});

test('AC1: the track outline is the side view of the centre line, fitted into the tile', () => {
  const outline = model.outlineFromFile(rev3Text, SIZE);
  assert.ok('path' in outline, outline.error);
  assert.equal(outline.viewBox, `0 0 ${SIZE.width} ${SIZE.height}`);
  assert.match(outline.path, /^M [\d.]+ [\d.]+( L [\d.]+ [\d.]+)+$/);
  const points = pathPoints(outline.path);
  assert.ok(points.length >= 50, `a drawn line, not a few dots (${points.length} points)`);
  for (const p of points) {
    assert.ok(p.x >= 0 && p.x <= SIZE.width && p.y >= 0 && p.y <= SIZE.height, `${p.x},${p.y} inside the tile`);
  }
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const spanX = Math.max(...xs) - Math.min(...xs);
  const spanY = Math.max(...ys) - Math.min(...ys);
  // fitted: one direction fills the tile up to its padding, the aspect ratio of the track is kept
  const pad = model.OUTLINE_PADDING;
  assert.ok(Math.abs(spanX - (SIZE.width - 2 * pad)) < 0.5 || Math.abs(spanY - (SIZE.height - 2 * pad)) < 0.5, 'fills the tile');
  // closed circuit: it ends where it started (the station)
  assert.deepEqual(points.at(-1), points[0]);
  // a side view: the lift hill is the highest point, so the smallest y lies above the station's
  assert.ok(Math.min(...ys) < points[0].y - 20, 'the lift hill rises above the station');
  // two revisions draw two outlines
  assert.notEqual(model.outlineFromFile(rev1Text, SIZE).path, outline.path);
});

test('AC1: the outline projects onto the wider horizontal axis, y up', () => {
  // a track that runs along z only: the side view uses z, not the flat x
  const points = [{ x: 0, y: 0, z: 0 }, { x: 1, y: 10, z: 50 }, { x: 0, y: 0, z: 100 }];
  const outline = model.trackOutline(points, { width: 100, height: 100 });
  const drawn = pathPoints(outline.path);
  assert.ok(drawn[2].x - drawn[0].x > 50, 'spread along the tile');
  assert.ok(drawn[1].y < drawn[0].y, 'higher track is drawn higher');
});

test('AC1: a file that is not a ride design gives no outline, and the tile keeps its picture', () => {
  assert.ok('error' in model.outlineFromFile('not json', SIZE));
  assert.ok('error' in model.outlineFromFile('{"format":"other"}', SIZE));
  assert.ok('error' in model.outlineFromFile('', SIZE));
});

test('AC1: the tile reads the file from the bundle route, scoped by the page data pool and share', () => {
  assert.deepEqual(model.readPortalPage({ dataPoolId: '3', shareHash: 'abc' }), { dataPoolId: 3, shareHash: 'abc' });
  assert.deepEqual(model.readPortalPage({ dataPoolId: '3' }), { dataPoolId: 3, shareHash: undefined });
  assert.equal(model.tileFileUrl(7, { dataPoolId: 3, shareHash: 'abc' }),
    '/studio-example-enterprise/coaster-file/7?dataPoolId=3&publicShareHash=abc');
  // no data pool on the page (a collection spans pools): no request, the default picture stays
  assert.equal(model.tileFileUrl(7, model.readPortalPage({})), undefined);
  assert.equal(model.tileFileUrl(7, model.readPortalPage(undefined)), undefined);
});

test('AC1: the plugin registers the tile picture under the portal tileRegions.media name', () => {
  const plugin = pluginSource();
  assert.match(plugin, /import \{[^}]*\btileRegions\b[^}]*\} from '@pimcore\/portal-plugin-sdk'/);
  assert.match(plugin, /import \{ CoasterTileMedia \} from '\.\/coaster\/tile\/CoasterTileMedia'/);
  assert.match(plugin, /componentRegistry\.register\(\{ name: tileRegions\.media, component: CoasterTileMedia \}\)/);
  // the earlier registrations stay
  assert.match(plugin, /componentRegistry\.register\(\{ name: previewStage, component: CoasterPreviewStage \}\)/);
  // headerActions still has the Ask button; the Talk rail entry left the rail (F157)
  assert.match(plugin, /registerToSlot\(slots\.headerActions, \{ name: 'studio-example-enterprise\/ask-brief', component: AskBriefButton \}\)/);
  assert.doesNotMatch(plugin, /slots\.navEntries/);

  const source = tileSource();
  assert.match(source, /export const CoasterTileMedia = \(props: TileRegionProps\)/);
  assert.match(source, /type TileRegionProps[^}]*\} from '@pimcore\/portal-plugin-sdk'|import type \{[^}]*\bTileRegionProps\b[^}]*\} from '@pimcore\/portal-plugin-sdk'/);
  assert.match(source, /isCoasterTile\(props\)/);
  assert.match(source, /<svg[\s\S]*?viewBox=\{ outline\.viewBox \}/);
  assert.match(source, /<path[\s\S]*?d=\{ outline\.path \}/);
  assert.match(source, /role="img"/);
  assert.match(source, /stroke="var\(--p-primary\)"/, 'drawn in the portal brand token');
  assert.match(source, /fetch\(url, \{ credentials: 'include' \}\)/);
});

test('AC2: every other tile keeps the default media region', () => {
  for (const other of [
    tile('photo.jpg', 'jpg', '/thumb/photo.jpg'),
    tile('clip.mp4', 'mp4'),
    tile('manual.pdf', 'pdf'),
    tile('coaster.jpg', 'jpg'),
    tile('ride.coaster.bak', 'bak'),
    tile('thunder-loop.coaster', 'json'), // the extension wins over the name
    tile('Car', undefined), // a data-object tile: no extension
  ]) {
    assert.equal(model.isCoasterTile(other), false, `${other.name} keeps its picture`);
  }
  assert.equal(model.isCoasterTile(undefined), false);

  const source = tileSource();
  // the region replaces every tile's picture, so the component draws the kit's default itself
  assert.match(source, /if \(!isCoasterTile\(props\)\) return <DefaultTileMedia \{ \.\.\.props \} \/>/);
  assert.match(source, /className="p-tile-img"/);
  assert.match(source, /backgroundImage: `url\('\$\{thumbnail\}'\)`/);
  assert.match(source, /className="p-tile-fallback"/);
  assert.match(source, /import \{[^}]*\bIcon\b[^}]*\} from '@pimcore\/portal-ui-kit\/components'/);
  // a coaster tile shows the default too until its outline is there, and when the file cannot be read
  assert.match(source, /if \(outline === undefined\) return <DefaultTileMedia \{ \.\.\.props \} \/>/);
});

test('AC3: the README explains the tile region extension and links to the portal doc', () => {
  const readme = read(join(tileDir, 'README.md'));
  for (const heading of ['What it shows', 'How to run', 'Extension point']) {
    assert.match(readme, new RegExp(`^## ${heading}$`, 'm'), `has "## ${heading}"`);
  }
  const point = readme.match(/^## Extension point\n([\s\S]*?)(?=^## )/m)[1];
  assert.match(point, /`tileRegions\.media`/);
  assert.match(point, /`TileRegionProps`/);
  assert.match(point, /`tileRegions\.meta`/);
  assert.match(point, /componentRegistry\.register\(\{ name: tileRegions\.media, component: CoasterTileMedia \}\)/);
  assert.match(point, /every tile/i, 'says the region is not per file type');
  assert.match(point, /data pool/i, 'says where the data pool comes from');
  assert.match(point, /Portal_Frontend_Plugin_Surfaces\.md\)/);
  for (const [, link] of readme.matchAll(/\]\((\.[^)#]+)\)/g)) {
    assert.ok(existsSync(resolve(tileDir, link)), `${link} exists`);
  }
  const index = read(join(enterpriseDir, 'README.md'));
  assert.match(index, /\| `assets\/portal\/js\/src\/coaster\/tile\/` \| \[README\]\(assets\/portal\/js\/src\/coaster\/tile\/README\.md\) \|/);
});
