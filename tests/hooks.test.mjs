// Tests for plugins/team/hooks: hooks.json wiring and guard.mjs decisions.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'plugins/team');
const GUARD = path.join(ROOT, 'hooks/guard.mjs');
const run = (mode, input) => {
  const r = spawnSync(process.execPath, [GUARD, mode], { input: typeof input === 'string' ? input : JSON.stringify(input), encoding: 'utf8' });
  assert.equal(r.status, 0, 'guard always exits 0');
  return r.stdout ? JSON.parse(r.stdout) : null;
};
const dev = 'technical-team:team-developer';

test('hooks.json wires both guards through node and CLAUDE_PLUGIN_ROOT', () => {
  const h = JSON.parse(fs.readFileSync(path.join(ROOT, 'hooks/hooks.json'), 'utf8')).hooks;
  assert.match(h.PreToolUse[0].matcher, /Bash/);
  assert.match(h.PreToolUse[0].hooks[0].command, /^node "\$\{CLAUDE_PLUGIN_ROOT\}\/hooks\/guard\.mjs" pre-shell$/);
  const hb = h.PreToolUse.find((e) => e.matcher === '^SubagentHandback$');
  assert.ok(hb, 'SubagentHandback is guarded before the call ends the run');
  assert.match(hb.hooks[0].command, /guard\.mjs" pre-handback$/);
  assert.equal(h.SubagentStop[0].matcher, '^technical-team:team-');
  assert.match(h.SubagentStop[0].hooks[0].command, /guard\.mjs" subagent-stop$/);
});

test('pre-shell denies git commit/push for specialists only', () => {
  for (const command of ['git commit -m x', 'git add -A && git commit -am x', 'git push origin main', 'git -C repo push']) {
    assert.equal(run('pre-shell', { agent_type: dev, tool_input: { command } })?.hookSpecificOutput?.permissionDecision, 'deny', command);
  }
  for (const command of ['git status', 'git diff HEAD', 'git log --oneline', 'npm test']) {
    assert.equal(run('pre-shell', { agent_type: dev, tool_input: { command } }), null, command);
  }
  assert.equal(run('pre-shell', { tool_input: { command: 'git push' } }), null, 'user session untouched');
  assert.equal(run('pre-shell', { agent_type: 'technical-team:team-lead', tool_input: { command: 'git push' } }), null, 'lead untouched');
  assert.equal(run('pre-shell', { agent_type: 'other-plugin:x', tool_input: { command: 'git push' } }), null, 'other agents untouched');
});

test('subagent-stop sends a prose reply without Handoff back once, and never blocks structured or repeated stops', () => {
  const qa = 'technical-team:team-qa';
  assert.equal(run('subagent-stop', { agent_type: qa, last_assistant_message: 'All good, tests pass.' })?.decision, 'block');
  assert.equal(run('subagent-stop', { agent_type: qa, last_assistant_message: '### Handoff\n- Status: needs-input\n- Files: none\n- Evidence: none' }), null);
  assert.equal(run('subagent-stop', { agent_type: qa, stop_hook_active: true, last_assistant_message: 'x' }), null, 'no loop');
  assert.equal(run('subagent-stop', { agent_type: qa, last_assistant_message: '{"status":"done"}' }), null, 'workflow structured output');
  assert.equal(run('subagent-stop', { agent_type: qa, last_assistant_message: '' }), null, 'empty');
  assert.equal(run('subagent-stop', { agent_type: 'technical-team:team-lead', last_assistant_message: 'hi' }), null, 'lead untouched');
  assert.equal(run('subagent-stop', 'not json'), null, 'bad input is ignored');
});

test('pre-handback refuses a specialist report without its Handoff block', () => {
  const qa = 'technical-team:team-qa';
  const call = (agent_type, message) => run('pre-handback', { agent_type, tool_name: 'SubagentHandback', tool_input: { message } });
  assert.equal(call(qa, 'ok')?.hookSpecificOutput?.permissionDecision, 'deny');
  assert.equal(call(qa, 'ok\n### Handoff\n- Status: blocked\n- Files: none\n- Evidence: npm test failed'), null);
  assert.equal(call('technical-team:team-lead', 'ok'), null, 'lead untouched');
  assert.equal(call(undefined, 'ok'), null, 'non-team subagents untouched');
});

test('subagent-stop reads the subagent transcript when last_assistant_message is empty', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tt-hook-'));
  const write = (name, events) => { const p = path.join(dir, name); fs.writeFileSync(p, events.map((e) => JSON.stringify(e)).join('\n')); return p; };
  const text = (t) => ({ type: 'assistant', message: { content: [{ type: 'text', text: t }] } });
  const qa = 'technical-team:team-qa';
  const noHandoff = write('a.jsonl', [text('working'), text('Done, all tests pass.')]);
  const withHandoff = write('b.jsonl', [text('### Handoff\n- Status: done\n- Files: none\n- Evidence: npm test 4/4')]);
  const structured = write('c.jsonl', [text('thinking'), { type: 'assistant', message: { content: [{ type: 'tool_use', name: 'StructuredOutput', input: {} }] } }]);
  assert.equal(run('subagent-stop', { agent_type: qa, last_assistant_message: '', agent_transcript_path: noHandoff })?.decision, 'block');
  assert.equal(run('subagent-stop', { agent_type: qa, agent_transcript_path: withHandoff }), null);
  assert.equal(run('subagent-stop', { agent_type: qa, agent_transcript_path: structured }), null, 'ended on a tool call');
  const hb = (m) => ({ type: 'assistant', message: { content: [{ type: 'tool_use', name: 'SubagentHandback', input: { message: m } }] } });
  assert.equal(run('subagent-stop', { agent_type: qa, agent_transcript_path: write('d.jsonl', [hb('ok')]) })?.decision, 'block', 'handback without handoff');
  assert.equal(run('subagent-stop', { agent_type: qa, agent_transcript_path: write('e.jsonl', [hb('ok\n### Handoff\n- Status: done\n- Evidence: none')]) }), null, 'handback with handoff');
  assert.equal(run('subagent-stop', { agent_type: qa, agent_transcript_path: path.join(dir, 'missing.jsonl') }), null, 'missing transcript');
  fs.rmSync(dir, { recursive: true, force: true });
});

// ---- .team/ writes ----
const tmpTeam = () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tt-hook-'));
  fs.mkdirSync(path.join(dir, '.team', 'items'), { recursive: true });
  return dir;
};
const item = (o = {}) => ({ v: 1, slug: 'fix-discount', key: 'CART', title: 'Fix full discount total', pipeline: 'fix', tier: 'T1', step: 'qa', status: 'running', next: 'Retest F1', round: 1, findings: [{ id: 'F1', title: 'Full discount adds one cent', by: 'qa', severity: 'major', blocking: true, status: 'fixed', test: 'test/cart.test.js::100% off', reopened: 0 }], ...o });

test('hooks.json wires the .team/ write guards', () => {
  const h = JSON.parse(fs.readFileSync(path.join(ROOT, 'hooks/hooks.json'), 'utf8')).hooks;
  const pre = h.PreToolUse.find((e) => /guard\.mjs" pre-write$/.test(e.hooks[0].command));
  assert.ok(pre && /Write/.test(pre.matcher) && /Edit/.test(pre.matcher));
  assert.match(h.PostToolUse[0].matcher, /Write\|Edit/);
  assert.match(h.PostToolUse[0].hooks[0].command, /guard\.mjs" post-write$/);
});

test('pre-write: specialists never write item state; nobody hand-writes a generated STATE.md', () => {
  const dir = tmpTeam();
  const deny = (r) => r?.hookSpecificOutput?.permissionDecision === 'deny';
  assert.ok(deny(run('pre-write', { agent_type: dev, tool_input: { file_path: `${dir}/.team/items/fix-discount.json` } })));
  assert.ok(deny(run('pre-write', { agent_type: 'technical-team:team-qa', tool_input: { file_path: `${dir}\\.team\\STATE.md` } })), 'Windows paths too');
  assert.ok(deny(run('pre-write', { tool_input: { file_path: `${dir}/.team/STATE.md` } })), 'STATE.md is generated once items/ exists');
  assert.equal(run('pre-write', { tool_input: { file_path: `${dir}/.team/items/fix-discount.json` } }), null, 'the orchestrating session writes items');
  assert.equal(run('pre-write', { agent_type: dev, tool_input: { file_path: `${dir}/src/cart.js` } }), null);
  assert.equal(run('pre-write', { agent_type: 'technical-team:team-qa', tool_input: { file_path: `${dir}/.team/reports/x/qa.md` } }), null);
  const legacy = fs.mkdtempSync(path.join(os.tmpdir(), 'tt-hook-'));
  assert.equal(run('pre-write', { tool_input: { file_path: `${legacy}/.team/STATE.md` } }), null, 'a project without items/ keeps its hand-written STATE.md');
});

test('post-write: a valid item regenerates STATE.md; a bad one is sent back with the errors', () => {
  const dir = tmpTeam();
  const f = path.join(dir, '.team', 'items', 'fix-discount.json');
  fs.writeFileSync(f, JSON.stringify(item()));
  assert.equal(run('post-write', { tool_input: { file_path: f } }), null);
  const view = fs.readFileSync(path.join(dir, '.team', 'STATE.md'), 'utf8');
  assert.match(view, /\| fix-discount \| CART \| fix · T1 \| qa \| running \| 1 of 3 \| F1 \| Retest F1 \|/);
  fs.writeFileSync(f, JSON.stringify(item({ title: 'A title that is far too long for any view to show well', cap: 5, findings: [{ id: 'F1', title: 'x', by: 'qa', severity: 'major', blocking: true, status: 'open', test: '' }] })));
  const r = run('post-write', { tool_input: { file_path: f } });
  assert.equal(r.decision, 'block');
  for (const m of [/title/, /cap: not part/, /blocking finding needs test/]) assert.match(r.reason, m);
  fs.writeFileSync(f, '{ not json');
  assert.match(run('post-write', { tool_input: { file_path: f } }).reason, /not valid JSON/);
});

test('post-write: spec rules — revision headings and long lines are sent back; an old long file only gets a note', () => {
  const dir = tmpTeam();
  const f = path.join(dir, '.team', 'requirements', 'x.md');
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, '# X\n\n## Revision 2 — QA feedback\n\nok\n');
  assert.match(run('post-write', { tool_input: { file_path: f } }).reason, /revision heading/);
  fs.writeFileSync(f, `# X\n\n${'a'.repeat(301)}\n`);
  assert.match(run('post-write', { tool_input: { file_path: f } }).reason, /301 chars \(max 300\)/);
  fs.writeFileSync(f, '# X\n\n```\n## Round 3 inside a code block is fine\n```\n');
  assert.equal(run('post-write', { tool_input: { file_path: f } }), null);
  fs.writeFileSync(f, `# X\n\n${'word '.repeat(4100).replace(/((?:word ){50})/g, '$1\n')}`);
  const big = run('post-write', { tool_input: { file_path: f, old_string: 'x', new_string: 'a short new line' } });
  assert.match(big.hookSpecificOutput.additionalContext, /words \(max 4000\): do not grow it/);
  const arch = path.join(dir, '.team', 'archive', 'old.md');
  fs.mkdirSync(path.dirname(arch), { recursive: true });
  fs.writeFileSync(arch, '## Revision 9\n');
  assert.equal(run('post-write', { tool_input: { file_path: arch } }), null, 'archive/ is not checked');
});
