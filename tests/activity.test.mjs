// Unit tests for hooks/activity.mjs (live agent tracking). Run: node --test "tests/*.test.mjs"
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.env.CLAUDE_PLUGIN_ROOT = ROOT;
const fakeHome = fs.mkdtempSync(path.join(os.tmpdir(), 'tt-home-'));
process.env.HOME = fakeHome;
process.env.USERPROFILE = fakeHome;
const { agentStarted, agentStopped, liveAgents, liveDir, STALE_MS } = await import(pathToFileURL(path.join(ROOT, 'hooks', 'activity.mjs')).href);

function project(withTeam = true) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tt-live-'));
  if (withTeam) fs.mkdirSync(path.join(dir, '.team'));
  return dir;
}
const env = (dir) => ({ CLAUDE_PROJECT_DIR: dir });
const input = (dir, role, id) => ({ agent_type: role, agent_id: id, session_id: 's1', cwd: dir });
const roles = (dir, now) => liveAgents(dir, now).map((e) => e.role);

test('start records a team agent, stop removes it; parallel agents do not collide', () => {
  const d = project();
  agentStarted(input(d, 'technical-team:developer', 'a1'), env(d));
  agentStarted(input(d, 'technical-team:developer', 'a2'), env(d));
  agentStarted(input(d, 'technical-team:dba', 'a3'), env(d));
  assert.deepEqual(roles(d).sort(), ['dba', 'developer', 'developer']);
  assert.equal(fs.readFileSync(path.join(liveDir(d), '.gitignore'), 'utf8'), '*\n', 'the directory ignores itself in git');
  agentStopped(input(d, 'technical-team:developer', 'a1'), env(d));
  assert.deepEqual(roles(d).sort(), ['dba', 'developer']);
  agentStopped(input(d, 'technical-team:developer', 'a1'), env(d)); // twice: no throw
});

test('only team agents are recorded; nothing is created without .team/ or an agent id', () => {
  const d = project();
  for (const a of ['Explore', 'developer', 'other-plugin:developer', undefined]) {
    assert.equal(agentStarted(input(d, a, 'x1'), env(d)), null, String(a));
  }
  assert.equal(agentStarted({ agent_type: 'technical-team:qa', cwd: d }, env(d)), null, 'no agent_id');
  assert.equal(fs.existsSync(liveDir(d)), false);
  const bare = project(false);
  assert.equal(agentStarted(input(bare, 'technical-team:qa', 'q1'), env(bare)), null);
  assert.equal(fs.existsSync(path.join(bare, '.team')), false, '.team/ is never created up front');
});

test('stale entries are skipped when reading and pruned at the next start', () => {
  const d = project();
  const t0 = Date.parse('2026-11-11T08:00:00Z');
  agentStarted(input(d, 'technical-team:qa', 'old'), env(d), t0);
  assert.deepEqual(roles(d, t0 + 1000), ['qa']);
  assert.deepEqual(roles(d, t0 + STALE_MS), []);
  fs.writeFileSync(path.join(liveDir(d), 'junk.json'), '{not json');
  agentStarted(input(d, 'technical-team:security', 'new'), env(d), t0 + STALE_MS);
  assert.deepEqual(fs.readdirSync(liveDir(d)).sort(), ['.gitignore', 'new.json']);
});

test('agent ids cannot escape the live directory', () => {
  const d = project();
  agentStarted(input(d, 'technical-team:qa', '../../evil'), env(d));
  assert.equal(fs.existsSync(path.join(d, 'evil.json')), false);
  assert.deepEqual(roles(d), ['qa']);
});

test('hooks end to end: SubagentStart writes, SubagentStop keeps the entry on a block and clears it on a real end', () => {
  const d = project();
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'tt-data-'));
  const run = (file, payload) => spawnSync(process.execPath, [path.join(ROOT, 'hooks', file)], {
    input: JSON.stringify(payload), encoding: 'utf8',
    env: { ...process.env, CLAUDE_PROJECT_DIR: d, CLAUDE_PLUGIN_ROOT: ROOT, CLAUDE_PLUGIN_DATA: data },
  });
  const base = input(d, 'technical-team:developer', 'e2e');
  assert.equal(run('activity.mjs', base).stdout, '', 'the activity hook never decides anything');
  assert.deepEqual(roles(d), ['developer']);
  const blocked = run('handoff-check.mjs', { ...base, last_assistant_message: 'all done' });
  assert.match(blocked.stdout, /"decision":"block"/);
  assert.deepEqual(roles(d), ['developer'], 'sent back: still running');
  const ok = run('handoff-check.mjs', { ...base, last_assistant_message: '### Handoff\n- **Result:** done\n- **Evidence:** npm test → 12 passed\n- **Files changed:** src/a.ts\n- **Open items:** none\n- **Next steps:** review' });
  assert.equal(ok.stdout, '');
  assert.deepEqual(roles(d), []);
});

test('hooks.json wires SubagentStart to the activity hook', () => {
  const hooks = JSON.parse(fs.readFileSync(path.join(ROOT, 'hooks', 'hooks.json'), 'utf8')).hooks;
  assert.match(JSON.stringify(hooks.SubagentStart), /activity\.mjs/);
  assert.match(fs.readFileSync(path.join(ROOT, 'commands', 'status.md'), 'utf8'), /\.team\/\.live\//);
});
