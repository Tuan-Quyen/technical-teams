#!/usr/bin/env node
// Item state for the technical team: `.team/items/<slug>.json` is the one source of truth for an open item
// (step, next action, QA-Fix round, findings, verdicts, questions). `.team/STATE.md` is a view generated from it.
// Used by hooks/guard.mjs (validate on write, regenerate the view) and by the lead from the shell:
//   node tools/team-state.mjs check <item.json>       → exit 1 with the errors
//   node tools/team-state.mjs render [<.team dir>]    → rewrite STATE.md from items/*.json
//   node tools/team-state.mjs words <file...>         → word count, longest line, revision headings
// The workflows embed the same limits (they cannot import); tests/team-state.test.mjs keeps them in step.
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROUND_CAP = 3;
export const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,47}$/;
export const KEY_RE = /^[A-Z][A-Z0-9]{1,5}$/;
export const FINDING_ID_RE = /^F[1-9][0-9]*$/;
export const PIPELINES = ['feature', 'fix', 'review', 'test', 'infra', 'release', 'new', 'direct'];
export const TIERS = ['T0', 'T1', 'T2'];
export const ITEM_STATUSES = ['running', 'waiting-for-user', 'blocked', 'paused', 'done'];
export const SEVERITIES = ['blocker', 'critical', 'major', 'minor'];
export const BY = ['qa', 'code-reviewer', 'security', 'dba'];
// open → fixed → verified, or fixed → reopened → fixed …; deferred / rejected only by the lead (with a decision).
export const FINDING_STATUSES = ['open', 'fixed', 'verified', 'reopened', 'deferred', 'rejected'];
export const CLOSED = ['verified', 'deferred', 'rejected'];
export const LIMITS = { title: 60, titleWords: 8, next: 30, detail: 40, notes: 5, line: 300, specWords: 4000 };

const words = (s) => String(s || '').trim().split(/\s+/).filter(Boolean).length;
const str = (v) => typeof v === 'string';

// A finding still to fix or re-check: blocking, not closed.
export const openBlocking = (item) => (item.findings || []).filter((f) => f.blocking && !CLOSED.includes(f.status));
// At the cap with blockers left: nothing more runs until the user decides (run-kit qa-loop § Past the cap).
export const isBlocked = (item) => item.round >= ROUND_CAP && openBlocking(item).length > 0;

export function validateItem(item, file = '') {
  const e = [];
  const req = (cond, msg) => { if (!cond) e.push(msg); };
  if (!item || typeof item !== 'object' || Array.isArray(item)) return ['item must be a JSON object'];
  req(item.v === 1, 'v must be 1');
  req(str(item.slug) && SLUG_RE.test(item.slug), 'slug: kebab-case, ≤48 chars');
  if (file && str(item.slug)) req(basename(file, '.json') === item.slug, `file name must be ${item.slug}.json`);
  req(str(item.key) && KEY_RE.test(item.key), 'key: 2-6 capitals or digits, first a capital (e.g. CART)');
  req(str(item.title) && item.title.length <= LIMITS.title && words(item.title) <= LIMITS.titleWords, `title: ≤${LIMITS.titleWords} words and ≤${LIMITS.title} chars (verb + object)`);
  req(PIPELINES.includes(item.pipeline), `pipeline: one of ${PIPELINES.join(', ')}`);
  req(TIERS.includes(item.tier), `tier: one of ${TIERS.join(', ')}`);
  req(str(item.step) && item.step.length <= 40, 'step: short name of the current step');
  req(ITEM_STATUSES.includes(item.status), `status: one of ${ITEM_STATUSES.join(', ')}`);
  req(str(item.next) && words(item.next) <= LIMITS.next, `next: the next action, ≤${LIMITS.next} words`);
  req(Number.isInteger(item.round) && item.round >= 0, 'round: QA-Fix round, a whole number from 0');
  req(Array.isArray(item.findings), 'findings: an array ([] when none)');
  const ids = new Set();
  for (const [i, f] of (Array.isArray(item.findings) ? item.findings : []).entries()) {
    const at = `findings[${i}]${f && f.id ? ` ${f.id}` : ''}`;
    if (!f || typeof f !== 'object') { e.push(`${at}: must be an object`); continue; }
    req(str(f.id) && FINDING_ID_RE.test(f.id) && !ids.has(f.id), `${at}: id F<n>, unique within the item`);
    ids.add(f.id);
    req(str(f.title) && f.title.length <= LIMITS.title && words(f.title) <= LIMITS.titleWords, `${at}: title ≤${LIMITS.titleWords} words, ≤${LIMITS.title} chars`);
    req(BY.includes(f.by), `${at}: by one of ${BY.join(', ')}`);
    req(SEVERITIES.includes(f.severity), `${at}: severity one of ${SEVERITIES.join(', ')}`);
    req(typeof f.blocking === 'boolean', `${at}: blocking true or false`);
    req(FINDING_STATUSES.includes(f.status), `${at}: status one of ${FINDING_STATUSES.join(', ')}`);
    req(!f.blocking || (str(f.test) && f.test.trim().length >= 3), `${at}: a blocking finding needs test (failing test path::name or a repro command)`);
    req(Number.isInteger(f.reopened ?? 0) && (f.reopened ?? 0) >= 0, `${at}: reopened a whole number`);
    req(f.detail == null || (str(f.detail) && words(f.detail) <= LIMITS.detail), `${at}: detail ≤${LIMITS.detail} words`);
  }
  for (const k of ['verdicts', 'questions', 'decisions', 'notes', 'files']) {
    if (item[k] != null) req(k === 'verdicts' ? typeof item[k] === 'object' && !Array.isArray(item[k]) : Array.isArray(item[k]), `${k}: wrong type`);
  }
  req(item.workflows == null || typeof item.workflows === 'boolean', 'workflows: true or false (the item was opted into workflows)');
  req(!item.notes || item.notes.length <= LIMITS.notes, `notes: ≤${LIMITS.notes} lines`);
  const raw = JSON.stringify(item);
  for (const k of ['cap', 'approvals', 'maxRounds', 'extraRounds', 'history']) req(!(k in item), `${k}: not part of an item (the cap is code; history is git)`);
  req(raw.length <= 12000, 'item over 12,000 chars: close findings, drop detail, move notes to the spec');
  return e;
}

const cell = (s, n = 80) => String(s ?? '–').replace(/\|/g, '/').replace(/\s+/g, ' ').trim().slice(0, n) || '–';

export function renderState(items) {
  const open = items.filter((i) => i.status !== 'done').sort((a, b) => a.slug.localeCompare(b.slug));
  const out = [
    '# Team state',
    '',
    '> Generated from `.team/items/*.json` by the plugin — do not edit; write the item JSON instead. Resume: continue each item at **Next**.',
    '',
    '| Item | Key | Pipeline · tier | Step | Status | Round | Open blockers | Next |',
    '|---|---|---|---|---|---|---|---|',
  ];
  for (const i of open) {
    const ob = openBlocking(i).map((f) => f.id).join(' ') || '–';
    out.push(`| ${i.slug} | ${i.key} | ${i.pipeline} · ${i.tier} | ${cell(i.step, 40)} | ${isBlocked(i) ? 'blocked (cap)' : i.status} | ${i.round} of ${ROUND_CAP} | ${ob} | ${cell(i.next, 200)} |`);
  }
  if (!open.length) out.push('| – | | | | | | | nothing open |');
  const qs = open.flatMap((i) => (i.questions || []).map((q) => `- ${i.slug}: ${cell(q.q, 200)}${q.options ? ` (${cell(q.options, 80)})` : ''}`));
  if (qs.length) out.push('', '## Waiting on the user', '', ...qs);
  const notes = open.flatMap((i) => (i.notes || []).map((n) => `- ${i.slug}: ${cell(n, 200)}`));
  if (notes.length) out.push('', '## Notes', '', ...notes);
  return `${out.join('\n')}\n`;
}

export function readItems(teamDir) {
  const dir = join(teamDir, 'items');
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => {
    try { return JSON.parse(readFileSync(join(dir, f), 'utf8')); } catch { return null; }
  }).filter((i) => i && validateItem(i).length === 0);
}

export const renderTeam = (teamDir) => writeFileSync(join(teamDir, 'STATE.md'), renderState(readItems(teamDir)));

// Spec rules, checked on every write under .team/ (hooks/guard.mjs) and by the compact workflow.
export function specProblems(text, file = '') {
  const p = [];
  const lines = String(text).replace(/\r\n/g, '\n').split('\n');
  let fence = false;
  lines.forEach((l, n) => {
    if (/^\s*```/.test(l)) fence = !fence;
    if (!fence && /^#{1,6}\s.*\b(revision|revised|round\s*\d+|r\d+\s*(changes|update))\b/i.test(l)) p.push(`line ${n + 1}: a revision heading — rewrite the section in place and log the decision under "## Decision log"`);
    if (l.length > LIMITS.line) p.push(`line ${n + 1}: ${l.length} chars (max ${LIMITS.line}) — split it or point to file:symbol`);
  });
  const w = words(text);
  if (w > LIMITS.specWords) p.push(`${w} words (max ${LIMITS.specWords} per file) — split the item or compact it`);
  return file && p.length ? p.map((x) => `${file}: ${x}`) : p;
}

export function stats(text) {
  const lines = String(text).replace(/\r\n/g, '\n').split('\n');
  return { words: words(text), maxLine: Math.max(0, ...lines.map((l) => l.length)), revisionHeadings: lines.filter((l) => /^#{1,6}\s.*\b(revision|revised|round\s*\d+)\b/i.test(l)).length };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const [cmd, ...rest] = process.argv.slice(2);
  if (cmd === 'check') {
    let bad = 0;
    for (const f of rest) {
      let errs;
      try { errs = validateItem(JSON.parse(readFileSync(f, 'utf8')), f); } catch (x) { errs = [`not valid JSON: ${x.message}`]; }
      for (const m of errs) console.error(`${f}: ${m}`);
      bad += errs.length;
    }
    process.exit(bad ? 1 : 0);
  } else if (cmd === 'render') {
    renderTeam(rest[0] || '.team');
  } else if (cmd === 'words') {
    for (const f of rest) console.log(JSON.stringify({ file: f, ...stats(readFileSync(f, 'utf8')) }));
  } else {
    console.error('usage: team-state.mjs check <item.json...> | render [<.team dir>] | words <file...>');
    process.exit(2);
  }
}
