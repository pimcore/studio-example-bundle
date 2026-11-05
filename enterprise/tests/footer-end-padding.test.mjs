// F198 (DR-P64/DR-P65): the portal footer row keeps its end padding, so the footer's Talk icon keeps a little space
// from the window's right edge (F157's fix, 3e10ee7). The check reads the .sx-footer-row div's inline style from
// templates/portal/footer-snippet.html.twig; a sample of the row as of 936d1b8 (without the padding) must fail it.
// FOOTER_SNIPPET=<path> checks another copy of the snippet (e.g. an older commit's).
// Run: node --test enterprise/tests/footer-end-padding.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const snippet = process.env.FOOTER_SNIPPET
  ?? join(dirname(fileURLToPath(import.meta.url)), '..', 'templates/portal/footer-snippet.html.twig');

const EXPECTED = {
  display: 'flex',
  'align-items': 'center',
  gap: 'var(--p-space-md)',
  'padding-inline-end': 'var(--p-space-md)',
};

/** The declarations of the .sx-footer-row div's style attribute, as { property: value }. */
const footerRowStyle = (twig) => {
  const tags = [...twig.matchAll(/<div\b[^>]*>/g)].map((m) => m[0]);
  const rows = tags.filter((tag) => /\bclass="[^"]*\bsx-footer-row\b[^"]*"/.test(tag));
  assert.equal(rows.length, 1, 'the snippet has exactly one .sx-footer-row div');
  const style = rows[0].match(/\bstyle="([^"]*)"/);
  assert.ok(style, 'the .sx-footer-row div has a style attribute');
  return Object.fromEntries(style[1].split(';').map((d) => d.trim()).filter(Boolean).map((d) => {
    const at = d.indexOf(':');
    return [d.slice(0, at).trim(), d.slice(at + 1).trim()];
  }));
};

const assertKeepsEndPadding = (twig) => {
  const style = footerRowStyle(twig);
  for (const [property, value] of Object.entries(EXPECTED)) {
    assert.equal(style[property], value, `.sx-footer-row has ${property}: ${value}`);
  }
};

// The row as of 936d1b8, before F157's end padding.
const ROW_936D1B8 = `{% set wrapped = document.getProperty('coaster-demo-footer-wraps') %}
<div class="sx-footer-row" style="display: flex; align-items: center; gap: var(--p-space-md);">
    <div style="flex: 1; min-width: 0;">
        {% if wrapped %}{{ portalEngine_localizedInc(wrapped, {}, true, editmode|default(false)) }}{% endif %}
    </div>
    {{ include('@PimcoreStudioExampleEnterprise/portal/footer-talk.html.twig') }}
</div>`;

test('AC1: the footer row keeps padding-inline-end: var(--p-space-md) next to display flex, align-items center and gap', () => {
  assertKeepsEndPadding(readFileSync(snippet, 'utf8'));
});

test('AC2: the row as of 936d1b8 (without the end padding) fails the check', () => {
  assert.throws(() => assertKeepsEndPadding(ROW_936D1B8), /padding-inline-end/);
});
