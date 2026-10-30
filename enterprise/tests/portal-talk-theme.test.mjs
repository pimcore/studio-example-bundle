// F38: the portal page "Talk" tells the viewer it is shown in the portal and passes the portal's brand colour (the
// colorPrimary behind --pe-brand), so the slides take it. Run: node --test enterprise/tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const enterpriseDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(join(enterpriseDir, path), 'utf8');

test('AC2: the portal page frames the viewer with host=portal and the portal brand colour as accent', () => {
  const twig = read('templates/portal/talk.html.twig');
  const frame = twig.match(/<iframe[^>]*class="pe-talk-frame"[^>]*>/);
  assert.ok(frame, 'the template still frames the viewer');
  const src = frame[0].match(/src="([^"]*)"/);
  assert.ok(src, 'the frame has a src');
  // the viewer URL, then host=portal, then the brand colour URL-encoded
  assert.match(src[1], /^\{\{\s*viewerUrl\s*\}\}/);
  assert.match(src[1], /host=portal/);
  assert.match(src[1], /accent=\{\{\s*talkBrand\|url_encode\s*\}\}/);
  // talkBrand is the same colour the layout writes into --pe-brand: the portal config's colorPrimary
  assert.match(twig, /\{%\s*set talkBrand = portalEngine_portalConfig\(\)\.colorPrimary\|default\('#2B0080'\)\s*%\}/);
  // a viewer URL with its own query gets &host=..., one without ?host=...
  assert.match(src[1], /\{\{\s*'\?' in viewerUrl \? '&' : '\?'\s*\}\}host=portal/);
});

test('AC2: the portal page README says the slides take the portal brand colour', () => {
  const readme = read('assets/portal/talk/README.md');
  assert.match(readme, /brand colour/i);
  assert.match(readme, /host=portal/);
});
