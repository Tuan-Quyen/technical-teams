// Tests for plugins/team/tools/team-state.mjs: the item schema, the STATE.md view and the spec rules,
// and that the workflows embed the same limits (they cannot import the module).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as ts from '../plugins/team/tools/team-state.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'plugins/team');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8').replace(/\r\n/g, '\n');
const item = (o = {}) => ({ v: 1, slug: 'add-format', key: 'CART', title: 'Add formatCents helper', pipeline: 'feature', tier: 'T0', step: 'build', status: 'running', next: 'Build T1', round: 0, findings: [], ...o });
const f1 = (o = {}) => ({ id: 'F1', title: 'x', by: 'qa', severity: 'major', blocking: false, status: 'open', ...o });

test('a minimal item is valid; every limit is enforced', () => {
  assert.deepEqual(ts.validateItem(item()), []);
  assert.deepEqual(ts.validateItem(item(), '/p/.team/items/add-format.json'), []);
  const bad = {
    'file name': [item(), '/p/.team/items/other.json'],
    'title: ≤8 words': [item({ title: 'one two three four five six seven eight nine' })],
    'next: the next action': [item({ next: 'word '.repeat(31) })],
    'tier: one of': [item({ tier: 'T9' })],
    'round: QA-Fix round': [item({ round: -1 })],
    'id F<n>': [item({ findings: [f1({ id: 'CART-B1' })] })],
    'needs test': [item({ findings: [f1({ blocking: true, test: '' })] })],
    'detail ≤40': [item({ findings: [f1({ severity: 'minor', detail: 'w '.repeat(41) })] })],
    'history: not part': [item({ history: [] })],
    'notes: ≤5': [item({ notes: ['a', 'b', 'c', 'd', 'e', 'f'] })],
  };
  for (const [msg, [it, file]] of Object.entries(bad)) assert.ok(ts.validateItem(it, file).some((e) => e.includes(msg)), `rejects: ${msg}`);
});

test('the STATE.md view: open items only, blocked at the cap, questions and notes', () => {
  const blocked = item({ slug: 'fix-a', pipeline: 'fix', tier: 'T1', round: 3, findings: [f1({ id: 'F2', title: 'Still fails', blocking: true, status: 'reopened', test: 't' })], questions: [{ q: 'Defer F2?', options: 'yes / no → no' }], notes: ['branch x not merged'] });
  const v = ts.renderState([item(), blocked, item({ slug: 'closed', status: 'done' })]);
  assert.match(v, /Generated from `\.team\/items\/\*\.json`/);
  assert.match(v, /\| fix-a \| CART \| fix · T1 \| build \| blocked \(cap\) \| 3 of 3 \| F2 \|/);
  assert.match(v, /- fix-a: Defer F2\? \(yes \/ no → no\)/);
  assert.match(v, /- fix-a: branch x not merged/);
  assert.doesNotMatch(v, /closed/);
  assert.ok(v.split('\n').every((l) => l.length <= 300));
  assert.equal(ts.isBlocked(blocked), true);
});

test('spec rules ignore fenced code, catch revision headings and long lines', () => {
  assert.deepEqual(ts.specProblems('# A\n\n## Decision log\n\n- 2026-11-21 · keep X · because Y\n'), []);
  assert.equal(ts.specProblems('## Revised plan (r2)\n').length, 1);
  assert.equal(ts.specProblems('### Round 3 changes\n').length, 1);
  assert.equal(ts.specProblems('```\n## Round 3\n```\n').length, 0);
  assert.match(ts.specProblems(`${'x'.repeat(301)}\n`)[0], /301 chars/);
});

test('workflows embed the same cap, statuses and limits as team-state.mjs', () => {
  const arr = (xs) => `[${xs.map((x) => `'${x}'`).join(', ')}]`;
  const bl = read('workflows/build-loop.js');
  assert.ok(bl.includes(`\nconst ROUND_CAP = ${ts.ROUND_CAP}\n`));
  assert.ok(bl.includes(`\nconst SEVERITIES = ${arr(ts.SEVERITIES)}\n`), 'severities');
  assert.ok(bl.includes(`\nconst CLOSED = ${arr(ts.CLOSED)}\n`), 'closed statuses');
  for (const w of ['review.js', 'release.js']) {
    const s = read(`workflows/${w}`);
    assert.ok(s.includes(`\nconst ROUND_CAP = ${ts.ROUND_CAP}\n`), `${w}: cap`);
    assert.ok(s.includes(`\nconst CLOSED = ${arr(ts.CLOSED)}\n`), `${w}: closed statuses`);
  }
  const c = read('workflows/compact.js');
  assert.ok(c.includes(`\nconst MAX_LINE = ${ts.LIMITS.line}\n`) && c.includes(`\nconst MAX_WORDS = ${ts.LIMITS.specWords}\n`), 'compact limits');
});

test('migrate: a 0.32 workspace (STATE.md § QA-Fix state + findings.md) becomes valid items, dry run first', async () => {
  const os = await import('node:os');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tt-mig-'));
  const team = path.join(dir, '.team');
  fs.mkdirSync(path.join(team, 'reports', 'cart-checkout'), { recursive: true });
  fs.writeFileSync(path.join(team, 'STATE.md'), [
    '# Team state', '', '## Active work', '',
    '| Slug | Key | Pipeline | Step | Agent | Ticket | Files in use | Status | Workflows | Next step |',
    '|---|---|---|---|---|---|---|---|---|---|',
    '| cart-checkout | CART | feature | 8 — test | team-qa | CART-T2 | src/cart.js | running | yes | Retest CART-B2 after the fix |',
    '', '## QA-Fix state', '', '| Slug | Key | Fix rounds | Last bug no. | Review fixes |', '|---|---|---|---|---|', '| cart-checkout | CART | 2 | 2 | 0 |', '',
  ].join('\n'));
  const tracker = [
    { id: 'CART-B1', origin: 'CODE_REVIEW', sourceId: 'CART-R1', status: 'VERIFIED', severity: 'major', blocking: true, title: 'Negative quantity accepted by addItem', file: 'src/cart.js', line: 4, history: [] },
    { id: 'CART-B2', origin: 'QA', sourceId: 'CART-Q1', status: 'FIXED_PENDING_RETEST', severity: 'critical', blocking: false, leadBlocking: true, title: 'Total wrong at full discount for every cart in the store', file: 'src/cart.js', line: 11, evidence: 'node --test test/cart.test.js', history: [{ round: 1, event: 'reopened' }] },
  ];
  fs.writeFileSync(path.join(team, 'reports', 'cart-checkout', 'findings.md'), `# findings\n\n## Tracker data\n\n\`\`\`json\n${JSON.stringify(tracker, null, 2)}\n\`\`\`\n`);
  const dry = ts.migrateTeam(team);
  assert.equal(dry.items.length, 1);
  assert.equal(fs.existsSync(path.join(team, 'items')), false, 'dry run writes nothing');
  const it = dry.items[0];
  assert.deepEqual([it.key, it.pipeline, it.round, it.workflows, it.status], ['CART', 'feature', 2, true, 'running']);
  assert.deepEqual(it.findings.map((f) => [f.id, f.by, f.status, f.blocking]), [['F1', 'code-reviewer', 'verified', true], ['F2', 'qa', 'fixed', true]]);
  assert.equal(it.findings[1].reopened, 1);
  assert.ok(it.findings[1].title.split(' ').length <= 8);
  ts.migrateTeam(team, { write: true });
  assert.deepEqual(ts.validateItem(JSON.parse(fs.readFileSync(path.join(team, 'items', 'cart-checkout.json'), 'utf8')), path.join(team, 'items', 'cart-checkout.json')), []);
  assert.ok(fs.existsSync(path.join(team, 'archive', 'cart-checkout', 'findings-0.32.md')), 'findings.md archived');
  assert.ok(fs.existsSync(path.join(team, 'archive', 'STATE-0.32.md')), 'old STATE.md kept in the archive');
  assert.match(fs.readFileSync(path.join(team, 'STATE.md'), 'utf8'), /Generated from[\s\S]*\| cart-checkout \| CART \| feature · T1 \|/);
  fs.rmSync(dir, { recursive: true, force: true });
});
