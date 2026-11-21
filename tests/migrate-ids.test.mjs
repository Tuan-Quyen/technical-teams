// plugins/team/tools/migrate-ids.mjs on a fixture .team/ with old IDs: dry run, write, backup, idempotence, shared
// files left for a human, and the migrated state and tracker accepted by the real workflow gate (checkState).
// Run from the repo root: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { migrate, deriveKey } from '../plugins/team/tools/migrate-ids.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TOOL = path.join(REPO, 'plugins/team/tools/migrate-ids.mjs');

const tracker = [
  { id: 'F-001', origin: 'QA', sourceId: 'Q-01', status: 'REOPENED', severity: 'major', blocking: true, title: 'save fails', file: 'src/a.js', line: 1, requirement: 'AC-1', relatedTo: [], history: [{ round: 1, event: 'fix', trigger: 'QA' }] },
  { id: 'F-002', origin: 'CODE_REVIEW', sourceId: 'R-01', status: 'VERIFIED', severity: 'blocking', blocking: true, title: 'null deref', file: 'src/a.js', line: 9, relatedTo: ['F-001'], history: [] },
];
const files = {
  'STATE.md': `# Team state

## Active work

| Slug | Pipeline | Step | Agent | Ticket | Files in use | Status | Workflows | Next step |
|---|---|---|---|---|---|---|---|---|
| cart-checkout | feature | 8 | team-qa | T-2 | src/a.js | running | yes | retest F-001 |
| user-login | fix | 3 | team-developer | T-1 | src/l.js | running | no | fix T-1 |

### Notes
- cart-checkout: F-002 verified by review

## QA-Fix state

| Slug | Fix rounds | Cap | Last F-ID | Review fixes |
|---|---|---|---|---|
| cart-checkout | 1 | 3 | 2 | 0 |

## Approvals

| Slug | Round | Scope | Reason | User's reply (verbatim) | Date |
|---|---|---|---|---|---|
`,
  'TASKS.md': `# Tasks

> Owner: **team-pm** — tickets and status.

## cart-checkout — Checkout

| Ticket | Summary | Owner | Files | Depends on | Size | ACs | Status |
|---|---|---|---|---|---|---|---|
| T-1 | add pay button | developer | src/a.js | – | S | AC1 | done |
| T-2 | save order | developer | src/b.js | T-1 | M | AC2, AC-3 | doing |

Done: T-1..T-1

## user-login — Login

| Ticket | Summary | Owner | Files | Depends on | Size | ACs | Status |
|---|---|---|---|---|---|---|---|
| T-1 | lock after 5 tries | developer | src/l.js | – | S | AC1 | doing |
`,
  'reports/cart-checkout/findings.md': `# cart-checkout — findings\n\n| ID | Title |\n|---|---|\n| F-001 | save fails |\n\n## Tracker data\n\n\`\`\`json\n${JSON.stringify(tracker, null, 2)}\n\`\`\`\n`,
  'reports/cart-checkout/qa.md': 'Verdict: FAIL · QA-Fix round 1/3\n\n| F-001 | save fails | major | ac-violation | developer | R1 | REOPENED |\nQ-01 cross-ref; T-2 covers AC1; UTF-8 and HTTP-2 untouched\n',
  'requirements/user-login.md': '# Login\n\n- AC1: lock after 5 failed tries\n- AC2: unlock by email\n',
  'requirements/cart-checkout.md': '# Checkout\n\n- AC1: pay\n- AC2: save\n- AC3: receipt\n',
  'PRODUCT.md': '# Product\n\nLogin: AC2 (unlock by email). Shared: AC1.\n',
  'ARCHITECTURE.md': '# Architecture\n\nSee T-1 for the pay button.\n',
};
const fixture = () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'migrate-ids-'));
  for (const [f, t] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, '.team', f)), { recursive: true });
    fs.writeFileSync(path.join(root, '.team', f), t);
  }
  return root;
};
const read = (root, f) => fs.readFileSync(path.join(root, '.team', f), 'utf8');

test('keys come from the slug and never collide', () => {
  const taken = new Set();
  const k1 = deriveKey('cart-checkout', taken); taken.add(k1);
  const k2 = deriveKey('cart-refund', taken); taken.add(k2);
  const k3 = deriveKey('cart', taken); taken.add(k3);
  assert.equal(k1, 'CART');
  assert.notEqual(k2, k1);
  assert.ok([k1, k2, k3].every((k) => /^[A-Z][A-Z0-9]{1,5}$/.test(k)) && new Set([k1, k2, k3]).size === 3, `${k1} ${k2} ${k3}`);
  assert.match(deriveKey('2fa-setup', new Set()), /^[A-Z][A-Z0-9]{1,5}$/, 'a slug starting with a digit still gets a valid key');
});

test('dry run changes nothing and reports what it would do', () => {
  const root = fixture();
  const before = read(root, 'TASKS.md');
  const r = migrate(root);
  assert.deepEqual(r.keys, { 'cart-checkout': 'CART', 'user-login': 'USER' });
  assert.equal(r.written, false);
  assert.equal(read(root, 'TASKS.md'), before);
  assert.ok(r.changes.some((c) => c.file === '.team/TASKS.md'));
  assert.deepEqual(r.ambiguous.map((a) => a.file).sort(), ['.team/ARCHITECTURE.md', '.team/PRODUCT.md'], 'shared files with IDs several items define are left for a human');
  assert.match(r.ambiguous.find((a) => a.file === '.team/ARCHITECTURE.md').ids[0], /^T-1 \(line 3\)$/, 'with the line');
  assert.equal(fs.readdirSync(root).filter((d) => d.startsWith('.team.bak')).length, 0);
});

test('--write migrates every item file, checks it, leaves no backup, and a second run changes nothing', () => {
  const root = fixture();
  const r = migrate(root, { write: true, stamp: 'test' });
  assert.equal(r.written, true);
  assert.deepEqual(fs.readdirSync(root).filter((d) => d.startsWith('.team.bak')), [], 'the temporary backup is removed after the check');

  const tasks = read(root, 'TASKS.md');
  assert.match(tasks, /^## cart-checkout · CART — Checkout$/m);
  assert.match(tasks, /\| CART-T2 \| save order \| developer \| src\/b\.js \| CART-T1 \| M \| CART-AC2, CART-AC3 \|/);
  assert.match(tasks, /Done: CART-T1\.\.CART-T1/);
  assert.match(tasks, /^## user-login · USER — Login$/m);
  assert.match(tasks, /\| USER-T1 \| lock after 5 tries .* USER-AC1 \|/, 'each section gets its own key');
  assert.match(tasks, /^> IDs: `<KEY>-T<n>`/m, 'legend added');

  const state = read(root, 'STATE.md');
  assert.match(state, /\| Slug \| Key \| Pipeline \|/);
  assert.match(state, /\| cart-checkout \| CART \| feature \| 8 \| team-qa \| CART-T2 \| src\/a\.js \| running \| yes \| retest CART-B1 \|/);
  assert.match(state, /\| user-login \| USER \| fix \| .* \| USER-T1 \| .* fix USER-T1 \|/);
  assert.match(state, /\| Slug \| Key \| Fix rounds \| Last bug no\. \| Review fixes \|\n\|---\|---\|---\|---\|---\|\n\| cart-checkout \| CART \| 1 \| 2 \| 0 \|/, 'Cap dropped, Key added, numbers kept');
  assert.match(state, /^- cart-checkout: CART-B2 verified by review$/m);
  assert.match(state, /^## Approvals \(audit log\)$/m);

  const qa = read(root, 'reports/cart-checkout/qa.md');
  assert.match(qa, /\| CART-B1 \| save fails/);
  assert.match(qa, /CART-Q1 cross-ref; CART-T2 covers CART-AC1; UTF-8 and HTTP-2 untouched/, 'gate IDs get the key; look-alikes stay');
  assert.match(read(root, 'requirements/user-login.md'), /- USER-AC1: lock .*\n- USER-AC2:/);
  assert.match(read(root, 'ARCHITECTURE.md'), /See T-1 for/, 'T-1 exists in both items: the shared file keeps it');
  assert.match(read(root, 'PRODUCT.md'), /Login: AC2 \(unlock by email\)\. Shared: AC1\./, 'AC1 and AC2 are defined by both items: left as they are');

  const again = migrate(root, { write: true, stamp: 'again' });
  assert.deepEqual(again.changes, [], 'idempotent');
  assert.equal(fs.existsSync(path.join(root, '.team.bak-again')), false, 'no backup when nothing changes');
  const kept = fixture();
  const k = migrate(kept, { write: true, keepBackup: true, stamp: 'kept' });
  assert.ok(k.backup && fs.existsSync(path.join(kept, '.team.bak-kept', 'TASKS.md')), '--keep-backup keeps it');
  assert.match(fs.readFileSync(path.join(kept, '.team.bak-kept', 'TASKS.md'), 'utf8'), /\| T-1 \| add pay button/, 'the backup holds the old text');
  assert.deepEqual(again.keys, r.keys, 'keys are read back from the migrated files');
});

test('the migrated tracker keeps stable IDs for the one-time move into item JSON', () => {
  const root = fixture();
  migrate(root, { write: true, stamp: 'x' });
  const md = read(root, 'reports/cart-checkout/findings.md');
  const migrated = JSON.parse(md.match(/```json\n([\s\S]*?)\n```/)[1]);
  assert.deepEqual(migrated.map((e) => e.id), ['CART-B1', 'CART-B2']);
  assert.deepEqual(migrated[1].relatedTo, ['CART-B1']);
  assert.equal(migrated[0].sourceId, 'CART-Q1');
});

test('an ID one item defines gets that key, also in shared files and other items\' files', () => {
  const root = fixture();
  fs.writeFileSync(path.join(root, '.team', 'requirements', 'user-login.md'), '# Login\n\n- AC7: lock\n');
  fs.writeFileSync(path.join(root, '.team', 'PRODUCT.md'), '# Product\n\nLogin locks (AC7); checkout AC3.\n');
  fs.mkdirSync(path.join(root, '.team', 'reports', 'fix-lock'), { recursive: true });
  fs.writeFileSync(path.join(root, '.team', 'reports', 'fix-lock', 'qa.md'), 'Regression: AC7 holds; T-1 done\nAlso T-1.\nSee cart-checkout T-1.\n');
  const r = migrate(root, { write: true });
  assert.match(read(root, 'PRODUCT.md'), /Login locks \(USER-AC7\); checkout CART-AC3\./, 'a shared file gets the defining item');
  const fix = read(root, 'reports/fix-lock/qa.md');
  assert.match(fix, /^Regression: USER-AC7 holds; USER-T1 done$/m, 'a fix cites the feature AC; T-1 follows the other ID on its line');
  assert.match(fix, /^Also T-1\.$/m, 'no clue on the line and two items define T-1: left');
  assert.match(fix, /^See cart-checkout CART-T1\.$/m, 'an item named on the line wins');
  assert.ok(r.ambiguous.some((a) => a.file.endsWith('fix-lock/qa.md') && a.ids.includes('T-1 (line 2)')));
  const sh = fixture();
  migrate(sh, { write: true, shared: 'cart-checkout' });
  assert.match(read(sh, 'ARCHITECTURE.md'), /See CART-T1 for/, '--shared names the item of shared files');
});

test('edge cases, decisions, milestones, gate IDs, ranges, and --all for source files', () => {
  const root = fixture();
  const w = (f, t) => { fs.mkdirSync(path.dirname(path.join(root, f)), { recursive: true }); fs.writeFileSync(path.join(root, f), t); };
  w('.team/requirements/cart-checkout.md', '# Checkout\n\n- AC1 pay\n- AC2 save\n- AC3 receipt\n- AC4 email\n| E1 | empty cart | message |\n- Q-D1: no guest checkout\n');
  w('.team/system-design/cart-checkout.md', '# Design\n\n### M1 — skeleton\n### M2 — pay\nCovers AC1-AC4 and E1; decision Q-D1.\n');
  w('.team/reports/cart-checkout/review.md', '| R-01 | blocking | `src/pay.ts:3` | retry loop never stops on network error |\n');
  w('.team/reports/user-login/review.md', '| R-01 | suggestion | `src/l.ts:9` | lockout counter not reset after a password change |\n');
  w('src/pay.test.ts', "describe('pay (AC1-AC4, E1)', () => {})\n// retry loop stops on network error (R-01)\n// R-01 again, no clue\n");
  w('node_modules/x/readme.md', 'AC1 T-1\n');
  const dry = migrate(root);
  assert.ok(!dry.changes.some((c) => c.file.startsWith('src/')), 'without --all only .team/');
  const r = migrate(root, { write: true, all: true });
  const t = (f) => fs.readFileSync(path.join(root, f), 'utf8');
  assert.match(t('.team/requirements/cart-checkout.md'), /\| CART-E1 \| empty cart[\s\S]*- CART-D1: no guest/);
  assert.match(t('.team/system-design/cart-checkout.md'), /### CART-M1 — skeleton\n### CART-M2 — pay\nCovers CART-AC1-CART-AC4 and CART-E1; decision CART-D1\./, 'ranges like AC1-AC4 get both ends');
  assert.match(t('.team/reports/cart-checkout/review.md'), /^\| CART-R1 \|/);
  assert.match(t('.team/reports/user-login/review.md'), /^\| USER-R1 \|/, 'each gate report gets its own key');
  const src = t('src/pay.test.ts');
  assert.match(src, /describe\('pay \(CART-AC1-CART-AC4, CART-E1\)'/, 'source comments and test names');
  assert.match(src, /retry loop stops on network error \(CART-R1\)/, 'two items have R-01: the line matched cart\'s finding');
  assert.match(src, /\/\/ R-01 again, no clue/, 'no match: left');
  assert.ok(r.guessed.some((g) => g.file === 'src/pay.test.ts' && /R-01 → CART-R1 \(line 2\)/.test(g.ids[0])), 'a content match is listed for review');
  assert.ok(r.ambiguous.some((a) => a.file === 'src/pay.test.ts' && a.ids.includes('R-01 (line 3)')));
  assert.equal(t('node_modules/x/readme.md'), 'AC1 T-1\n', 'node_modules is never touched');
  assert.deepEqual(migrate(root, { all: true }).changes, [], 'idempotent with --all');
});

test('a failed check restores .team/ unchanged', () => {
  const root = fixture();
  const md = path.join(root, '.team', 'reports', 'cart-checkout', 'findings.md');
  fs.writeFileSync(md, fs.readFileSync(md, 'utf8').replace('"F-002"', '"X-2"'));
  const before = read(root, 'TASKS.md');
  assert.throws(() => migrate(root, { write: true, stamp: 'bad' }), /restored unchanged: .*"X-2" is not CART-B<n>/);
  assert.equal(read(root, 'TASKS.md'), before);
  assert.deepEqual(fs.readdirSync(root).filter((d) => d.startsWith('.team.bak')), []);
});

test('CLI: dry run by default, --key overrides, bad key refused', () => {
  const root = fixture();
  const out = execFileSync(process.execPath, [TOOL, root, '--key', 'user-login=AUTH'], { encoding: 'utf8' });
  assert.match(out, /AUTH\s+user-login\s+\(given\)/);
  assert.match(out, /Dry run/);
  assert.match(read(root, 'TASKS.md'), /\| T-1 \|/, 'nothing written');
  assert.throws(() => execFileSync(process.execPath, [TOOL, root, '--key', 'user-login=auth'], { encoding: 'utf8', stdio: 'pipe' }), /a key is 2-6 capitals/);
  execFileSync(process.execPath, [TOOL, root, '--write', '--key', 'user-login=AUTH'], { encoding: 'utf8' });
  assert.match(read(root, 'TASKS.md'), /^## user-login · AUTH — Login$/m);
});
