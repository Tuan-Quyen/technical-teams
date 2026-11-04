#!/usr/bin/env node
// technical-team handoff check: SubagentStop hook.
//
// Every team agent must end its run with the handoff block defined in
// skills/run-kit/SKILL.md (§3). The lead, when it runs as a subagent, must end
// with a final report or a gate report instead. If the last message lacks it,
// the subagent is sent back (decision: block) with the exact template, at most
// MAX_RETRIES times per agent, so a broken agent cannot loop forever.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { teamAgentKind } from './guard.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PLUGIN_ROOT = process.env.CLAUDE_PLUGIN_ROOT || path.resolve(HERE, '..');
const MAX_RETRIES = 2;
export const LABELS = ['Result', 'Evidence', 'Files changed', 'Open items', 'Next steps'];
export const RESULTS = ['done', 'blocked', 'needs decision'];

export function handoffTemplate() {
  const kit = (() => { try { return fs.readFileSync(path.join(PLUGIN_ROOT, 'skills', 'run-kit', 'SKILL.md'), 'utf8'); } catch { return ''; } })();
  const sec = kit.split(/^## 3\. /m)[1] || '';
  const m = sec.match(/```\n([\s\S]*?)```/);
  return m ? m[1].trim() : '### Handoff\n' + LABELS.map((l) => `- **${l}:** ...`).join('\n');
}

const ALIASES = {
  'Result': ['Result', 'Kết quả'],
  'Evidence': ['Evidence', 'Bằng chứng'],
  'Files changed': ['Files changed', 'Files touched', 'Files written', 'Đã ghi vào'],
  'Open items': ['Open items', 'Still open', 'Còn mở'],
  'Next steps': ['Next steps', 'Next step', 'Suggested next steps', 'Suggested next step', 'Đề xuất bước tiếp'],
};

function field(text, label) {
  const candidates = ALIASES[label] || [label];
  for (const c of candidates) {
    const re = new RegExp(`\\*\\*${c}:\\*\\*([^\\n]*)`, 'i');
    const m = text.match(re);
    if (m) return m[1].trim();
  }
  return null;
}

// Returns null when the message is acceptable, otherwise the problem.
export function checkHandoff(message, kind) {
  const text = String(message || '');
  if (kind === 'lead') {
    if (/^##\s*(Report|Waiting for approval|Báo cáo|Chờ duyệt)\b/im.test(text)) return null;
    return 'the tech lead must end with the final report (Lead manual §8) or a gate report (§9).';
  }
  const match = [...text.matchAll(/###?\s*(?:Handoff|Phiếu bàn giao)\b/gi)].pop();
  let idx = match ? match.index : -1;
  if (idx < 0) {
    idx = Math.max(text.lastIndexOf('Handoff'), text.lastIndexOf('Phiếu bàn giao'));
    if (idx < 0) return 'the run ends without the handoff block.';
  }
  const block = text.slice(idx);
  const missing = LABELS.filter((l) => field(block, l) === null);
  if (missing.length) return `the handoff block is missing: ${missing.join(', ')}.`;
  const rawResult = field(block, 'Result').replace(/[*`_]/g, '').trim().toLowerCase();
  const canonicalResult = (() => {
    if (rawResult.startsWith('done') || rawResult.startsWith('xong')) return 'done';
    if (rawResult.startsWith('blocked') || rawResult.startsWith('vướng') || rawResult.startsWith('vuong')) return 'blocked';
    if (rawResult.startsWith('needs decision') || rawResult.startsWith('cần quyết định') || rawResult.startsWith('can quyet dinh') || rawResult.startsWith('decision needed')) return 'needs decision';
    return null;
  })();
  if (!canonicalResult) return `"Result" must be one of: ${RESULTS.join(' | ')}.`;
  const evidence = field(block, 'Evidence').replace(/[*`_<>]/g, '').trim();
  if (canonicalResult === 'done' && (!evidence || /^(none|n\/a|no|không|-|—)\.?$/i.test(evidence))) {
    return '"Result: done" needs evidence (command output, test summary or file:line). Without evidence, report "blocked".';
  }
  return null;
}

function retries(agentId) {
  const dir = process.env.CLAUDE_PLUGIN_DATA || path.join(os.tmpdir(), 'technical-team');
  const f = path.join(dir, 'handoff-retries.json');
  let db = {};
  try { db = JSON.parse(fs.readFileSync(f, 'utf8')); } catch {}
  return {
    count: db[agentId] || 0,
    bump() {
      db[agentId] = (db[agentId] || 0) + 1;
      try { fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(f, JSON.stringify(db)); } catch {}
    },
  };
}

async function main() {
  let raw = '';
  for await (const chunk of process.stdin) raw += chunk;
  let input;
  try { input = JSON.parse(raw); } catch { return; }
  const kind = teamAgentKind(input);
  if (!kind) return;                                   // not a technical-team agent
  if (typeof input.last_assistant_message !== 'string') return; // cannot see the message: do not block blindly
  const problem = checkHandoff(input.last_assistant_message, kind);
  if (!problem) return;
  const r = retries(String(input.agent_id || input.session_id || 'unknown'));
  if (input.stop_hook_active && r.count >= MAX_RETRIES) return;
  if (r.count >= MAX_RETRIES) return;                  // give up; the lead treats a missing handoff as "blocked"
  r.bump();
  const how = kind === 'lead'
    ? 'Finish with the final report (Lead manual §8), or the gate report (§9) if you are stopping for the user.'
    : `Finish your run with exactly this block (labels unchanged, content in the brief's language):\n\n${handoffTemplate()}`;
  process.stdout.write(JSON.stringify({
    decision: 'block',
    reason: `[technical-team handoff check] Not done yet: ${problem} ${how}`,
  }));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
