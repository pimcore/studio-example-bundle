// F85: the findings F54's review left open on the side-by-side preview. Run (the viewer's three.js first: npm ci in
// enterprise/assets/shared/coaster/viewer):
// node --test 'enterprise/tests/*.test.mjs'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const enterpriseDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const viewerDir = join(enterpriseDir, 'assets/shared/coaster/viewer');
const reviewDir = join(enterpriseDir, 'assets/studio/js/src/coaster-review');
const { buildCoasterScene } = await import(join(viewerDir, 'scene.mjs'));
const { pairMarks } = await import(join(viewerDir, 'pair.mjs'));
const { buildTrack } = await import(join(enterpriseDir, 'assets/shared/coaster/geometry/track.mjs'));

const demo = (name) => JSON.parse(readFileSync(join(enterpriseDir, 'demo-data', name), 'utf8'));
const rev2 = demo('thunder-loop-rev2.coaster');
const rev3 = demo('thunder-loop-rev3.coaster');

// The vertices a mesh actually draws: its index within the draw range.
const drawn = (mesh) => {
  const index = mesh.geometry.index;
  const { start, count } = mesh.geometry.drawRange;
  const end = Math.min(index.count, start + count);
  return new Set(Array.from({ length: end - start }, (_, i) => index.getX(start + i)));
};

test('AC6: every mark is the rail itself drawn thicker, ring for ring, so it cannot flare off the rails at the lift hill', () => {
  for (const file of [rev2, rev3]) {
    const marks = pairMarks(rev2.track, rev3.track);
    const side = file === rev2 ? marks.left : marks.right;
    const { scene, marks: group } = buildCoasterScene(file, { marks: side });
    const elements = buildTrack(file).elements;
    for (const mesh of group.children) {
      const [, index, which] = mesh.name.match(/^mark-(\d+)-(left|right)$/);
      const rail = scene.getObjectByName(`rail-${which}`);
      const railPos = rail.geometry.attributes.position;
      const markPos = mesh.geometry.attributes.position;
      const railNormal = rail.geometry.attributes.normal;
      assert.equal(markPos.count, railPos.count, `${mesh.name}: built on the rail's own rings`);
      const vertices = drawn(mesh);
      assert.ok(vertices.size > 0, `${mesh.name} draws something`);
      for (const v of vertices) {
        // Each drawn vertex sits on the rail's ring, pushed out along the rail's own normal by the extra radius.
        const dx = markPos.getX(v) - railPos.getX(v);
        const dy = markPos.getY(v) - railPos.getY(v);
        const dz = markPos.getZ(v) - railPos.getZ(v);
        const out = dx * railNormal.getX(v) + dy * railNormal.getY(v) + dz * railNormal.getZ(v);
        assert.ok(Math.hypot(dx, dy, dz) < 0.1, `${mesh.name}: vertex ${v} is ${Math.hypot(dx, dy, dz).toFixed(3)} m off its rail ring`);
        assert.ok(Math.abs(Math.hypot(dx, dy, dz) - out) < 1e-6, `${mesh.name}: vertex ${v} is pushed along the rail's normal only`);
      }
      // The drawn rings cover the element: its first and last sample are within a metre of a drawn vertex.
      const element = elements.find((e) => e.index === Number(index));
      const line = buildTrack(file).points;
      for (const sample of [element.start, element.end]) {
        const p = line[sample];
        const near = [...vertices].some((v) => Math.hypot(markPos.getX(v) - p.x, markPos.getY(v) - p.y, markPos.getZ(v) - p.z) < 1.5);
        assert.ok(near, `${mesh.name} reaches sample ${sample}`);
      }
    }
  }
});

test('AC4: How to try: pair.html is in the viewer folder and loads Thunder Loop revision 2 and 3 from demo-data by default', () => {
  const html = readFileSync(join(viewerDir, 'pair.html'), 'utf8');
  for (const name of ['thunder-loop-rev2.coaster', 'thunder-loop-rev3.coaster']) {
    const url = html.match(new RegExp(`'([^']*${name.replace(/\./g, '\\.')})'`))[1];
    // Served from enterprise/, the page is /assets/shared/coaster/viewer/pair.html; its relative path lands in demo-data.
    const resolved = new URL(url, 'http://host/assets/shared/coaster/viewer/pair.html').pathname;
    assert.equal(resolved, `/demo-data/${name}`);
    assert.ok(existsSync(join(enterpriseDir, resolved)), `${resolved} exists under enterprise/`);
  }
  assert.equal(rev2.meta.revision, 2);
  assert.equal(rev3.meta.revision, 3);
  assert.match(html, /Revision \$\{live\.meta\.revision\} \(live\)/);
  assert.match(html, /Revision \$\{proposed\.meta\.revision\} \(proposed\)/);
});

test('AC5: the viewer README, now that F84 is merged, describes pair.mjs, pair.html and the mark colour', () => {
  const readme = readFileSync(join(viewerDir, 'README.md'), 'utf8');
  assert.match(readme, /`pair\.mjs`: `mountRidePair\(element, \{ left, right, speed \}\)`/);
  assert.match(readme, /`pair\.html` two rides side by side/);
  assert.match(readme, /\| `marks`\s+\|/);
  assert.match(readme, /station, mark \}/);
});

test('AC7: the Studio review tab mounts the same ride pair as pair.html: createRidePair over mountRidePair, both from the shared viewer', () => {
  const tab = readFileSync(join(reviewDir, 'side-by-side/coaster-side-by-side.tsx'), 'utf8');
  assert.match(tab, /import \{ createRidePair \} from '\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/shared\/coaster\/viewer\/react\.mjs'/);
  assert.match(readFileSync(join(viewerDir, 'react.mjs'), 'utf8'), /mountRidePair\(ref\.current, \{ left, right, speed, colors \}\)/);
  assert.match(readFileSync(join(viewerDir, 'pair.html'), 'utf8'), /mountRidePair\(document\.getElementById\('pair'\)/);
  assert.ok(existsSync(join(enterpriseDir, 'assets/studio/js/src/coaster-review/side-by-side/coaster-side-by-side.tsx')));
});
