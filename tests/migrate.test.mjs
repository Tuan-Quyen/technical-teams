// team-migrate.mjs on a sample .team/ in the old single-file layout: the dry run
// writes nothing, --apply splits every work-item section into its per-slug file,
// never overwrites a destination and never deletes a split source.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { kebab, plan } from '../scripts/team-migrate.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCRIPT = path.join(ROOT, 'scripts', 'team-migrate.mjs');

const OLD = {
  'STATE.md': '# Team state\n\n## Active work\n\n### W-001 — Xuất báo cáo CSV\n- **Status:** running\n\n### W-003 — Login rate limit\n- **Status:** running\n',
  'SPEC.md': [
    '# Specifications', '', '> Owner: **team-ba**', '',
    '## W-001 — Xuất báo cáo CSV · status: draft', '',
    '**Problem / goal:** export revenue', '',
    '### Acceptance criteria', '- **W-001.AC1** Given a range, when exporting, then a CSV downloads.', '',
    '```md', '## W-999 — not a heading, this is inside a fence', '```', '',
    '### Edge cases', '- **W-001.E1** empty range → header only', '',
    '## W-002 — Dark mode · status: done', '', '**Problem / goal:** dark theme', '',
  ].join('\n'),
  'PLAN.md': '# Implementation plans\n\n## W-001 — Xuất báo cáo CSV · status: draft\n\n**Approach:** stream rows\n\n**ADRs:** none\n',
  'DESIGN.md': [
    '# UI/UX design', '',
    '## Design system', '', '**Component library / theme:** shadcn/ui', '', '**Tokens:**', '| Group | Values |', '|---|---|', '| Spacing | 4 · 8 |', '',
    '## W-001 — Xuất báo cáo CSV · status: draft', '', '**Screens:**', '| Screen | URL |', '|---|---|', '| Reports | `/reports` |', '',
  ].join('\n'),
  'TASKS.md': [
    '# Tasks', '',
    '## W-001 — Xuất báo cáo CSV', '',
    '| Ticket | Summary | Status |', '|---|---|---|', '| W-001-T1 | endpoint | done |', '',
    '**Notes:** none', '',
    '### QA — W-001 · status: failed', '',
    '#### Test plan', '- **Scope in / out:** export', '',
    '#### Execution log', '- **R1** 2026-10-01 · suite: 12 passed', '- **R2** 2026-10-02 · suite: 11 passed, 1 failed', '',
    '#### Defects', '| ID | Title | Status |', '|---|---|---|', '| W-001-D1 | wrong total | open |', '| W-001-D2 | typo | closed |', '| W-001-D3 | not a bug | rejected |', '| W-001-D4 | flaky | reopened |', '| W-001-D5 | old one | moved |', '',
    '## W-003 — Login rate limit', '',
    '| Ticket | Summary | Status |', '|---|---|---|', '| W-003-T1 | limiter | todo |', '',
  ].join('\n'),
  'OPS_HANDOFF.md': '# Ops handoff\n\n## Deploy\n1. make deploy\n',
  'PRODUCT.md': '# Product\n',
  'archive/SPEC-2026-09.md': '# archived specs\n',
  'archive/TASKS-2026-09.md': '# archived tasks\n',
};

function sample() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tt-migrate-'));
  for (const [rel, text] of Object.entries(OLD)) {
    const p = path.join(dir, '.team', rel);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, text);
  }
  return dir;
}
const tree = (dir) => {
  const out = [];
  const walk = (d) => { for (const e of fs.readdirSync(path.join(dir, d), { withFileTypes: true })) (e.isDirectory() ? walk(`${d}/${e.name}`) : out.push(`${d}/${e.name}`)); };
  walk('.team');
  return out.sort();
};
const run = (dir, ...a) => spawnSync(process.execPath, [SCRIPT, ...a], { env: { ...process.env, CLAUDE_PROJECT_DIR: dir }, encoding: 'utf8' });
const readT = (dir, rel) => fs.readFileSync(path.join(dir, '.team', rel), 'utf8');

test('kebab: ASCII slug from a Vietnamese or decorated title', () => {
  assert.equal(kebab('Xuất báo cáo CSV'), 'xuat-bao-cao-csv');
  assert.equal(kebab('Đổi thông báo lỗi “email” (v2)!'), 'doi-thong-bao-loi-email-v2');
  assert.equal(kebab('one two three four five six seven eight'), 'one-two-three-four-five-six');
  assert.equal(kebab(''), '');
});

test('dry run prints the plan and writes nothing', () => {
  const dir = sample();
  const before = tree(dir);
  const r = run(dir);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /\(dry run\)/);
  assert.match(r.stdout, /write {2}requirements\/W-001-xuat-bao-cao-csv\.md/);
  assert.match(r.stdout, /move {3}OPS_HANDOFF\.md → archive\/legacy\/OPS_HANDOFF\.md/);
  assert.match(r.stdout, /nothing was written/);
  assert.deepEqual(tree(dir), before, 'the tree is untouched');
});

test('--apply splits every work-item section into its per-slug file', () => {
  const dir = sample();
  const r = run(dir, '--apply');
  assert.equal(r.status, 0, r.stderr);
  const s1 = 'W-001-xuat-bao-cao-csv';
  assert.deepEqual(tree(dir), [
    '.team/DESIGN.md', '.team/PLAN.md', '.team/PRODUCT.md', '.team/SPEC.md', '.team/STATE.md', '.team/TASKS.md',
    '.team/archive/legacy/OPS_HANDOFF.md', '.team/archive/legacy/SPEC-2026-09.md', '.team/archive/legacy/TASKS-2026-09.md',
    '.team/frontend-design/W-001-xuat-bao-cao-csv.md', '.team/frontend-design/_system.md',
    '.team/qa/W-001-xuat-bao-cao-csv.md',
    '.team/requirements/W-001-xuat-bao-cao-csv.md', '.team/requirements/W-002-dark-mode.md',
    '.team/system-design/W-001-xuat-bao-cao-csv.md',
  ].sort());
  for (const f of ['SPEC.md', 'PLAN.md', 'DESIGN.md', 'TASKS.md', 'STATE.md', 'PRODUCT.md']) assert.equal(readT(dir, f), OLD[f], `${f}: the source is unchanged`);
  assert.equal(readT(dir, 'archive/legacy/OPS_HANDOFF.md'), OLD['OPS_HANDOFF.md'], 'moved unchanged');

  const req = readT(dir, `requirements/${s1}.md`);
  assert.match(req, /^# W-001 — Xuất báo cáo CSV · requirements\n/);
  assert.match(req, /^\*\*Status:\*\* draft$/m);
  assert.match(req, /^## Acceptance criteria$/m, 'headings lifted one level');
  assert.match(req, /^## Edge cases$/m, 'the section continues past a fenced "## W-999" line');
  assert.match(req, /^## W-999 — not a heading/m, 'fenced code is copied untouched');
  assert.ok(!req.includes('Dark mode'), 'the next item is not swallowed');
  assert.ok(!fs.existsSync(path.join(dir, '.team', 'requirements', 'W-999-not-a-heading-this-is-inside.md')));
  assert.match(readT(dir, 'requirements/W-002-dark-mode.md'), /^\*\*Status:\*\* done$/m);
  assert.match(readT(dir, `system-design/${s1}.md`), /\*\*Approach:\*\* stream rows/);

  const sys = readT(dir, 'frontend-design/_system.md');
  assert.match(sys, /^# Design system\n/);
  assert.match(sys, /shadcn\/ui/);
  assert.ok(!sys.includes('/reports'), 'the design system does not carry item screens');
  const fd = readT(dir, `frontend-design/${s1}.md`);
  assert.match(fd, /`\/reports`/);
  assert.ok(!fd.includes('shadcn'), 'the item file does not carry the design system');

  const qa = readT(dir, `qa/${s1}.md`);
  assert.match(qa, /^Verdict: FAIL · Round 2\n/, 'verdict from the old status, round from the execution log');
  assert.match(qa, /^## Test plan$/m, 'headings lifted two levels');
  assert.match(qa, /\| W-001-D1 \| wrong total \| open \|/);
  assert.match(qa, /\| W-001-D2 \| typo \| verified \|/, 'closed → verified, so it does not become a follow-up ticket');
  assert.match(qa, /\| W-001-D3 \| not a bug \| dropped \|/, 'rejected → dropped');
  assert.match(qa, /\| W-001-D4 \| flaky \| open \|/, 'reopened → open');
  assert.match(qa, /\| W-001-D5 \| old one \| moved \|/, 'statuses without an equivalent are left alone');
  assert.match(readT(dir, 'TASKS.md'), /\| W-001-T1 \| endpoint \| done \|/, 'ticket statuses are not touched');
  assert.ok(!qa.includes('W-001-T1'), 'tickets stay in TASKS.md');
  assert.ok(!qa.includes('W-003'), 'the next item is not swallowed');
  assert.ok(!fs.existsSync(path.join(dir, '.team', 'qa', 'W-003-login-rate-limit.md')), 'no qa file for an item without a QA subsection');
});

test('--apply never overwrites and can be re-run', () => {
  const dir = sample();
  const mine = path.join(dir, '.team', 'requirements', 'W-001-csv-export.md');
  fs.mkdirSync(path.dirname(mine), { recursive: true });
  fs.writeFileSync(mine, 'mine');
  assert.equal(run(dir, '--apply').status, 0);
  assert.equal(fs.readFileSync(mine, 'utf8'), 'mine', 'an existing per-item file is kept');
  assert.ok(fs.existsSync(path.join(dir, '.team', 'system-design', 'W-001-csv-export.md')), 'the other folders reuse the slug that already exists for W-001');
  assert.ok(!fs.existsSync(path.join(dir, '.team', 'requirements', 'W-001-xuat-bao-cao-csv.md')), 'no second slug for the same item');
  const after = tree(dir);
  const again = run(dir, '--apply');
  assert.equal(again.status, 0, again.stderr);
  assert.match(again.stdout, /0 written, 0 moved/);
  assert.deepEqual(tree(dir), after, 'a second run changes nothing');
});

test('a new-layout or missing .team/ is left alone', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tt-migrate-'));
  assert.equal(run(dir).status, 2, 'no .team/');
  fs.mkdirSync(path.join(dir, '.team', 'requirements'), { recursive: true });
  fs.writeFileSync(path.join(dir, '.team', 'STATE.md'), '# Team state\n');
  fs.writeFileSync(path.join(dir, '.team', 'TASKS.md'), '# Tasks\n\n## W-001 — A\n\n| Ticket |\n|---|\n');
  const r = run(dir, '--apply');
  assert.equal(r.status, 0);
  assert.match(r.stdout, /nothing to migrate/);
  assert.deepEqual(plan(path.join(dir, '.team')).actions, []);
});
