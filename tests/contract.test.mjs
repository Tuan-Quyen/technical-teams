// Public-contract tests (redesign P1). They pin only what users and existing projects
// depend on: plugin id, slash entry points, agent names, .team/ paths and the handoff
// fields. Internals may change freely; a contract change must be declared in
// tests/contract.json (deprecated/removed) and in CHANGELOG.md.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT = path.join(REPO, 'plugins/team');
const read = (p) => fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
const exists = (p) => fs.existsSync(path.join(ROOT, p));
const contract = JSON.parse(read(path.join(REPO, 'tests/contract.json')));
const changelog = fs.existsSync(path.join(REPO, 'CHANGELOG.md')) ? read(path.join(REPO, 'CHANGELOG.md')) : '';
const docs = (dir) => (fs.existsSync(path.join(ROOT, dir))
  ? fs.readdirSync(path.join(ROOT, dir), { recursive: true }).filter((f) => f.endsWith('.md')).map((f) => read(path.join(ROOT, dir, f)))
  : []);
const allDocs = ['agents', 'commands', 'skills', 'templates'].flatMap(docs).join('\n');

// Frozen at 0.31.0. Never edit these lists: they are what shipped.
const V031_ENTRY = ['crew', 'feature', 'fix', 'infra', 'new', 'release', 'review', 'run', 'test'];
const V031_AGENTS = ['architect', 'ba', 'code-reviewer', 'dba', 'debugger', 'designer', 'developer', 'devops',
  'lead', 'pm', 'qa', 'security', 'writer'].map((a) => `team-${a}`);
const V031_WORKSPACE = ['.team/STATE.md', '.team/TASKS.md', '.team/PRODUCT.md', '.team/ARCHITECTURE.md', '.team/CREW.md',
  '.team/requirements/', '.team/system-design/', '.team/frontend-design/', '.team/adr/', '.team/reports/', '.team/archive/'];

function checkSection(name, frozen, section, resolves) {
  for (const id of frozen) {
    const entry = section[id];
    assert.ok(entry, `${name} "${id}" shipped in 0.31.0 and must stay in tests/contract.json (mark it deprecated or removed instead of deleting it)`);
    assert.ok(['stable', 'deprecated', 'removed'].includes(entry.status), `${name} "${id}": unknown status ${entry.status}`);
    if (entry.status === 'removed') {
      assert.ok(entry.since, `${name} "${id}" removed: needs "since"`);
      assert.match(changelog, new RegExp(`Removed[\\s\\S]*${id.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}`), `${name} "${id}" removed: CHANGELOG.md must list it under Removed`);
      assert.ok(!resolves(id), `${name} "${id}" is marked removed but still exists`);
    } else {
      assert.ok(resolves(id), `${name} "${id}" is ${entry.status} but does not resolve`);
      if (entry.status === 'deprecated') {
        assert.ok(entry.since && entry.replacement, `${name} "${id}" deprecated: needs "since" and "replacement"`);
        assert.match(changelog, new RegExp(`Deprecated[\\s\\S]*${id.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}`), `${name} "${id}" deprecated: CHANGELOG.md must list it under Deprecated`);
      }
    }
  }
}

test('contract: plugin and marketplace ids are unchanged', () => {
  assert.equal(JSON.parse(read(path.join(ROOT, '.claude-plugin/plugin.json'))).name, contract.plugin.name);
  const mkt = JSON.parse(read(path.join(REPO, '.claude-plugin/marketplace.json')));
  assert.equal(mkt.name, contract.plugin.marketplace);
  assert.ok(mkt.plugins.some((p) => p.name === contract.plugin.name), 'marketplace still lists the plugin');
});

test('contract: every 0.31.0 slash entry point resolves as a command or a skill', () => {
  checkSection('entry point', V031_ENTRY, contract.entryPoints,
    (id) => exists(`commands/${id}.md`) || exists(`skills/${id}/SKILL.md`));
});

test('contract: every 0.31.0 agent name resolves', () => {
  checkSection('agent', V031_AGENTS, contract.agents, (id) => exists(`agents/${id}.md`));
});

test('contract: every 0.31.0 .team/ path is still documented, and STATE.md stays the resume point', () => {
  checkSection('workspace path', V031_WORKSPACE, contract.workspace, (p) => allDocs.includes(p));
  const run = exists('commands/run.md') ? read(path.join(ROOT, 'commands/run.md')) : read(path.join(ROOT, 'skills/run/SKILL.md'));
  assert.match(run + allDocs, /\.team\/STATE\.md/, 'the resume entry point is documented');
});

test('contract: handoff keeps its Status values and Evidence field', () => {
  for (const f of contract.handoff.fields) assert.match(allDocs, new RegExp(`- ${f}:`), `handoff field "${f}:" is documented`);
  for (const v of contract.handoff.statusValues) assert.match(allDocs, new RegExp(`Status: [^\\n]*\\b${v}\\b`), `handoff Status value "${v}" is documented`);
});
