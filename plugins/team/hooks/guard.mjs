#!/usr/bin/env node
// technical-team hooks. Rule enforcement applies to team specialist subagents only
// (agent_type "technical-team:team-*", not the orchestrator); the user's own session is never touched.
//   pre-shell      PreToolUse Bash|PowerShell → deny `git commit` / `git push` (specialists never commit or push)
//   pre-handback   PreToolUse SubagentHandback → a report without its Handoff (### Handoff, Status, Evidence) is refused
//   subagent-stop  SubagentStop → a prose reply without its Handoff (### Handoff, Status, Evidence) is sent back once
//   both handback modes also refuse while the working tree still has ADDED lines with the temp-patch marker (non-markdown, outside .team/)
//   post-write     PostToolUse Write|Edit|MultiEdit on .team/items/*.json (any session) → regenerate STATE.md
// Exit 0 with no output = no opinion. Any internal error also exits 0: a broken guard must not block work.
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const mode = process.argv[2];
let input = {};
try { input = JSON.parse(readFileSync(0, 'utf8') || '{}'); } catch { process.exit(0); }

const type = String(input.agent_type || '');
const isSpecialist = /^technical-team:team-/.test(type) && type !== 'technical-team:team-orchestrator';
const out = (o) => { process.stdout.write(JSON.stringify(o)); process.exit(0); };

if (mode === 'pre-shell' && isSpecialist) {
  const cmd = String(input.tool_input?.command || '');
  if (/\bgit\b[^\n|;&]*\b(commit|push)\b/.test(cmd)) {
    out({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: 'technical-team: specialists never commit or push. Leave the change in the working tree and say so in your handoff; the user decides.',
      },
    });
  }
}

// last_assistant_message can arrive empty (seen on 2.1.329): fall back to the subagent transcript.
function lastAssistantText() {
  if (input.last_assistant_message) return String(input.last_assistant_message);
  const p = input.agent_transcript_path || '';
  if (!p) return '';
  try {
    const lines = readFileSync(p, 'utf8').trim().split('\n').reverse();
    for (const l of lines) {
      const e = JSON.parse(l);
      if (e.type !== 'assistant') continue;
      const c = e.message?.content;
      // The report may come as a SubagentHandback tool call ({message}) rather than as text.
      const handback = Array.isArray(c) && c.find((b) => b.type === 'tool_use' && typeof b.input?.message === 'string');
      if (handback) return handback.input.message;
      const text = Array.isArray(c) ? c.filter((b) => b.type === 'text').map((b) => b.text).join('\n') : String(c || '');
      if (text.trim()) return text;
      if (Array.isArray(c) && c.some((b) => b.type === 'tool_use')) return '{}'; // ended on another tool call (e.g. structured output)
    }
  } catch { /* unreadable transcript → no opinion */ }
  return '';
}

const HANDOFF_HINT = 'technical-team: end with your Handoff block from specialist-rules (### Handoff, then - Status: done | blocked | needs-input, - Files, - Evidence, - Next).';
const hasHandoffBlock = (m) => /^#{2,4}\s*Handoff\b/m.test(m) && /-\s*Status:\s*(done|blocked|needs-input)\b/i.test(m) && /-\s*Evidence:/i.test(m);

// A temporary data patch (test-process/references/data-patching.md) must not stay behind.
// Built from two parts so this file never contains the literal marker (the repo is dogfooded).
const MARKER = 'TEAM-TEMP' + '-PATCH';
function leftoverPatches() {
  const cwd = String(input.cwd || '');
  if (!cwd) return [];
  const git = (args) => execFileSync('git', args, { cwd, encoding: 'utf8', timeout: 5000, stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 32 * 1024 * 1024 });
  const skip = (f) => /\.md$/i.test(f) || /(^|\/)\.team\//.test(f);
  const hits = [];
  try {
    let file = '', line = 0;
    for (const l of git(['diff', '--no-color', '--no-ext-diff', '-U0', 'HEAD']).split('\n')) {
      let m;
      if ((m = l.match(/^\+\+\+ b\/(.*)$/))) file = m[1];
      else if (l.startsWith('+++ ')) file = '';
      else if ((m = l.match(/^@@ -\S+ \+(\d+)/))) line = Number(m[1]);
      else if (l.startsWith('+') && file) { if (l.includes(MARKER) && !skip(file)) hits.push(`${file}:${line}`); line++; }
    }
    for (const f of git(['ls-files', '--others', '--exclude-standard']).split('\n').filter((x) => x && !skip(x))) {
      try {
        readFileSync(`${cwd}/${f}`, 'utf8').split('\n').forEach((t, i) => { if (t.includes(MARKER)) hits.push(`${f}:${i + 1}`); });
      } catch { /* unreadable or binary → skip */ }
    }
  } catch { return []; } // not a repo, no HEAD, git missing → no opinion
  return hits;
}
const patchReason = () => {
  const hits = leftoverPatches();
  return hits.length ? `technical-team: ${MARKER} left in the working tree (${hits.slice(0, 5).join(', ')}${hits.length > 5 ? `, +${hits.length - 5} more` : ''}). Remove the ${MARKER} lines (see test-process/references/data-patching.md), then hand back.` : '';
};

// Where the report goes out through a SubagentHandback tool call, a stop hook comes too late
// (the call ends the run), so check the call itself.
if (mode === 'pre-handback' && isSpecialist) {
  const m = String(input.tool_input?.message || '');
  if (!hasHandoffBlock(m)) {
    out({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: `${HANDOFF_HINT} Call SubagentHandback again with your report plus that block.` } });
  }
  const why = patchReason();
  if (why) out({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: why } });
}

if (mode === 'subagent-stop' && isSpecialist && !input.stop_hook_active) {
  const msg = lastAssistantText();
  // Workflow runs return structured output (no prose): only check prose replies.
  const prose = msg.trim() && !/^\s*[{[]/.test(msg);
  if (prose && !hasHandoffBlock(msg)) {
    out({
      decision: 'block',
      reason: `${HANDOFF_HINT} Add it now; change nothing else.`,
    });
  }
  const why = patchReason();
  if (why) out({ decision: 'block', reason: why });
}

// ---- .team/items/*.json → regenerate the STATE.md view ----
const filePath = String(input.tool_input?.file_path || '').replace(/\\/g, '/');
const m = filePath.match(/^(.*\/\.team)\/items\/[^/]+\.json$/);
if (mode === 'post-write' && m) {
  try {
    const ts = await import(new URL('../tools/team-state.mjs', import.meta.url));
    ts.renderTeam(m[1]);
  } catch { /* view only */ }
}
process.exit(0);
