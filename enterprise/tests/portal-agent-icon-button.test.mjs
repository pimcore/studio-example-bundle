// F156 (DR-P48 part 2): the header's "Ask the brief" button is an icon-only control drawn like the portal's own header
// icons (Search, Collections, Cart: `p-hdr-ic` with a `data-tip` tooltip, layout/studio.html.twig), no text label at
// any width. Its accessible name and tooltip are config().agent.label ("Ask the brief"), `data-agent-button` stays.
// Run: node --test enterprise/tests/portal-agent-icon-button.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const enterpriseDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const portalSrc = join(enterpriseDir, 'assets/portal/js/src');
const read = (path) => readFileSync(path, 'utf8');
const buttonSource = () => read(join(portalSrc, 'agent/AskBriefButton.tsx'));
const iconSource = () => read(join(portalSrc, 'icons/AskIcon.tsx'));

/** The JSX of the header control: from `<button` to its `</button>`. */
function buttonJsx (source) {
  const start = source.indexOf('<button');
  const end = source.indexOf('</button>', start);
  assert.ok(start >= 0 && end > start, 'the header control is a <button> element');
  return source.slice(start, end + '</button>'.length);
}

test('AC1: the button is an icon in the header icon shape, with no visible text label at any width', () => {
  const source = buttonSource();
  const jsx = buttonJsx(source);
  assert.match(jsx, /className="p-hdr-ic"/, 'the header icon shape of Search and Collections');
  assert.match(jsx, /type="button"/);
  // its only child is the icon: no label text, no short label for phones
  const children = jsx.slice(jsx.indexOf('>', jsx.indexOf('onClick')) + 1, jsx.lastIndexOf('</button>')).trim();
  assert.match(children, /^<AskIcon\b[^>]*\/>$/, 'the button holds the icon and nothing else');
  assert.doesNotMatch(source, /SHORT_LABEL|useNarrow|matchMedia/, 'no width-dependent text label');
  assert.doesNotMatch(source, /ui\.Button/, 'no text button any more');
  // the icon is decorative: the button carries the name
  assert.doesNotMatch(children, /label=/);
  assert.match(source, /import \{ AskIcon \} from '\.\.\/icons\/AskIcon'/);
  const icon = iconSource();
  assert.match(icon, /export function AskIcon/);
  assert.match(icon, /<CoasterIcon/, 'drawn in the plugin\'s icon frame (currentColor, aria-hidden without a label)');
});

test('AC1: its accessible name and tooltip are the agent label "Ask the brief", data-agent-button stays', () => {
  const jsx = buttonJsx(buttonSource());
  assert.match(jsx, /aria-label=\{ agent\.label \}/);
  assert.match(jsx, /data-tip=\{ agent\.label \}/, 'the header tooltip (.p-hdr-acts [data-tip]::after)');
  assert.match(jsx, /\bdata-agent-button\b/);
  assert.match(jsx, /aria-haspopup="dialog"/);
  assert.match(jsx, /aria-expanded=\{ open \}/);
  // the label the server sends is "Ask the brief"
  const php = read(join(enterpriseDir, 'src/Portal/StudioExampleEnterprisePortalPlugin.php'));
  assert.match(php, /'Ask the brief'/);
});

test('AC2: a click opens the Ask the brief panel as before (lazy, closing puts the focus back on the button)', () => {
  const source = buttonSource();
  const jsx = buttonJsx(source);
  assert.match(jsx, /onClick=\{ \(\) => \{ setOpen\(true\) \} \}/);
  assert.match(source, /const AskBriefPanel = lazy\(async \(\) => await import\('\.\/AskBriefPanel'\)\)/);
  assert.match(source, /\{ open && \(?\s*<Suspense fallback=\{ null \}>\s*<AskBriefPanel agent=\{ agent \} onClose=\{ close \} \/>/);
  assert.match(source, /ref=\{ button \}/);
  assert.match(source, /button\.current\?\.focus\(\)/);
  assert.match(source, /if \(agent === null\) return null/);
});
