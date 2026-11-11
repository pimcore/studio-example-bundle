// F325: the scream-score panel on a public share's coaster detail page (assets/portal/js/src/scream-score/). The
// panel's decisions (scream-score-model.ts) run in Node; the components, their registration and the README are read.
// Run: node --test enterprise/tests/scream-score-panel.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const enterpriseDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const portalSrc = join(enterpriseDir, 'assets/portal/js/src');
const panelDir = join(portalSrc, 'scream-score');
const read = (path) => readFileSync(path, 'utf8');
const model = await import(join(panelDir, 'scream-score-model.ts'));

const panelSource = () => read(join(panelDir, 'ScreamScorePanel.tsx'));
const formSource = () => read(join(panelDir, 'ScreamScoreForm.tsx'));
const pluginSource = () => read(join(portalSrc, 'plugin.tsx'));

const SHARE_PAGE = '/en/shared/8c1f2a9d0e/public-share-a~42';
const guest = (over = {}) => ({ publicShare: true, id: 42, dataPoolId: 3, kind: 'asset', pathname: SHARE_PAGE, ...over });
const typed = { score: 8, comment: 'Loud!', passNumber: 'PK-2026-0001', passCode: 'secret' };

test('AC1: a guest on a share\'s coaster detail page gets the panel, its hash from the path', () => {
  assert.equal(model.panelHash(guest()), '8c1f2a9d0e');
  assert.equal(model.showsPanel(guest(), true), true);
  assert.equal(model.screamScoreUrl('8c1f2a9d0e', 42), '/studio-example-enterprise/scream-score/8c1f2a9d0e/42');
  const ride = model.readRideAnswer(200, { ride: { key: 'thunder-loop', name: 'Thunder Loop' }, token: 't0k' });
  assert.deepEqual(ride, { kind: 'ride', key: 'thunder-loop', name: 'Thunder Loop', token: 't0k' });
});

test('AC1: the share hash is the segment right before public-share-a~<id>, never the first one', () => {
  const rows = [
    ['/shared/abc123/public-share-a~42', 'abc123'],
    ['/en/portal/sub/page/abc123/public-share-a~42', 'abc123'],
    ['/en/portal/sub/page/abc123/public-share-a~42/', 'abc123'],
    ['/a%20b/abc123/public-share-a~42', 'abc123']
  ];
  for (const [path, hash] of rows) assert.equal(model.shareHashFromPath(path, 42), hash, path);
  assert.equal(model.shareHashFromPath('/en/portal/sub/page/abc123/public-share-a~42', '42'), 'abc123', 'the id as a string');
});

test('AC1: the panel has score 1-10, comment with counter, pass number, pass code and Send', () => {
  assert.deepEqual(model.SCORE_CHOICES.map((c) => c.value), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.equal(model.SCORE_CHOICES[0].label, 'barely a squeak');
  assert.equal(model.SCORE_CHOICES[9].label, 'lost my voice');
  assert.equal(model.question('Thunder Loop'), 'How loud did you scream on Thunder Loop?');
  assert.equal(model.MAX_COMMENT, 280);
  assert.equal(model.commentCounter('Loud!'), '5 of 280 characters');
  assert.equal(model.PASS_NUMBER_LABEL, 'Annual-pass number');
  assert.equal(model.PASS_CODE_LABEL, 'Pass code');

  const form = formSource();
  // the look sheet's parts (projects/_shared/design/portal-look.md), no own buttons or form
  assert.match(form, /import \{[^}]*\bPanel\b[^}]*\} from '@pimcore\/portal-ui-kit\/ui'/);
  assert.match(form, /import \{[^}]*\bForm\b[^}]*\} from '@pimcore\/portal-ui-kit\/components'/);
  assert.match(form, /<Form layout="vertical"/);
  assert.match(form, /<Button[^>]*type="primary"/);
  assert.doesNotMatch(form, /<(button|form|fieldset)\b/);
  for (const name of ['SCORE_CHOICES', 'COMMENT_LABEL', 'PASS_NUMBER_LABEL', 'PASS_CODE_LABEL', 'SEND_LABEL', 'commentCounter']) {
    assert.match(form, new RegExp(`\\b${name}\\b`), `the form uses ${name}`);
  }
  assert.match(form, /maxLength=\{ MAX_COMMENT \}/);
});

test('AC1: the plugin registers the panel in the detailPanels slot, and the panel asks isPublicShare()', () => {
  const plugin = pluginSource();
  assert.match(plugin, /import \{ ScreamScorePanel \} from '\.\/scream-score\/ScreamScorePanel'/);
  assert.match(plugin, /componentRegistry\.registerToSlot\(slots\.detailPanels, \{ name: 'studio-example-enterprise\/scream-score', component: ScreamScorePanel \}\)/);
  const panel = panelSource();
  assert.match(panel, /import \{[^}]*\bisPublicShare\b[^}]*\} from '@pimcore\/portal-plugin-sdk'/);
  assert.match(panel, /publicShare: isPublicShare\(\)/);
  assert.match(panel, /window\.location\.pathname/);
});

test('AC2: a signed-in portal user, a non-coaster asset or a path without share hash get no panel', () => {
  assert.equal(model.panelHash(guest({ publicShare: false })), null, 'a signed-in portal user');
  assert.equal(model.showsPanel(guest({ publicShare: false }), true), false);
  assert.deepEqual(model.readRideAnswer(404, { error: 'This ride has no scream score' }), { kind: 'none' }, 'not a coaster');
  assert.equal(model.showsPanel(guest(), false), false, 'the endpoint said: no coaster');
  assert.equal(model.showsPanel(guest(), undefined), false, 'nothing before the endpoint answered');
  assert.equal(model.panelHash(guest({ kind: 'data-object' })), null, 'a data object');
  for (const pathname of ['/en/assets/42', '/public-share-a~42', '/en/shared/abc/public-share-o~42', '/en/shared/abc/public-share-a~43', '/en/shared/abc/public-share-a~42/more', '/en/public-share/list/abc']) {
    assert.equal(model.panelHash(guest({ pathname })), null, pathname);
  }
  assert.equal(model.panelHash(guest({ id: undefined })), null, 'no id');
  // the component renders nothing until all three hold
  const panel = panelSource();
  assert.match(panel, /if \(hash === null\) return null/);
  assert.match(formSource(), /if \(ride\.kind === 'none'\) return null/);
});

test('AC3: a valid send shows the thanks, the replaced score and "Change my scream score"', () => {
  const thanks = model.readSendAnswer(200, { saved: true, ride: 'Thunder Loop', score: 8, replaced: 6 }, typed);
  assert.deepEqual(thanks, {
    kind: 'thanks',
    typed,
    thanks: 'Thanks! Your scream score 8 for Thunder Loop is saved.',
    replaced: 'It replaces your earlier score 6.'
  });
  const first = model.readSendAnswer(200, { saved: true, ride: 'Thunder Loop', score: 8, replaced: null }, typed);
  assert.equal(first.kind, 'thanks');
  assert.equal(first.replaced, null, 'no earlier score: no replace line');
  assert.equal(model.CHANGE_LABEL, 'Change my scream score');
  assert.deepEqual(model.changeScore(thanks), { kind: 'form', typed, errors: {}, notice: null }, 'the form again, as sent');
  const form = formSource();
  assert.match(form, /CHANGE_LABEL/);
  assert.match(form, /state\.replaced/);
  assert.equal(JSON.parse(model.sendBody(typed, 't0k')).token, 't0k');
  assert.deepEqual(JSON.parse(model.sendBody(typed, 't0k')), { ...typed, token: 't0k' });
});

test('AC3: a 422 keeps what was typed and shows one message per field', () => {
  const errors = { score: 'Choose a score from 1 to 10.', comment: 'Keep the comment to 280 characters.', pass: "We don't know this pass number and code. Check the back of your pass." };
  const state = model.readSendAnswer(422, { errors }, typed);
  assert.deepEqual(state, { kind: 'form', typed, errors, notice: null });
  const one = model.readSendAnswer(422, { errors: { pass: errors.pass } }, typed);
  assert.deepEqual(one.errors, { pass: errors.pass });
  assert.equal(one.typed, typed, 'what was typed stays');
  const form = formSource();
  for (const field of ['score', 'comment', 'pass']) assert.match(form, new RegExp(`state\\.errors\\.${field}`), `the ${field} message`);
});

test('AC3: 429, 400 and a network or server error show one plain line, nothing needs an account', () => {
  assert.equal(model.readSendAnswer(429, { error: 'Too many tries. Please wait 15 minutes.' }, typed).notice, 'Too many tries. Please wait 15 minutes.');
  assert.equal(model.readSendAnswer(400, { error: 'This form has expired. Please try again.' }, typed).notice, 'This form has expired. Please try again.');
  for (const [status, body] of [[0, undefined], [500, undefined], [502, '<html>'], [200, { saved: false }], [422, {}]]) {
    const state = model.readSendAnswer(status, body, typed);
    assert.equal(state.notice, 'Your score could not be sent. Try again.', `HTTP ${status}`);
    assert.deepEqual(state.errors, {});
    assert.equal(state.typed, typed);
  }
  assert.equal(model.readRideAnswer(500, undefined).kind, 'error');
  // the guest's share session, never a login: cookies of this site only, the CSRF token of the GET
  const form = formSource();
  assert.match(form, /credentials: 'same-origin'/);
  assert.match(form, /method: 'POST'/);
  assert.doesNotMatch(form, /login|sign in/i);
});

test('AC4: the panel loads as its own chunk; the registered component has no kit import', () => {
  const panel = panelSource();
  assert.match(panel, /lazy\(async \(\) => await import\('\.\/ScreamScoreForm'\)\)/);
  assert.doesNotMatch(panel, /@pimcore\/portal-ui-kit/);
  assert.doesNotMatch(read(join(panelDir, 'scream-score-model.ts')), /^import (?!type)/m, 'the model has no runtime imports');
  const readme = read(join(panelDir, 'README.md'));
  assert.match(readme, /detailPanels/);
  assert.match(readme, /isPublicShare/);
});
