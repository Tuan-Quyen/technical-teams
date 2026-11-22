#!/usr/bin/env node
// Item state for the technical team: `.team/items/<slug>.json` is the one source of truth for an open item
// (step, next action, QA-Fix round, findings, verdicts, questions). `.team/STATE.md` is a view generated from it.
// Used by hooks/guard.mjs (validate on write, regenerate the view) and by the lead from the shell:
//   node tools/team-state.mjs check <item.json>       → exit 1 with the errors
//   node tools/team-state.mjs render [<.team dir>]    → rewrite STATE.md from items/*.json
//   node tools/team-state.mjs words <file...>         → word count, longest line, revision headings
//   node tools/team-state.mjs migrate [<.team dir>] [--write] → move a 0.31/0.32 STATE.md + findings.md to items/ (dry run by default)
// The workflows embed the same limits (they cannot import); tests/team-state.test.mjs keeps them in step.
import { readFileSync, readdirSync, writeFileSync, existsSync, mkdirSync, renameSync } from 'node:fs';
import { join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROUND_CAP = 3;
export const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,47}$/;
export const KEY_RE = /^[A-Z][A-Z0-9]{1,5}$/;
// The item's module for people (CART, STORE, USER-AUTH); default: the slug's first word.
export const AREA_RE = /^[A-Z][A-Z0-9-]{0,23}$/;
export const FINDING_ID_RE = /^F[1-9][0-9]*$/;
export const PIPELINES = ['feature', 'fix', 'review', 'test', 'infra', 'release', 'new', 'direct'];
export const TIERS = ['T0', 'T1', 'T2'];
export const ITEM_STATUSES = ['running', 'waiting-for-user', 'blocked', 'paused', 'done'];
export const SEVERITIES = ['blocker', 'critical', 'major', 'minor'];
export const BY = ['qa', 'code-reviewer', 'security', 'dba'];
// open → fixed → verified, or fixed → reopened → fixed …; open → challenged (the fixer's evidence, once) → rejected
// (the finder concedes or the arbiter refutes) or back to open (upheld); deferred / rejected otherwise only by the lead.
export const FINDING_STATUSES = ['open', 'fixed', 'verified', 'reopened', 'challenged', 'deferred', 'rejected'];
export const CLOSED = ['verified', 'deferred', 'rejected'];
export const LIMITS = { title: 60, titleWords: 8, next: 30, detail: 40, notes: 5, line: 300, specWords: 4000 };

// A short key for IDs, readable as the slug, never one taken; null when none is free (never a digit suffix):
// first word (4, then 6 letters), then fewer letters of it plus the rest (cart-charges → CARTCH, cart-chosen → CARCHO).
export const deriveKey = (slug, taken = new Set()) => {
  const [first = '', ...rest] = String(slug).split('-').map((w) => w.replace(/[^a-z0-9]/gi, '')).filter(Boolean);
  const tail = rest.join('');
  const tries = [first.slice(0, 4), first.slice(0, 6)];
  for (let i = Math.min(4, first.length); i >= 1 && tail; i--) tries.push(first.slice(0, i) + tail.slice(0, 6 - i));
  // A leading digit moves to the end: 2fa-setup → FA2.
  return tries.map((k) => k.toUpperCase().replace(/^([0-9]+)(.*)$/, '$2$1').slice(0, 6)).find((k) => KEY_RE.test(k) && !taken.has(k)) || null;
};

// The name people read in STATE.md, TASKS.md headings and reports: [AREA] [FEATURE] (cart-checkout → [CART] [CHECKOUT]).
export const itemLabel = (item) => {
  const parts = String(item.slug || '').toUpperCase().split('-').filter(Boolean);
  const area = AREA_RE.test(item.area || '') ? item.area : parts[0] || '?';
  const feature = (parts[0] === area ? parts.slice(1) : parts).join('-');
  return feature ? `[${area}] [${feature}]` : `[${area}]`;
};

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
  req(item.area == null || (str(item.area) && AREA_RE.test(item.area)), 'area: the module in capitals, e.g. CART or USER-AUTH (default: the first word of the slug)');
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
    req(f.challenge == null || (str(f.challenge) && words(f.challenge) <= LIMITS.detail), `${at}: challenge ≤${LIMITS.detail} words`);
    req(f.status !== 'challenged' || (str(f.challenge) && f.challenge.trim().length > 0), `${at}: a challenged finding needs challenge (the fixer's evidence)`);
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
  // Sorted by label, so the items of one area sit together.
  const open = items.filter((i) => i.status !== 'done').map((i) => [itemLabel(i), i]).sort((a, b) => a[0].localeCompare(b[0]) || a[1].slug.localeCompare(b[1].slug));
  const out = [
    '# Team state',
    '',
    '> Generated from `.team/items/*.json` by the plugin — do not edit; write the item JSON instead. Resume: continue each item at **Next**.',
    '',
    '| Item | Key | Slug | Pipeline · tier | Step | Status | Round | Open blockers | Next |',
    '|---|---|---|---|---|---|---|---|---|',
  ];
  for (const [label, i] of open) {
    const ob = openBlocking(i).map((f) => f.id).join(' ') || '–';
    out.push(`| ${cell(label, 60)} | ${i.key} | ${i.slug} | ${i.pipeline} · ${i.tier} | ${cell(i.step, 40)} | ${isBlocked(i) ? 'blocked (cap)' : i.status} | ${i.round} of ${ROUND_CAP} | ${ob} | ${cell(i.next, 200)} |`);
  }
  if (!open.length) out.push('| – | | | | | | | | nothing open |');
  const qs = open.flatMap(([label, i]) => (i.questions || []).map((q) => `- ${label}: ${cell(q.q, 200)}${q.options ? ` (${cell(q.options, 80)})` : ''}`));
  if (qs.length) out.push('', '## Waiting on the user', '', ...qs);
  const notes = open.flatMap(([label, i]) => (i.notes || []).map((n) => `- ${label}: ${cell(n, 200)}`));
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

// ---- one-time move of a 0.31/0.32 workspace (hand-written STATE.md + reports/<slug>/findings.md) to items/ ----
const tables = (md) => {
  const out = [];
  let cur = null;
  for (const l of String(md).replace(/\r\n/g, '\n').split('\n')) {
    if (!/^\s*\|/.test(l)) { cur = null; continue; }
    const cells = l.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
    if (cells.every((c) => /^:?-+:?$/.test(c))) continue;
    if (!cur) { cur = { head: cells.map((c) => c.toLowerCase()), rows: [] }; out.push(cur); } else cur.rows.push(Object.fromEntries(cur.head.map((h, i) => [h, cells[i] ?? ''])));
  }
  return out;
};
const cut = (s, n) => String(s || '').replace(/`/g, '').trim().split(/\s+/).filter(Boolean).slice(0, n).join(' ');
const OLD_BY = { QA: 'qa', CODE_REVIEW: 'code-reviewer', SECURITY: 'security', DBA: 'dba' };
const OLD_STATUS = { OPEN: 'open', IN_PROGRESS: 'open', FIXED_PENDING_RETEST: 'fixed', VERIFIED: 'verified', REOPENED: 'reopened', DEFERRED: 'deferred', REJECTED: 'rejected' };

export function migrateTeam(teamDir, { write = false } = {}) {
  const statePath = join(teamDir, 'STATE.md');
  if (!existsSync(statePath)) return { items: [], notes: ['no STATE.md'] };
  const md = readFileSync(statePath, 'utf8');
  const ts = tables(md);
  const active = ts.find((t) => t.head.includes('slug') && t.head.includes('next step'));
  const qafix = ts.find((t) => t.head.includes('slug') && t.head.includes('fix rounds'));
  const slugs = [...new Set([...(active?.rows || []), ...(qafix?.rows || [])].map((r) => r.slug).filter((s) => SLUG_RE.test(s || '')))];
  const items = [];
  const notes = [];
  // Keys must not collide: explicit ones are reserved first, then deriveKey. None free → no key is invented: the item
  // is skipped with a note to add a Key column.
  const used = new Set([...(active?.rows || []), ...(qafix?.rows || [])].map((r) => r.key).filter((k) => KEY_RE.test(k || '')));
  for (const slug of slugs) {
    const a = active?.rows.find((r) => r.slug === slug) || {};
    const q = qafix?.rows.find((r) => r.slug === slug) || {};
    const fPath = join(teamDir, 'reports', slug, 'findings.md');
    let tracker = [];
    if (existsSync(fPath)) {
      const m = readFileSync(fPath, 'utf8').match(/```json\s*\n([\s\S]*?)\n```/);
      try { tracker = m ? JSON.parse(m[1]) : []; } catch { notes.push(`${slug}: findings.md tracker JSON unreadable; findings not moved`); }
    }
    const findings = tracker.map((e) => {
      const blocking = e.leadBlocking === false ? false : !!(e.blocking || e.leadBlocking === true);
      const reopened = (e.history || []).filter((h) => h.event === 'reopened').length;
      return { id: `F${Number(String(e.id).split('-B')[1]) || 0}`, title: cut(e.title, LIMITS.titleWords).slice(0, LIMITS.title) || 'Migrated finding',
        by: OLD_BY[e.origin] || 'qa', severity: SEVERITIES.includes(e.severity) ? e.severity : e.severity === 'trivial' ? 'minor' : 'major', blocking,
        status: OLD_STATUS[e.status] || 'open', test: cut(e.test || e.evidence, 25) || `re-check ${e.sourceId || e.id}`, file: e.file || '', reopened, detail: cut(`was ${e.id}${e.requirement ? ` · ${e.requirement}` : ''}`, LIMITS.detail) };
    }).filter((f) => f.id !== 'F0');
    const pipeline = PIPELINES.includes((a.pipeline || '').toLowerCase()) ? a.pipeline.toLowerCase() : 'direct';
    const status = ITEM_STATUSES.includes((a.status || '').toLowerCase()) ? a.status.toLowerCase() : 'paused';
    const item = {
      v: 1, slug, key: KEY_RE.test(a.key || q.key || '') ? (a.key || q.key) : deriveKey(slug, used),
      title: cut(slug.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase()), LIMITS.titleWords).slice(0, LIMITS.title),
      pipeline, tier: pipeline === 'new' ? 'T2' : 'T1', step: cut(a.step, 6).slice(0, 40) || 'resume', status,
      next: cut(a['next step'], LIMITS.next) || 'Resume from the migrated state', round: Number.parseInt(q['fix rounds'], 10) || 0,
      workflows: /^yes/i.test(a.workflows || '') ? true : /^no/i.test(a.workflows || '') ? false : undefined,
      findings, notes: [`migrated from 0.32 STATE.md${existsSync(fPath) ? ' and findings.md' : ''}`],
    };
    if (item.workflows === undefined) delete item.workflows;
    if (!item.key) { notes.push(`${slug}: not migrated: every key from its slug is taken; add a Key column (2-6 capitals) to STATE.md`); continue; }
    used.add(item.key);
    const errs = validateItem(item);
    if (errs.length) { notes.push(`${slug}: not migrated: ${errs.join('; ')}`); continue; }
    items.push(item);
    if (write) {
      mkdirSync(join(teamDir, 'items'), { recursive: true });
      writeFileSync(join(teamDir, 'items', `${slug}.json`), `${JSON.stringify(item, null, 2)}\n`);
      if (existsSync(fPath)) { mkdirSync(join(teamDir, 'archive', slug), { recursive: true }); renameSync(fPath, join(teamDir, 'archive', slug, 'findings-0.32.md')); }
    }
  }
  if (write && items.length) {
    mkdirSync(join(teamDir, 'archive'), { recursive: true });
    writeFileSync(join(teamDir, 'archive', 'STATE-0.32.md'), md);
    renderTeam(teamDir);
  }
  return { items, notes };
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
  } else if (cmd === 'migrate') {
    const r = migrateTeam(rest.find((x) => !x.startsWith('--')) || '.team', { write: rest.includes('--write') });
    console.log(JSON.stringify({ wrote: rest.includes('--write'), items: r.items.map((i) => ({ slug: i.slug, round: i.round, findings: i.findings.length })), notes: r.notes }, null, 2));
  } else if (cmd === 'words') {
    for (const f of rest) console.log(JSON.stringify({ file: f, ...stats(readFileSync(f, 'utf8')) }));
  } else {
    console.error('usage: team-state.mjs check <item.json...> | render [<.team dir>] | words <file...> | migrate [<.team dir>] [--write]');
    process.exit(2);
  }
}
