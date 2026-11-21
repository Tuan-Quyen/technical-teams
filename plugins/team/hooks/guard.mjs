#!/usr/bin/env node
// technical-team hooks: deterministic guards for rules that used to live only in prose.
// Applies to team specialist subagents only (agent_type "technical-team:team-*", not the lead);
// the user's own session is never touched.
//   pre-shell      PreToolUse Bash|PowerShell → deny `git commit` / `git push` (specialist rule: never commit or push)
//   pre-handback   PreToolUse SubagentHandback → a report without its Handoff (Status + Evidence) is refused
//   subagent-stop  SubagentStop → a prose reply without its Handoff (Status + Evidence) is sent back once
//   pre-write      PreToolUse Write|Edit|MultiEdit → specialists never write item state (.team/items/, .team/STATE.md);
//                  nobody hand-writes STATE.md once .team/items/ exists (it is generated)
//   post-write     PostToolUse Write|Edit|MultiEdit on .team/** (any session) → item JSON is validated and STATE.md
//                  regenerated; spec markdown gets the spec rules (no revision headings, lines ≤300, ≤4k words)
// Exit 0 with no output = no opinion. Any internal error also exits 0: a broken guard must not block work.
import { readFileSync } from 'node:fs';

const mode = process.argv[2];
let input = {};
try { input = JSON.parse(readFileSync(0, 'utf8') || '{}'); } catch { process.exit(0); }

const type = String(input.agent_type || '');
const isSpecialist = /^technical-team:team-/.test(type) && type !== 'technical-team:team-lead';
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
const hasHandoffBlock = (m) => /-\s*Status:\s*(done|blocked|needs-input)\b/i.test(m) && /-\s*Evidence:/i.test(m);

// Where the report goes out through a SubagentHandback tool call, a stop hook comes too late
// (the call ends the run), so check the call itself.
if (mode === 'pre-handback' && isSpecialist) {
  const m = String(input.tool_input?.message || '');
  if (!hasHandoffBlock(m)) {
    out({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: `${HANDOFF_HINT} Call SubagentHandback again with your report plus that block.` } });
  }
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
}

// ---- .team/ writes ----
const filePath = String(input.tool_input?.file_path || input.tool_input?.notebook_path || '').replace(/\\/g, '/');
const teamAt = filePath.lastIndexOf('/.team/');
const teamDir = teamAt >= 0 ? filePath.slice(0, teamAt + 6) : '';
const rel = teamAt >= 0 ? filePath.slice(teamAt + 7) : '';
const isState = rel === 'STATE.md' || rel.startsWith('items/');

if (mode === 'pre-write' && teamDir && isState) {
  const { existsSync } = await import('node:fs');
  const deny = (why) => out({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: why } });
  if (isSpecialist) deny('technical-team: item state (.team/items/, .team/STATE.md) belongs to the orchestrating session. Report findings, verdicts and questions in your handoff or structured output; do not write state.');
  if (rel === 'STATE.md' && existsSync(`${teamDir}/items`)) deny('technical-team: .team/STATE.md is generated from .team/items/*.json. Write the item JSON instead; the view regenerates on save.');
}

if (mode === 'post-write' && teamDir && !rel.startsWith('archive/')) {
  const ts = await import(new URL('../tools/team-state.mjs', import.meta.url));
  const { readFileSync: rf } = await import('node:fs');
  let text = '';
  try { text = rf(filePath, 'utf8'); } catch { process.exit(0); }
  const block = (reason) => out({ decision: 'block', reason });
  if (/^items\/[^/]+\.json$/.test(rel)) {
    let errs;
    try { errs = ts.validateItem(JSON.parse(text), filePath); } catch (x) { errs = [`not valid JSON: ${x.message}`]; }
    if (errs.length) block(`technical-team: ${rel} breaks the item schema (run-kit workspace § Item state): ${errs.slice(0, 8).join('; ')}. Fix the JSON.`);
    try { ts.renderTeam(teamDir); } catch { /* view only */ }
  } else if (rel.endsWith('.md') && rel !== 'STATE.md') {
    // Edit/MultiEdit: judge only the new text for line rules, so an old file is not blamed for what it already had.
    const ti = input.tool_input || {};
    const fresh = ti.new_string != null ? String(ti.new_string) : Array.isArray(ti.edits) ? ti.edits.map((x) => x.new_string || '').join('\n') : text;
    const hard = ts.specProblems(fresh).filter((p) => !/ words \(max/.test(p));
    const size = ts.stats(text).words > ts.LIMITS.specWords ? ` ${rel} is ${ts.stats(text).words} words (max ${ts.LIMITS.specWords}): do not grow it; compaction is the lead's call (workflow compact).` : '';
    if (hard.length) block(`technical-team spec rules for ${rel}: ${hard.slice(0, 6).join('; ')}.${size} Rewrite in place.`);
    if (size) out({ hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: `technical-team:${size}` } });
  }
}
process.exit(0);
