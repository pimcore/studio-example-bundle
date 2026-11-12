// F130: the Supplier note card in the "Ask the brief" panel (assets/portal/js/src/agent/proposal/): a
// `kingdom-supplier-note` widget becomes a card "Add note to rev<n>" with the note's text, Confirm and Dismiss;
// Confirm POSTs to F129's route /studio-example-enterprise/agent/proposal/{id}/confirm. The card's logic
// (proposal.ts) runs in Node; the component (SupplierNoteCard.tsx) and the panel's use of it are read.
// Run: node --test enterprise/tests/portal-agent-proposal.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const enterpriseDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const agentDir = join(enterpriseDir, 'assets/portal/js/src/agent');
const proposalDir = join(agentDir, 'proposal');
const read = (path) => readFileSync(path, 'utf8');

const proposal = await import(join(proposalDir, 'proposal.ts'));

const ID = '0123456789abcdef0123456789abcdef';
// the widget as F127's replay route (src/Portal/Agent/ReplayPlayer.php) sends it
const WIDGET = {
  widgetType: 'kingdom-supplier-note',
  data: { proposalId: ID, assetId: 9, revision: 3, text: 'rev3 exceeds the 45 m limit, rev4 will lower the lift hill', expiresInSeconds: 900 }
};

/** A fetch that records its calls and answers each with the next answer (a status, a Response, an Error, or a promise). */
function fakeFetch (...answers) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    const answer = answers[Math.min(calls.length - 1, answers.length - 1)];
    const value = await answer;
    if (value instanceof Error) throw value;
    if (typeof value === 'number') return new Response(JSON.stringify({}), { status: value, headers: { 'Content-Type': 'application/json' } });
    return value;
  };
  return { calls, fetchImpl };
}

/** A controller for WIDGET's proposal that records every state it passes through. */
function controllerWith (fetchImpl) {
  const states = [];
  const controller = proposal.createProposalController({ proposalId: ID, fetchImpl, onChange: (card) => states.push(card) });
  return { controller, states };
}

// --- AC1: the card for a kingdom-supplier-note widget with a valid note, nothing else ---

test('AC1: a kingdom-supplier-note widget with a valid note becomes a card "Add note to rev3" with the note text', () => {
  const note = proposal.supplierNoteOf(WIDGET);
  assert.ok(note !== null);
  assert.equal(note.proposalId, ID);
  assert.equal(note.revision, 3);
  assert.equal(note.text, WIDGET.data.text);
  assert.equal(proposal.cardTitle(note), 'Add note to rev3');
});

test('AC1: no card for another widget type or an invalid note', () => {
  const bad = [
    { widgetType: 'unknown-widget', data: WIDGET.data },
    { widgetType: 'kingdom-supplier-note-x', data: WIDGET.data },
    { widgetType: 'kingdom-supplier-note', data: { ...WIDGET.data, proposalId: undefined } },
    { widgetType: 'kingdom-supplier-note', data: { ...WIDGET.data, proposalId: 'p1' } },
    { widgetType: 'kingdom-supplier-note', data: { ...WIDGET.data, proposalId: '../../chat' } },
    { widgetType: 'kingdom-supplier-note', data: { ...WIDGET.data, proposalId: ID.toUpperCase() } },
    { widgetType: 'kingdom-supplier-note', data: { ...WIDGET.data, text: '' } },
    { widgetType: 'kingdom-supplier-note', data: { ...WIDGET.data, text: '   ' } },
    { widgetType: 'kingdom-supplier-note', data: { ...WIDGET.data, text: 42 } },
    { widgetType: 'kingdom-supplier-note', data: { ...WIDGET.data, revision: '3' } },
    { widgetType: 'kingdom-supplier-note', data: { ...WIDGET.data, revision: 0 } },
    { widgetType: 'kingdom-supplier-note', data: { ...WIDGET.data, revision: 2.5 } },
    { widgetType: 'kingdom-supplier-note', data: {} }
  ];
  for (const widget of bad) assert.equal(proposal.supplierNoteOf(widget), null, JSON.stringify(widget));
});

test('AC1: the panel renders SupplierNoteCard for a valid note widget and the plain line for any other widget', () => {
  const panel = read(join(agentDir, 'AskBriefPanel.tsx'));
  assert.match(panel, /from '\.\/proposal\/SupplierNoteCard'/);
  assert.match(panel, /supplierNoteOf\(widget\)/);
  assert.match(panel, /<SupplierNoteCard\b/);
  const card = read(join(proposalDir, 'SupplierNoteCard.tsx'));
  assert.match(card, /cardTitle\(note\)/);
  assert.match(card, /\{ note\.text \}/, 'the note preview is a text node');
  assert.match(card, />Confirm</);
  assert.match(card, />Dismiss</);
  assert.doesNotMatch(card, /dangerouslySetInnerHTML|<button|<fieldset/);
});

// --- AC2: Confirm sends one request, disabled while it runs, and maps the answer ---

test('AC2: Confirm POSTs once to the proposal\'s confirm route, with the portal session and no body', async () => {
  const { calls, fetchImpl } = fakeFetch(200);
  const { controller } = controllerWith(fetchImpl);
  await controller.confirm();
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, `/studio-example-enterprise/agent/proposal/${ID}/confirm`);
  assert.equal(calls[0].init.method, 'POST');
  assert.equal(calls[0].init.credentials, 'include');
  assert.equal(calls[0].init.redirect, 'manual');
  assert.equal(calls[0].init.body, undefined);
});

test('AC2: a second Confirm while the first runs, or after it succeeded, sends no second request', async () => {
  let release;
  const pending = new Promise((resolve) => { release = resolve; });
  const { calls, fetchImpl } = fakeFetch(pending);
  const { controller } = controllerWith(fetchImpl);
  const first = controller.confirm();
  assert.equal(controller.card().state, 'confirming');
  assert.equal(proposal.confirmDisabled(controller.card()), true, 'the button is disabled while it runs');
  await controller.confirm();
  release(200);
  await first;
  await controller.confirm();
  assert.equal(calls.length, 1);
  assert.equal(proposal.confirmDisabled(controller.card()), true, 'no Confirm after the note was added');
});

test('AC2: 200 is "Note added" (final), 409 "Already added", 404 "This proposal expired", 401/403 "Please sign in again"', async () => {
  const cases = [
    [200, 'confirmed', 'Note added', false],
    [409, 'confirmed', 'Already added', false],
    [404, 'failed', 'This proposal expired', false],
    [401, 'failed', 'Please sign in again', true],
    [403, 'failed', 'Please sign in again', true]
  ];
  for (const [status, state, message, retry] of cases) {
    const { fetchImpl } = fakeFetch(status);
    const { controller } = controllerWith(fetchImpl);
    await controller.confirm();
    assert.deepEqual(
      { state: controller.card().state, message: controller.card().message, retry: controller.card().retry },
      { state, message, retry },
      `HTTP ${status}`
    );
  }
});

test('AC2: a redirect to the login page is "Please sign in again"', async () => {
  const opaque = { status: 0, type: 'opaqueredirect', redirected: false, ok: false };
  const { fetchImpl } = fakeFetch(opaque);
  const { controller } = controllerWith(fetchImpl);
  await controller.confirm();
  assert.equal(controller.card().message, 'Please sign in again');
});

test('AC2: 5xx and a network error offer a retry, and the retry sends the request again', async () => {
  for (const first of [500, 503, new TypeError('Failed to fetch')]) {
    const { calls, fetchImpl } = fakeFetch(first, 200);
    const { controller } = controllerWith(fetchImpl);
    await controller.confirm();
    assert.equal(controller.card().state, 'failed');
    assert.equal(controller.card().retry, true);
    assert.equal(proposal.confirmDisabled(controller.card()), false);
    await controller.confirm();
    assert.equal(calls.length, 2);
    assert.equal(controller.card().state, 'confirmed');
    assert.equal(controller.card().message, 'Note added');
  }
});

test('AC2: an expired proposal is final: no retry, no second request', async () => {
  const { calls, fetchImpl } = fakeFetch(404);
  const { controller } = controllerWith(fetchImpl);
  await controller.confirm();
  await controller.confirm();
  assert.equal(calls.length, 1);
  assert.equal(proposal.confirmDisabled(controller.card()), true);
});

test('AC2: the component disables Confirm while confirming and offers Retry only where the answer allows it', () => {
  const card = read(join(proposalDir, 'SupplierNoteCard.tsx'));
  assert.match(card, /loading=\{ card\.state === 'confirming' \}/);
  assert.match(card, /disabled=\{ confirmDisabled\(card\) \}/);
  assert.match(card, /card\.retry/);
  assert.match(card, />Retry</);
});

// --- AC3: data-agent-proposal-state ---

test('AC3: the card passes pending, confirming, confirmed', async () => {
  const { fetchImpl } = fakeFetch(200);
  const { controller, states } = controllerWith(fetchImpl);
  assert.equal(controller.card().state, 'pending');
  await controller.confirm();
  assert.deepEqual(states.map((c) => c.state), ['confirming', 'confirmed']);
});

test('AC3: the card passes pending, confirming, failed, confirming on a retry', async () => {
  const { fetchImpl } = fakeFetch(502, 200);
  const { controller, states } = controllerWith(fetchImpl);
  await controller.confirm();
  await controller.confirm();
  assert.deepEqual(states.map((c) => c.state), ['confirming', 'failed', 'confirming', 'confirmed']);
  for (const card of states) assert.ok(proposal.PROPOSAL_STATES.includes(card.state));
});

test('AC3: the component exposes the state as data-agent-proposal-state', () => {
  assert.deepEqual([...proposal.PROPOSAL_STATES], ['pending', 'confirming', 'confirmed', 'failed']);
  const card = read(join(proposalDir, 'SupplierNoteCard.tsx'));
  assert.match(card, /data-agent-proposal-state=\{ card\.state \}/);
});
