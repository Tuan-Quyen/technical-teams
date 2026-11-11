#!/usr/bin/env node
// technical-team activity: records which team agents are running right now, so
// `/technical-team:status` can mark them live.
//
//   SubagentStart (this file as the hook)  -> writes .team/.live/<agent_id>.json
//   SubagentStop  (via handoff-check.mjs)  -> removes it, once the agent really
//                                             ends (not when it is sent back)
//
// One file per agent: agents of a parallel group start in the same instant, and
// a shared file would lose entries. The directory ignores itself in git. Nothing
// is written unless `.team/` already exists, and every failure is silent: this
// hook only observes, it never blocks or delays an agent.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { roleOf, teamAgentKind } from './guard.mjs';

export const STALE_MS = 12 * 60 * 60 * 1000; // a session that died leaves entries behind

function projectDirOf(input, env) {
  return env.CLAUDE_PROJECT_DIR || (input && input.cwd) || process.cwd();
}

export function liveDir(projectDir) {
  return path.join(projectDir, '.team', '.live');
}

function entryFile(projectDir, agentId) {
  return path.join(liveDir(projectDir), String(agentId).replace(/[^A-Za-z0-9_-]/g, '_') + '.json');
}

// Entries still considered running, oldest first. Unreadable or stale ones are skipped.
export function liveAgents(projectDir, now = Date.now()) {
  let names = [];
  try { names = fs.readdirSync(liveDir(projectDir)); } catch { return []; }
  const out = [];
  for (const n of names) {
    if (!n.endsWith('.json')) continue;
    try {
      const e = JSON.parse(fs.readFileSync(path.join(liveDir(projectDir), n), 'utf8'));
      const t = Date.parse(e.started);
      if (e.role && Number.isFinite(t) && now - t < STALE_MS) out.push(e);
    } catch {}
  }
  return out.sort((a, b) => Date.parse(a.started) - Date.parse(b.started));
}

function prune(projectDir, now) {
  let names = [];
  try { names = fs.readdirSync(liveDir(projectDir)); } catch { return; }
  for (const n of names) {
    if (!n.endsWith('.json')) continue;
    const f = path.join(liveDir(projectDir), n);
    try {
      const t = Date.parse(JSON.parse(fs.readFileSync(f, 'utf8')).started);
      if (!Number.isFinite(t) || now - t >= STALE_MS) fs.unlinkSync(f);
    } catch { try { fs.unlinkSync(f); } catch {} }
  }
}

// Returns the entry written, or null when nothing was recorded.
export function agentStarted(input, env = process.env, now = Date.now()) {
  try {
    if (!input || !input.agent_id || !teamAgentKind(input, env)) return null;
    const projectDir = projectDirOf(input, env);
    if (!fs.existsSync(path.join(projectDir, '.team'))) return null; // never create .team/ up front
    const dir = liveDir(projectDir);
    fs.mkdirSync(dir, { recursive: true });
    const ignore = path.join(dir, '.gitignore');
    if (!fs.existsSync(ignore)) fs.writeFileSync(ignore, '*\n');
    prune(projectDir, now);
    const entry = {
      role: roleOf(input.agent_type),
      agent_id: String(input.agent_id),
      session_id: input.session_id ? String(input.session_id) : null,
      started: new Date(now).toISOString(),
    };
    fs.writeFileSync(entryFile(projectDir, input.agent_id), JSON.stringify(entry));
    return entry;
  } catch { return null; }
}

export function agentStopped(input, env = process.env) {
  try {
    if (!input || !input.agent_id) return;
    fs.unlinkSync(entryFile(projectDirOf(input, env), input.agent_id));
  } catch {}
}

async function main() {
  let raw = '';
  for await (const chunk of process.stdin) raw += chunk;
  let input;
  try { input = JSON.parse(raw); } catch { return; }
  agentStarted(input);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
