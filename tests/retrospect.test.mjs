// plugins/team/skills/retrospect/scripts/retro-miner.mjs on fake transcripts built in a temp dir: which sessions count, the day window,
// usage, guard firings, handoff status, evidence refs on the right line, redaction, dedupe, CLI output.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { collect, parseArgs, normBash, redact, renderDigest, show, workType, promptKey, DAYS } from '../plugins/team/skills/retrospect/scripts/retro-miner.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TOOL = path.join(REPO, 'plugins/team/skills/retrospect/scripts/retro-miner.mjs');
const NOW = '2026-11-22T12:00:00.000Z';
const at = (daysAgo) => new Date(Date.parse(NOW) - daysAgo * 864e5).toISOString();
const usage = { input_tokens: 10, cache_creation_input_tokens: 100, cache_read_input_tokens: 1000, output_tokens: 20 };
const HINT = 'technical-team: end with your Handoff block from specialist-rules (### Handoff, then - Status: done | blocked | needs-input, - Files, - Evidence, - Next).';

const user = (text, ts, extra = {}) => ({ type: 'user', timestamp: ts, cwd: '/w/app', uuid: extra.uuid, message: { role: 'user', content: text }, ...extra });
const tool = (name, input, ts, id = `t-${name}`) => ({ type: 'assistant', timestamp: ts, message: { role: 'assistant', model: 'claude-sonnet-5-5', usage, content: [{ type: 'tool_use', id, name, input }] } });
const result = (id, text, ts, isError = false) => ({ type: 'user', timestamp: ts, message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: id, content: text, is_error: isError }] } });
const say = (text, ts) => ({ type: 'assistant', timestamp: ts, message: { role: 'assistant', model: 'claude-sonnet-5-5', usage, content: [{ type: 'text', text }] } });
const write = (f, rows) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, rows.map((r) => JSON.stringify(r)).join('\n') + '\n'); };

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'retro-'));
  const t = at(2);
  const main = [
    user('<command-name>/technical-team:feature</command-name>\n<command-args>add export</command-args>', t, { uuid: 'first-1' }), // L1
    tool('Agent', { subagent_type: 'technical-team:team-developer', description: 'Build export' }, t, 'a1'), // L2
    tool('Workflow', { name: 'technical-team:team-build-loop', args: {} }, t), // L3
    user('no, wrong file; my token=abcd1234secret', t), // L4
    user('[Request interrupted by user]', t), // L5
    tool('Edit', { file_path: '/w/app/src/a.js', old_string: 'a', new_string: 'b' }, t), // L6
    { type: 'system', subtype: 'compact_boundary', timestamp: t }, // L7
    tool('Agent', { subagent_type: 'Explore', description: 'find export code' }, t, 'x1'), // L8
  ];
  const sdir = path.join(root, 'projA', 's1', 'subagents');
  write(path.join(root, 'projA', 's1.jsonl'), main);
  write(path.join(sdir, 'agent-a1.jsonl'), [
    tool('Bash', { command: 'cd /w/app && npm test -- --watch' }, t, 'b1'), // L1
    result('b1', 'Exit code 1\nFAIL a.test.js', t, true), // L2
    { type: 'attachment', timestamp: t, attachment: { type: 'hook_blocking_error', hookEvent: 'SubagentStop', blockingError: { blockingError: HINT } } }, // L3
    say('Done.\n### Handoff\n- Status: blocked\n- Evidence: npm test fails', at(1.9)), // L4
  ]);
  fs.writeFileSync(path.join(sdir, 'agent-a1.meta.json'), JSON.stringify({ agentType: 'technical-team:team-developer', model: 'claude-sonnet-5-5', description: 'Build export' }));
  // Workflow agents: one returns StructuredOutput (its Next names a role that no longer exists), one ends without a Handoff.
  write(path.join(sdir, 'workflows', 'wf_1', 'agent-w1.jsonl'), [tool('Skill', { skill: 'technical-team:test-process' }, t),
    tool('StructuredOutput', { status: 'done', verdict: 'PASS', handoff: '### Handoff\n- Status: done\n- Evidence: 3 pass\n- Next: team-lead — close' }, t)]);
  fs.writeFileSync(path.join(sdir, 'workflows', 'wf_1', 'agent-w1.meta.json'), JSON.stringify({ agentType: 'technical-team:team-qa' }));
  write(path.join(sdir, 'workflows', 'wf_1', 'agent-w2.jsonl'), [say('All good, nothing else.', t)]);
  fs.writeFileSync(path.join(sdir, 'workflows', 'wf_1', 'agent-w2.meta.json'), JSON.stringify({ agentType: 'technical-team:team-writer' }));
  // A workflow journal is not an agent run.
  write(path.join(sdir, 'workflows', 'wf_1', 'journal.jsonl'), [say('journal entry', t)]);
  // A probe: one tiny agent run, no command → left out.
  write(path.join(root, 'projD', 'p1.jsonl'), [tool('Agent', { subagent_type: 'technical-team:team-ba', description: 'probe' }, t, 'p'), user('spawn the subagent again', t, { uuid: 'first-4' })]);
  write(path.join(root, 'projA', 's2.jsonl'), [user('plain session, no plugin', t, { uuid: 'first-2' })]);
  // An agent run of this session from before the window: not counted.
  write(path.join(sdir, 'agent-old.jsonl'), [say('old run', at(30))]);
  fs.writeFileSync(path.join(sdir, 'agent-old.meta.json'), JSON.stringify({ agentType: 'technical-team:team-ba' }));
  // Older than the window: excluded by mtime.
  const old = path.join(root, 'projB', 'old.jsonl');
  write(old, [user('<command-name>/technical-team:run</command-name>', at(40), { uuid: 'first-3' })]);
  fs.utimesSync(old, new Date(at(40)), new Date(at(40)));
  // A copied project: same transcript under another folder counts once.
  fs.mkdirSync(path.join(root, 'projC'));
  fs.copyFileSync(path.join(root, 'projA', 's1.jsonl'), path.join(root, 'projC', 's9.jsonl'));
  // A scratchpad session with a command: a probe all the same.
  write(path.join(root, 'C--Temp-claude-x-scratchpad-gateA', 'g1.jsonl'), [user('<command-name>/technical-team:run</command-name>', t, { uuid: 'first-5' })]);
  write(path.join(root, 'C--Temp-claude-y-scratchpad-w2', 'g2.jsonl'), [user('test the other plugin please', t, { uuid: 'first-7' })]);
  // Plugin development in a repo that no longer exists: it edited plugin source.
  write(path.join(root, 'projOld', 'd1.jsonl'), [user('<command-name>/technical-team:run</command-name>', t, { uuid: 'first-6', cwd: '/gone/plugin-repo' }),
    tool('Edit', { file_path: '/gone/plugin-repo/plugins/team/agents/team-qa.md', old_string: 'a', new_string: 'b' }, t)]);
  return root;
}

test('parseArgs clamps the window and drops an unsubstituted session id', () => {
  assert.equal(parseArgs([]).days, DAYS.def);
  const o = parseArgs(['3', '--exclude-session', '${CLAUDE_SESSION_ID}']);
  assert.equal(o.days, DAYS.min);
  assert.match(o.notes[0], /clamped/);
  assert.equal(o.excludeSession, undefined);
  assert.equal(parseArgs(['--days', '90']).days, DAYS.max);
});

test('normBash keys a command by its plain leading words; redact hides secrets', () => {
  assert.equal(normBash('cd /w/app && npm test -- --watch'), 'npm test');
  assert.equal(normBash('git status --short'), 'git status');
  assert.equal(normBash('cat a.txt'), null);
  assert.equal(normBash('python - <<EOF\nprint(1)\nEOF'), null);
  assert.equal(redact('key sk-abcdefghijklmnopqrstu and password: hunter2'), 'key [REDACTED] and [REDACTED]');
});

test('collect keeps plugin sessions in the window, once, with usage and signals', () => {
  const root = fixture();
  const d = collect({ root, now: NOW, days: 14 });
  assert.equal(d.meta.pluginSessions, 1, 'plain, old and copied sessions do not count');
  const s = d.sessions[0];
  assert.equal(s.ref, 'projA/s1.jsonl');
  assert.deepEqual(d.signals.usage.commands, { feature: 1 });
  assert.deepEqual(d.signals.usage.skills, { 'test-process': 1 }, 'skills loaded inside a specialist count');
  assert.deepEqual(d.signals.usage.workflows, { 'team-build-loop': 1 });
  assert.deepEqual(d.signals.usage.agents, { 'team-developer': 1, 'team-qa': 1, 'team-writer': 1 }, 'journal.jsonl and the old run do not count');
  assert.equal(d.meta.probeSessionsExcluded, 3, 'a tiny run and scratchpad sessions (plugin or not) are probes');
  assert.ok(!d.signals.inventory.some((r) => r.example?.ref.includes('scratchpad')), 'scratchpad prompts stay out of the work inventory');
  assert.equal(d.meta.devSessionsExcluded, 1, 'a session that edited plugin source is plugin development');
  assert.equal(s.agents.find((a) => a.type === 'technical-team:team-qa').workflow, 'wf_1');

  const ids = d.signals.list.map((x) => x.id);
  const guard = d.signals.list.find((x) => x.id === 'guard-handoff-missing-team-developer');
  assert.ok(guard, `guard signal in ${ids}`);
  assert.equal(guard.evidence[0].ref, 'projA/s1/subagents/agent-a1.jsonl:L3', 'ref points at the line');
  assert.ok(ids.includes('handoff-blocked-team-developer'));
  assert.ok(ids.includes('handoff-missing-team-writer'));
  const qa = s.agents.find((a) => a.type === 'technical-team:team-qa');
  assert.equal(qa.status, 'done', 'StructuredOutput handoff is read');
  assert.ok(ids.includes('invalid-next-team-qa'), 'Next: team-lead names no shipped role');
  assert.equal(s.corrections[0].actor, 'workflow:team-build-loop', 'the correction is charged to the last team piece of the turn');
  assert.equal(s.corrections[0].ref, 'projA/s1.jsonl:L4');
  assert.ok(s.prompts[0].withTeam, 'a command prompt used the team');
  assert.ok(!s.prompts[1].withTeam);
  assert.ok(d.signals.metrics.handoffCompliancePct > 0);
  assert.ok(d.signals.inventory.some((r) => r.type === 'feature'));
  assert.ok(ids.includes('compactions'));
  assert.ok(!ids.some((x) => x.startsWith('unused-')), 'too few sessions to call anything unused');
  assert.equal(s.leadEdits[0].ref, 'projA/s1.jsonl:L6');
  assert.equal(s.otherAgents[0].type, 'Explore');
  assert.equal(s.interrupts.length, 1);
  assert.match(s.prompts[1].snippet, /\[REDACTED\]/);
  assert.doesNotMatch(JSON.stringify(d), /abcd1234secret/);
  assert.match(renderDigest(d), /projA\/s1\/subagents\/agent-a1\.jsonl:L3/);
});

test('collect skips the excluded session and other projects on --project', () => {
  const root = fixture();
  assert.equal(collect({ root, now: NOW, excludeSession: 's1' }).meta.pluginSessions, 1, 'the copy in projC remains');
  assert.equal(collect({ root, now: NOW, project: 'projB' }).meta.pluginSessions, 0);
});

test('CLI writes digest.md and digest.json', () => {
  const root = fixture();
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'retro-out-'));
  const r = spawnSync(process.execPath, [TOOL, '--root', root, '--now', NOW, '--out', out], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /1 plugin sessions/);
  assert.match(fs.readFileSync(path.join(out, 'digest.md'), 'utf8'), /^# Retrospect digest/);
  assert.equal(JSON.parse(fs.readFileSync(path.join(out, 'digest.json'), 'utf8')).meta.pluginSessions, 1);
});

test('workType, promptKey and --show', () => {
  assert.equal(workType('sửa lỗi đăng nhập'), 'fix');
  assert.equal(workType('add an export button'), 'feature');
  assert.equal(workType('why is this slow?'), 'question');
  assert.equal(promptKey('Run "npm test" in /w/app 3 times!'), promptKey('run "x" in /other/dir 5 times'));
  const root = fixture();
  const out = show('projA/s1.jsonl:L4', { root, radius: 1 });
  assert.match(out, /▶ L4 user/);
  assert.match(out, /L3 assistant.*\[Workflow\]/);
  assert.doesNotMatch(out, /abcd1234secret/);
  assert.match(show('../../etc/passwd.jsonl:L1', { root }), /outside|cannot read/);
});
