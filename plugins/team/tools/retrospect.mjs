#!/usr/bin/env node
// Retrospective data for the technical team: scans the local Claude Code transcripts (CLI and desktop both write
// ~/.claude/projects/<project>/<session>.jsonl, subagents under <session>/subagents/, workflow agents under
// subagents/workflows/wf_*/), keeps the sessions that used this plugin, and turns them into signals with evidence
// (file:line @time + a redacted snippet). Read-only, local only: no network, writes only to --out.
//   node tools/retrospect.mjs [--days 14] [--out <dir>] [--project <substr>] [--exclude-session <id>]
//                             [--root <projects dir>] [--plugin technical-team] [--include-dev] [--now <ISO>]
// → <out>/digest.md (short, for the lead) and <out>/digest.json (everything). Used by commands/retrospect.md.
import { readFileSync, readdirSync, statSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, basename, dirname, relative, sep } from 'node:path';
import { homedir, tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

export const DAYS = { min: 7, max: 30, def: 14 };
export const MIN_SESSIONS_FOR_UNUSED = 5;
const PLUGIN_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SNIP = 200;

// Cost-equivalent tokens, in units of one uncached input token (cache write 1.25×, cache read 0.1×, output 5×).
export const costTokens = (u = {}) => Math.round((u.input_tokens || 0) + 1.25 * (u.cache_creation_input_tokens || 0)
  + 0.1 * (u.cache_read_input_tokens || 0) + 5 * (u.output_tokens || 0));
const contextTokens = (u = {}) => (u.input_tokens || 0) + (u.cache_creation_input_tokens || 0) + (u.cache_read_input_tokens || 0);

const SECRET_RE = /(sk-[A-Za-z0-9_-]{16,}|gh[pousr]_[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|xox[abp]-[A-Za-z0-9-]{10,}|Bearer\s+[A-Za-z0-9._~+/-]{12,}|eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+|\b(?:password|passwd|pwd|secret|token|api[_-]?key)\b\s*["']?\s*[:=]\s*["']?[^\s"',;]+)/gi;
export const redact = (s) => String(s ?? '').replace(SECRET_RE, '[REDACTED]');
const snip = (s) => redact(String(s ?? '').replace(/\s+/g, ' ').trim()).slice(0, SNIP);

// Guard messages from hooks/guard.mjs, keyed by rule.
const GUARD_RULES = [
  ['handoff-missing', /end with your Handoff block/],
  ['no-commit', /specialists never commit or push/],
  ['state-write', /item state \(\.team\/items\/, \.team\/STATE\.md\) belongs/],
  ['state-generated', /\.team\/STATE\.md is generated from/],
  ['item-schema', /breaks the item schema/],
  ['spec-rules', /technical-team spec rules for/],
];
const guardRule = (text) => (GUARD_RULES.find(([, re]) => re.test(text)) || [])[0];

export function parseArgs(argv) {
  const o = { days: DAYS.def, notes: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]; const v = () => argv[++i];
    if (a === '--days') o.days = Number(v());
    else if (/^\d+$/.test(a)) o.days = Number(a);
    else if (a === '--out') o.out = v();
    else if (a === '--project') o.project = v();
    else if (a === '--exclude-session') o.excludeSession = v();
    else if (a === '--root') o.root = v();
    else if (a === '--plugin') o.plugin = v();
    else if (a === '--plugin-root') o.pluginRoot = v();
    else if (a === '--include-dev') o.includeDev = true;
    else if (a === '--now') o.now = v();
  }
  if (!Number.isFinite(o.days)) o.days = DAYS.def;
  const d = Math.min(DAYS.max, Math.max(DAYS.min, Math.round(o.days)));
  if (d !== o.days) o.notes.push(`--days ${o.days} clamped to ${d} (range ${DAYS.min}–${DAYS.max})`);
  o.days = d;
  if (o.excludeSession && o.excludeSession.includes('${')) delete o.excludeSession; // unsubstituted placeholder
  return o;
}

// What the plugin ships: agents, commands, skills (minus the ones agents preload), workflows.
export function inventory(root = PLUGIN_ROOT) {
  const md = (d) => (existsSync(join(root, d)) ? readdirSync(join(root, d)).filter((f) => f.endsWith('.md')).map((f) => f.slice(0, -3)) : []);
  const agents = md('agents');
  const preloaded = new Set();
  for (const a of agents) {
    const m = readFileSync(join(root, 'agents', `${a}.md`), 'utf8').match(/^skills:\s*\[(.*)\]/m);
    if (m) for (const s of m[1].split(',')) preloaded.add(s.trim().replace(/["']/g, '').split(':').pop());
  }
  const skills = existsSync(join(root, 'skills')) ? readdirSync(join(root, 'skills')).filter((s) => !preloaded.has(s)) : [];
  const workflows = existsSync(join(root, 'workflows')) ? readdirSync(join(root, 'workflows')).filter((f) => f.endsWith('.js')).map((f) => `team-${f.slice(0, -3)}`) : [];
  let version = null;
  try { version = JSON.parse(readFileSync(join(root, '.claude-plugin', 'plugin.json'), 'utf8')).version; } catch { /* none */ }
  return { agents, commands: md('commands'), skills, preloadedSkills: [...preloaded], workflows, version };
}

const walkJsonl = (dir, out = []) => {
  let ents; try { ents = readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of ents) {
    const f = join(dir, e.name);
    if (e.isDirectory()) walkJsonl(f, out); else if (e.name.endsWith('.jsonl')) out.push(f);
  }
  return out;
};
const textOf = (c) => (typeof c === 'string' ? c : Array.isArray(c) ? c.map((b) => (typeof b === 'string' ? b : b?.text ?? (typeof b?.content === 'string' ? b.content : textOf(b?.content)) ?? '')).join('\n') : '');
const tsOk = (ts, cutoff) => !ts || Date.parse(ts) >= cutoff;

function* lines(file) {
  let text; try { text = readFileSync(file, 'utf8'); } catch { return; }
  let n = 0;
  for (const l of text.split('\n')) {
    n++;
    if (!l || l.startsWith('{"type":"api-request')) continue; // request mirrors duplicate the real entries
    let o; try { o = JSON.parse(l); } catch { continue; }
    yield [n, o, l];
  }
}

// A shell command's stable key ("npm run test", "git status"): the first real command, its leading plain words only.
export function normBash(cmd) {
  const first = String(cmd || '').split('\n')[0];
  if (/<<|^\s*(for|while|if|do)\b/.test(first)) return null;
  const c = first.split(/&&|\|\||;|\|/).map((s) => s.trim()).find((s) => s && !/^(cd|set|export|\$env:)\b/i.test(s)) || '';
  const t = c.split(/\s+/).filter(Boolean);
  if (!t.length || !/^[A-Za-z][\w.-]*$/.test(t[0]) || /^(cat|ls|head|tail|grep|rg|sed|awk|echo|find|pwd|wc|type|dir|mkdir|rm|cp|mv|sleep|Get-Content|Get-ChildItem|Select-String)$/i.test(t[0])) return null;
  const words = [t[0]];
  for (const w of t.slice(1)) { if (words.length >= 3 || !/^[a-z][\w:.-]*$/.test(w)) break; words.push(w); }
  return words.join(' ');
}

// Time actually spent: gaps over 5 minutes (a resumed agent, a wait for the user) do not count.
const activeSeconds = (times) => Math.round(times.reduce((x, t, i) => x + (i ? Math.min(300e3, Math.max(0, t - times[i - 1])) : 0), 0) / 1000);

export function collect(opts = {}) {
  const now = opts.now ? Date.parse(opts.now) : Date.now();
  const days = opts.days ?? DAYS.def;
  const cutoff = now - days * 864e5;
  const root = opts.root || join(homedir(), '.claude', 'projects');
  const plugin = opts.plugin || 'technical-team';
  const P = `${plugin}:`;
  const inv = inventory(opts.pluginRoot || PLUGIN_ROOT);
  const versionRe = new RegExp(`${plugin.replace(/[-]/g, '\\-')}[\\\\/]+(\\d+\\.\\d+\\.\\d+)[\\\\/]`);
  const ev = (file, n, ts, text) => ({ ref: `${relative(root, file).split(sep).join('/')}:L${n}`, ts: ts || null, snippet: snip(text) });

  const sessions = [];
  let scanned = 0;
  for (const proj of (existsSync(root) ? readdirSync(root, { withFileTypes: true }) : []).filter((d) => d.isDirectory())) {
    if (opts.project && !proj.name.toLowerCase().includes(opts.project.toLowerCase())) continue;
    const pdir = join(root, proj.name);
    for (const f of readdirSync(pdir).filter((x) => x.endsWith('.jsonl'))) {
      const id = f.slice(0, -6);
      if (id === opts.excludeSession) continue;
      const file = join(pdir, f);
      const sdir = join(pdir, id);
      const subs = walkJsonl(join(sdir, 'subagents'));
      const mtime = Math.max(statSync(file).mtimeMs, ...subs.map((s) => statSync(s).mtimeMs));
      if (mtime < cutoff) continue;
      scanned++;
      sessions.push(scanSession({ project: proj.name, id, file, subs, cutoff, P, versionRe, ev }));
    }
  }
  // A copied or moved project keeps its transcripts: count one session once (same first entry).
  const seen = new Set();
  const all = sessions.filter((s) => s.usesPlugin && !(s.firstUuid && seen.has(s.firstUuid)) && (seen.add(s.firstUuid), true));
  const dev = all.filter((s) => s.dev);
  const used = opts.includeDev ? all : all.filter((s) => !s.dev);
  return { meta: { generated: new Date(now).toISOString(), days, from: new Date(cutoff).toISOString(), root: '~/.claude/projects', plugin, pluginVersion: inv.version, scanned, pluginSessions: used.length, devSessionsExcluded: opts.includeDev ? 0 : dev.length, notes: opts.notes || [] }, inventory: inv, sessions: used, signals: signals(used, inv, P) };
}

function scanSession({ project, id, file, subs, cutoff, P, versionRe, ev }) {
  const s = { project, id, ref: `${project}/${id}.jsonl`, cwd: null, start: null, end: null, entrypoint: null, ccVersion: null,
    pluginVersions: new Set(), usesPlugin: false, dev: false, commands: [], spawns: [], workflows: [], skills: [], leadEdits: [], otherAgents: [],
    bash: [], userMsgs: [], interrupts: [], compactions: [], apiErrors: [], hookErrors: [], guard: [], leadContextMax: 0, leadCost: 0, agents: [] };
  for (const [n, o, raw] of lines(file)) {
    const ts = o.timestamp;
    const vm = raw.match(versionRe); if (vm) s.pluginVersions.add(vm[1]);
    if (!tsOk(ts, cutoff)) continue;
    if (ts) { s.start ??= ts; s.end = ts; }
    s.firstUuid ??= o.uuid || null; s.cwd ??= o.cwd || null; s.entrypoint ??= o.entrypoint || null; s.ccVersion ??= o.version || null;
    const c = o.message?.content;
    if (o.type === 'assistant') {
      const u = o.message?.usage;
      if (u) { s.leadContextMax = Math.max(s.leadContextMax, contextTokens(u)); s.leadCost += costTokens(u); }
      if (o.isApiErrorMessage || o.apiError) s.apiErrors.push(ev(file, n, ts, textOf(c)));
      for (const b of Array.isArray(c) ? c : []) {
        if (b.type !== 'tool_use') continue;
        const i = b.input || {};
        if (b.name === 'Agent' || b.name === 'Task') {
          const t = String(i.subagent_type || 'general-purpose');
          (t.startsWith(P) ? s.spawns : s.otherAgents).push({ type: t, model: i.model || null, ...ev(file, n, ts, i.description || i.prompt) });
        } else if (b.name === 'Workflow' && String(i.name || '').startsWith(P)) s.workflows.push({ name: i.name.slice(P.length), ...ev(file, n, ts, i.name) });
        else if (b.name === 'Skill' && String(i.skill || '').startsWith(P)) s.skills.push({ name: i.skill.slice(P.length), ...ev(file, n, ts, i.skill) });
        else if (/^(Edit|Write|MultiEdit|NotebookEdit)$/.test(b.name)) {
          const fp = String(i.file_path || i.notebook_path || '').replace(/\\/g, '/');
          if (fp && !fp.includes('/.team/') && !fp.includes('/.claude/')) s.leadEdits.push({ file: fp.split('/').slice(-2).join('/'), ...ev(file, n, ts, `${b.name} ${fp}`) });
        } else if (/^(Bash|PowerShell)$/.test(b.name)) { const k = normBash(i.command); if (k) s.bash.push({ key: k, who: 'lead', ...ev(file, n, ts, i.command) }); }
      }
    } else if (o.type === 'user') {
      if (typeof c === 'string' || (Array.isArray(c) && c.every((b) => b.type === 'text'))) {
        const t = textOf(c);
        const cm = t.match(new RegExp(`<command-name>/${P}([\\w-]+)</command-name>`));
        if (cm) s.commands.push({ name: cm[1], ...ev(file, n, ts, t.match(/<command-args>([\s\S]*?)<\/command-args>/)?.[1] || cm[0]) });
        else if (/\[Request interrupted by user/.test(t)) s.interrupts.push(ev(file, n, ts, t));
        else if (!o.isMeta && !o.isCompactSummary && !/^\s*</.test(t) && t.trim()) s.userMsgs.push(ev(file, n, ts, t));
      }
      for (const b of Array.isArray(c) ? c : []) {
        if (b.type !== 'tool_result') continue;
        const t = textOf(b.content);
        if (/hook (error|blocking)/i.test(t.slice(0, 120))) { const r = guardRule(t); if (r) s.guard.push({ rule: r, who: 'lead', ...ev(file, n, ts, t) }); }
      }
    } else if (o.type === 'attachment' && /hook_blocking_error|hook_error/.test(o.attachment?.type || '')) {
      const t = JSON.stringify(o.attachment); const r = guardRule(t);
      if (r) s.guard.push({ rule: r, who: 'lead', ...ev(file, n, ts, t) });
    } else if (o.type === 'system') {
      if (o.subtype === 'compact_boundary') s.compactions.push(ev(file, n, ts, 'compaction'));
      for (const e of o.hookErrors || []) s.hookErrors.push(ev(file, n, ts, e));
    }
  }
  // An agent run with no entry inside the window (an older run of a resumed session) does not count.
  for (const f of subs) { const a = scanAgent(f, s, { cutoff, P, ev, versionRe }); if (a.ref) s.agents.push(a); }
  s.usesPlugin = s.commands.length + s.spawns.length + s.workflows.length + s.skills.length > 0 || s.agents.some((a) => a.type?.startsWith(P));
  try { s.dev = !!s.cwd && existsSync(join(s.cwd, 'plugins', 'team', '.claude-plugin', 'plugin.json')); } catch { /* gone */ }
  s.pluginVersions = [...s.pluginVersions].sort();
  return s;
}

function scanAgent(file, s, { cutoff, P, ev, versionRe }) {
  let meta = {};
  try { meta = JSON.parse(readFileSync(file.replace(/\.jsonl$/, '.meta.json'), 'utf8')); } catch { /* none */ }
  const wf = file.split(sep).find((p) => p.startsWith('wf_')) || null;
  const a = { type: meta.agentType || null, model: meta.model || null, workflow: wf, description: snip(meta.description || ''), ref: null,
    start: null, end: null, cost: 0, toolCalls: 0, toolErrors: [], denials: [], status: null, lastText: '', statusRef: null };
  const names = new Map();
  const times = [];
  for (const [n, o, raw] of lines(file)) {
    const ts = o.timestamp;
    const vm = raw.match(versionRe); if (vm) s.pluginVersions.add(vm[1]);
    if (!tsOk(ts, cutoff)) continue;
    a.ref ??= ev(file, n, ts, '').ref;
    if (ts) { a.start ??= ts; a.end = ts; times.push(Date.parse(ts)); }
    const c = o.message?.content;
    if (o.type === 'assistant') {
      a.model ??= o.message?.model || null;
      a.cost += costTokens(o.message?.usage);
      for (const b of Array.isArray(c) ? c : []) {
        if (b.type === 'text' && b.text?.trim()) { a.lastText = b.text; a.statusRef = ev(file, n, ts, ''); }
        if (b.type !== 'tool_use') continue;
        a.toolCalls++; names.set(b.id, b.name);
        if (b.name === 'SubagentHandback') { a.lastText = String(b.input?.message || ''); a.statusRef = ev(file, n, ts, ''); }
        if (b.name === 'Skill' && String(b.input?.skill || '').startsWith(P)) s.skills.push({ name: b.input.skill.slice(P.length), who: a.type || 'agent', ...ev(file, n, ts, b.input.skill) });
        if (/^(Bash|PowerShell)$/.test(b.name)) { const k = normBash(b.input?.command); if (k) s.bash.push({ key: k, who: a.type || 'agent', ...ev(file, n, ts, b.input?.command) }); }
      }
    } else if (o.type === 'user') {
      for (const b of Array.isArray(c) ? c : []) {
        if (b.type !== 'tool_result') continue;
        const t = textOf(b.content); const tool = names.get(b.tool_use_id) || '?';
        const r = /hook (error|blocking)/i.test(t.slice(0, 120)) ? guardRule(t) : null;
        if (r) s.guard.push({ rule: r, who: a.type || 'agent', ...ev(file, n, ts, t) });
        else if (o.toolDenialKind || /permission (request )?(denied|aborted)|was denied/i.test(t.slice(0, 160))) a.denials.push({ tool, ...ev(file, n, ts, t) });
        else if (b.is_error) a.toolErrors.push({ tool, ...ev(file, n, ts, t) });
      }
    } else if (o.type === 'attachment' && /hook_blocking_error|hook_error/.test(o.attachment?.type || '')) {
      const r = guardRule(JSON.stringify(o.attachment));
      if (r) s.guard.push({ rule: r, who: a.type || 'agent', ...ev(file, n, ts, JSON.stringify(o.attachment)) });
    }
  }
  const t = a.lastText.trim();
  const m = [...t.matchAll(/-\s*Status:\s*(done|blocked|needs-input)\b/gi)].pop();
  a.status = m ? m[1].toLowerCase() : !t ? 'none' : /^[{[]/.test(t) ? 'structured' : 'missing';
  a.statusSnippet = snip(t.slice(-SNIP));
  a.durationS = activeSeconds(times);
  delete a.lastText;
  return a;
}

const short = (t, P) => String(t || '?').replace(P, '');
const bump = (m, k, by = 1) => m.set(k, (m.get(k) || 0) + by);
const top = (arr, n = 3) => arr.slice(-n);
const sessionOf = (ref) => String(ref || '').split(':L')[0].replace(/\/subagents\/.*$/, '').replace(/\.jsonl$/, '');

export function signals(sessions, inv, P) {
  const out = [];
  // `all` = every occurrence behind the signal (evidence shows only the last 3).
  const add = (x, all = x.evidence) => out.push({ sessions: new Set(all.map((e) => sessionOf(e.ref))).size, ...x });
  const agents = sessions.flatMap((s) => s.agents.filter((a) => a.type?.startsWith(P)).map((a) => ({ ...a, session: s })));

  // Usage and unused components.
  const use = { agents: new Map(), commands: new Map(), skills: new Map(), workflows: new Map() };
  const evid = new Map();
  const note = (k, e) => { if (!evid.has(k)) evid.set(k, []); evid.get(k).push(e); };
  for (const s of sessions) {
    for (const x of s.commands) { bump(use.commands, x.name); note(`command:${x.name}`, x); }
    for (const x of s.skills) { bump(use.skills, x.name); note(`skill:${x.name}`, x); }
    for (const x of s.workflows) { bump(use.workflows, x.name); note(`workflow:${x.name}`, x); }
  }
  for (const a of agents) { bump(use.agents, short(a.type, P)); note(`agent:${short(a.type, P)}`, { ref: a.ref, ts: a.start, snippet: a.description }); }
  const usage = Object.fromEntries(Object.entries(use).map(([k, m]) => [k, Object.fromEntries([...m].sort((x, y) => y[1] - x[1]))]));
  for (const [kind, list] of [['agents', inv.agents], ['commands', inv.commands], ['skills', inv.skills], ['workflows', inv.workflows]]) {
    const one = kind.slice(0, -1);
    const unused = list.filter((name) => !use[kind].get(name) && !(kind === 'agents' && name === 'team-lead'));
    if (unused.length && sessions.length >= MIN_SESSIONS_FOR_UNUSED) out.push({ id: `unused-${kind}`, kind: 'unused', component: unused.map((n) => `${kind}/${n}`).join(', '), action: 'remove|merge|edit-description', summary: `${unused.length} ${kind} never used in ${sessions.length} plugin sessions: ${unused.join(', ')}${kind === 'commands' ? ' (counts typed commands only; /run picks pipelines itself, see workflows)' : ''}`, metric: { unused, sessions: sessions.length }, sessions: 0, evidence: [] });
    const unknown = [...use[kind]].filter(([name]) => !list.includes(name));
    if (unknown.length) add({ id: `unknown-${kind}`, kind: 'unknown', component: kind, action: 'discount-evidence|docs', summary: `${kind} used but not shipped in ${inv.version || 'this version'} (older version, renamed or removed): ${unknown.map(([n, k]) => `${n} ${k}×`).join(', ')}`, metric: Object.fromEntries(unknown), evidence: unknown.slice(0, 3).map(([n]) => (evid.get(`${one}:${n}`) || []).at(-1)).filter(Boolean) });
  }

  // Cost and time per agent type; per-agent signals only for the agents this version ships.
  const byType = new Map();
  for (const a of agents) { const k = short(a.type, P); if (!byType.has(k)) byType.set(k, []); byType.get(k).push(a); }
  const shipped = [...byType].filter(([type]) => inv.agents.includes(type));
  const totalCost = agents.reduce((x, a) => x + a.cost, 0) || 1;
  const cost = [...byType].map(([type, list]) => ({ type, calls: list.length, models: [...new Set(list.map((a) => a.model).filter(Boolean))], costTokens: list.reduce((x, a) => x + a.cost, 0), share: Math.round(100 * list.reduce((x, a) => x + a.cost, 0) / totalCost), avgCost: Math.round(list.reduce((x, a) => x + a.cost, 0) / list.length), avgDurationS: Math.round(list.reduce((x, a) => x + a.durationS, 0) / list.length), avgToolCalls: Math.round(list.reduce((x, a) => x + a.toolCalls, 0) / list.length) })).sort((x, y) => y.costTokens - x.costTokens);
  for (const c of cost.filter((c) => c.share >= 30 && c.calls >= 3 && inv.agents.includes(c.type))) {
    add({ id: `cost-${c.type}`, kind: 'cost', component: `agents/${c.type}`, action: 'edit|model', summary: `${c.type}: ${c.share}% of specialist cost (${c.calls} calls, avg ${c.avgCost} cost-tokens, ${c.avgDurationS}s, models ${c.models.join(', ')})`, metric: c, evidence: top(byType.get(c.type).sort((x, y) => x.cost - y.cost).map((a) => ({ ref: a.ref, ts: a.start, snippet: `${a.cost} cost-tokens · ${a.description}` }))) });
  }

  // Handoff status per agent type.
  for (const [type, list] of shipped) {
    for (const st of ['blocked', 'needs-input', 'missing']) {
      const hit = list.filter((a) => a.status === st);
      if (hit.length >= 2 || (hit.length && hit.length / list.length >= 0.25)) add({ id: `handoff-${st}-${type}`, kind: 'handoff', component: `agents/${type}`, action: 'edit', summary: `${type}: ${hit.length}/${list.length} runs ended ${st}`, metric: { count: hit.length, of: list.length }, evidence: top(hit.map((a) => ({ ...(a.statusRef || { ref: a.ref }), snippet: a.statusSnippet }))) });
    }
  }

  // Tool errors and permission denials per agent type.
  for (const [type, list] of shipped) {
    for (const [kind, key] of [['tool-errors', 'toolErrors'], ['denials', 'denials']]) {
      const all = list.flatMap((a) => a[key]);
      if (all.length < 3) continue;
      const tools = new Map(); for (const e of all) bump(tools, e.tool);
      add({ id: `${kind}-${type}`, kind, component: `agents/${type}`, action: kind === 'denials' ? 'disallowedTools|prompt' : 'prompt|skill', summary: `${type}: ${all.length} ${kind} in ${list.length} runs (${[...tools].sort((x, y) => y[1] - x[1]).slice(0, 3).map(([t, k]) => `${t} ${k}`).join(', ')})`, metric: { count: all.length, runs: list.length }, evidence: top(all) }, all);
    }
  }

  // Guard hook firings.
  const guard = new Map();
  for (const s of sessions) for (const g of s.guard) { const k = `${g.rule}|${short(g.who, P)}`; if (!guard.has(k)) guard.set(k, []); guard.get(k).push(g); }
  for (const [k, list] of guard) {
    const [rule, who] = k.split('|');
    add({ id: `guard-${rule}-${who}`, kind: 'guard', component: `hooks/guard.mjs (${rule}) · agents/${who}`, action: list.length >= 3 ? 'edit-prompt' : 'watch', summary: `guard ${rule} fired ${list.length}× for ${who}`, metric: { count: list.length }, evidence: top(list) }, list);
  }
  const hookErr = sessions.flatMap((s) => s.hookErrors);
  if (hookErr.length) add({ id: 'hook-errors', kind: 'hook-error', component: 'hooks', action: 'check', summary: `${hookErr.length} hook errors (any hook, not only this plugin's)`, metric: { count: hookErr.length }, evidence: top(hookErr) });

  // Re-spawns of one type in a session (fix rounds, retries).
  for (const s of sessions) {
    const m = new Map(); for (const x of s.spawns) { if (!m.has(x.type)) m.set(x.type, []); m.get(x.type).push(x); }
    for (const [t, list] of m) if (list.length >= 4) add({ id: `respawn-${short(t, P)}-${s.id.slice(0, 8)}`, kind: 'respawn', component: `agents/${short(t, P)}`, action: 'brief|qa-loop', summary: `${short(t, P)} spawned ${list.length}× directly in one session`, metric: { count: list.length }, evidence: top(list) });
  }

  // The lead doing a specialist's work; agents from outside the team.
  const edits = sessions.flatMap((s) => s.leadEdits);
  if (edits.length >= 3) add({ id: 'lead-edits', kind: 'lead-work', component: 'agents/team-lead', action: 'edit|add-agent', summary: `the main session edited ${edits.length} non-.team files itself in plugin sessions (${[...new Set(edits.map((e) => e.file))].slice(0, 4).join(', ')})`, metric: { count: edits.length }, evidence: top(edits) }, edits);
  const other = new Map(); for (const s of sessions) for (const x of s.otherAgents) { if (!other.has(x.type)) other.set(x.type, []); other.get(x.type).push(x); }
  for (const [t, list] of other) if (list.length >= 2) add({ id: `other-agent-${t}`, kind: 'roster-gap', component: 'agents', action: 'add-agent|edit-lead', summary: `${t} (not a team agent) spawned ${list.length}× in plugin sessions`, metric: { count: list.length }, evidence: top(list) }, list);

  // Repeated shell commands (candidate hook or tool).
  const bash = new Map(); for (const s of sessions) for (const b of s.bash) { if (!bash.has(b.key)) bash.set(b.key, []); bash.get(b.key).push(b); }
  for (const [k, list] of [...bash].sort((x, y) => y[1].length - x[1].length).slice(0, 6)) {
    const ss = new Set(list.map((b) => sessionOf(b.ref)));
    if (list.length >= 5 && ss.size >= 2) add({ id: `bash-${k.replace(/\W+/g, '-')}`, kind: 'repeated-command', component: 'hooks|tools|skills', action: 'add-tool|add-hook', summary: `\`${k}\` run ${list.length}× in ${ss.size} sessions by ${[...new Set(list.map((b) => short(b.who, P)))].slice(0, 4).join(', ')}`, metric: { count: list.length }, evidence: top(list) }, list);
  }

  // Interrupts, compactions, API errors, old plugin versions.
  const intr = sessions.flatMap((s) => s.interrupts);
  if (intr.length >= 2) add({ id: 'interrupts', kind: 'friction', component: 'commands|agents/team-lead', action: 'review', summary: `user interrupted ${intr.length}× in plugin sessions`, metric: { count: intr.length }, evidence: top(intr) }, intr);
  const comp = sessions.flatMap((s) => s.compactions);
  if (comp.length) add({ id: 'compactions', kind: 'context', component: 'agents/team-lead|skills/run-kit', action: 'shrink-context', summary: `${comp.length} compactions in ${sessions.filter((s) => s.compactions.length).length} plugin sessions`, metric: { count: comp.length }, evidence: top(comp) }, comp);
  const api = sessions.flatMap((s) => s.apiErrors);
  if (api.length) add({ id: 'api-errors', kind: 'environment', component: '-', action: 'none', summary: `${api.length} API errors (limits, network): not a plugin defect`, metric: { count: api.length }, evidence: top(api) });
  const old = sessions.filter((s) => s.pluginVersions.length && inv.version && !s.pluginVersions.includes(inv.version));
  if (old.length) add({ id: 'old-versions', kind: 'version', component: 'plugin', action: 'discount-evidence', summary: `${old.length} sessions ran another plugin version (${[...new Set(old.flatMap((s) => s.pluginVersions))].join(', ')}); current ${inv.version}`, metric: { count: old.length }, evidence: old.slice(-3).map((s) => ({ ref: s.ref, ts: s.start, snippet: s.pluginVersions.join(', ') })) });

  return { usage, cost, list: out };
}

export function renderDigest(d) {
  const { meta, signals: sg, sessions } = d;
  const L = [];
  L.push(`# Retrospect digest — ${meta.plugin} ${meta.pluginVersion || ''}`, '');
  L.push(`Window: last ${meta.days} days (${meta.from.slice(0, 10)} → ${meta.generated.slice(0, 10)}) · transcripts scanned ${meta.scanned} · plugin sessions ${meta.pluginSessions} · plugin-repo sessions excluded ${meta.devSessionsExcluded}`);
  for (const n of meta.notes) L.push(`Note: ${n}`);
  L.push('', 'Evidence refs are `<project>/<session>.jsonl:L<line>` under ~/.claude/projects. Cost-tokens = input + 1.25×cache write + 0.1×cache read + 5×output.', '');
  L.push('## Sessions', '', '| Session | Start | Entry | Plugin ver | Commands | Specialist runs | Lead ctx max | Lead cost-tokens |', '|---|---|---|---|---|---|---|---|');
  for (const s of sessions.slice(-25)) L.push(`| ${s.ref} | ${(s.start || '').slice(0, 16)} | ${s.entrypoint || ''} | ${s.pluginVersions.join(' ') || '?'} | ${s.commands.map((c) => c.name).join(' ') || '-'} | ${s.agents.length} | ${s.leadContextMax} | ${s.leadCost} |`);
  if (sessions.length > 25) L.push(`| … ${sessions.length - 25} older sessions in digest.json | | | | | | | |`);
  L.push('', '## Usage', '');
  for (const [k, m] of Object.entries(sg.usage)) L.push(`- ${k}: ${Object.entries(m).map(([n, c]) => `${n} ${c}`).join(', ') || 'none'}`);
  L.push('', '## Cost per specialist', '', '| Agent | Calls | Models | Share | Avg cost-tokens | Avg s | Avg tool calls |', '|---|---|---|---|---|---|---|');
  for (const c of sg.cost) L.push(`| ${c.type} | ${c.calls} | ${c.models.join(' ')} | ${c.share}% | ${c.avgCost} | ${c.avgDurationS} | ${c.avgToolCalls} |`);
  L.push('', `## Signals (${sg.list.length})`, '');
  const order = ['guard', 'handoff', 'denials', 'tool-errors', 'respawn', 'lead-work', 'roster-gap', 'repeated-command', 'cost', 'context', 'friction', 'unused', 'unknown', 'version', 'hook-error', 'environment'];
  for (const x of [...sg.list].sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind))) {
    L.push(`### ${x.id} — ${x.kind}`, `- ${x.summary}`, `- Component: ${x.component} · suggested action: ${x.action} · sessions: ${x.sessions}`);
    for (const e of x.evidence) L.push(`  - \`${e.ref}\`${e.ts ? ` @${e.ts.slice(0, 16)}` : ''}${e.snippet ? ` — ${e.snippet.replace(/\|/g, '/')}` : ''}`);
  }
  const msgs = sessions.flatMap((s) => s.userMsgs).slice(-15);
  if (msgs.length) {
    L.push('', '## Recent user messages in plugin sessions (judge corrections and complaints yourself)', '');
    for (const e of msgs) L.push(`- \`${e.ref}\` @${(e.ts || '').slice(0, 16)} — ${e.snippet}`);
  }
  return L.join('\n') + '\n';
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url).toLowerCase() === (await import('node:path')).resolve(process.argv[1]).toLowerCase();
if (isMain) {
  const o = parseArgs(process.argv.slice(2));
  const d = collect(o);
  const out = o.out || join(tmpdir(), `${o.plugin || 'technical-team'}-retrospect`);
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, 'digest.json'), JSON.stringify(d, null, 1));
  writeFileSync(join(out, 'digest.md'), renderDigest(d));
  console.log(`${d.meta.pluginSessions} plugin sessions (${d.meta.scanned} scanned, last ${d.meta.days} days), ${d.signals.list.length} signals → ${join(out, 'digest.md')}`);
}
