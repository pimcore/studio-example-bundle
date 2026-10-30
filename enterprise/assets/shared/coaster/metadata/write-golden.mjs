// Writes enterprise/demo-data/expected-metadata.json: the metadata of the sample revisions 1 to 3, as
// extractCoasterMetadata computes it. The golden file the TypeScript function and its PHP port are both checked against.
// Run from the repo root after a change to the model or the samples: node enterprise/assets/shared/coaster/metadata/write-golden.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractCoasterMetadata, METADATA_UNITS } from './metadata.ts';

const demoData = join(dirname(fileURLToPath(import.meta.url)), '../../../../demo-data');
const revisions = {};
for (const revision of [1, 2, 3]) {
  const file = `thunder-loop-rev${revision}.coaster`;
  revisions[file] = extractCoasterMetadata(JSON.parse(readFileSync(join(demoData, file), 'utf8')));
}
const golden = { units: METADATA_UNITS, revisions };
writeFileSync(join(demoData, 'expected-metadata.json'), `${JSON.stringify(golden, null, 2)}\n`);
console.log(JSON.stringify(golden, null, 2));
