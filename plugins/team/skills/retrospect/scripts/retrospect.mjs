#!/usr/bin/env node
// Retrospect miner for the technical team (skill `retrospect`): scans the local Claude Code transcripts (CLI and desktop
// both write ~/.claude/projects/<project>/<session>.jsonl, subagents under <session>/subagents/, workflow agents under
// subagents/workflows/wf_*/) and turns them into counts and signals with evidence (file:line @time + a redacted snippet).
// Every signal is a keyword heuristic: open it with --show before citing it. Read-only, local only: no network,
// writes only to --out.
//   node retrospect.mjs [--days 14] [--out <dir>] [--project <substr>] [--exclude-project <substr>]...
//                       [--exclude-session <id>] [--root <projects dir>] [--plugin technical-team] [--plugin-root <dir>]
//                       [--include-dev] [--include-probes] [--now <ISO>]
//   node retrospect.mjs --show <project>/<session>.jsonl:L<n> [--radius 4]   → the context of one evidence item
// → <out>/digest.md (short, for the retrospector) and <out>/digest.json (everything).
import { readFileSync, readdirSync, statSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname, relative, sep, resolve } from 'node:path';
import { homedir, tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

export const DAYS = { min: 7, max: 30, def: 14 };
export const MIN_SESSIONS_FOR_UNUSED = 5;
export const PROBE_COST = 50_000; // a session under this many cost-tokens, with ≤1 agent run and no command, is a probe
export const LONG_PROMPT = 1500; // chars: a long prompt written from scratch
export const LARGE_PASTE = 4000; // chars: a paste
const PLUGIN_SRC_RE = /plugins\/team\/(agents|commands|skills|workflows|hooks|tools|templates)\/|plugins\/team\/\.claude-plugin\//;
const SCRATCH_RE = /scratchpad/i;
const PLUGIN_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const SNIP = 200;
const LIST = 15; // rows per list in digest.md; digest.json has all

// Cost-equivalent tokens, in units of one uncached input token (cache write 1.25×, cache read 0.1×, output 5×).
export const costTokens = (u = {}) => Math.round((u.input_tokens || 0) + 1.25 * (u.cache_creation_input_tokens || 0)
  + 0.1 * (u.cache_read_input_tokens || 0) + 5 * (u.output_tokens || 0));
const contextTokens = (u = {}) => (u.input_tokens || 0) + (u.cache_creation_input_tokens || 0) + (u.cache_read_input_tokens || 0);

const SECRET_RE = /(sk-[A-Za-z0-9_-]{16,}|gh[pousr]_[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|xox[abp]-[A-Za-z0-9-]{10,}|Bearer\s+[A-Za-z0-9._~+/-]{12,}|eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+|\b(?:password|passwd|pwd|secret|token|api[_-]?key)\b\s*["']?\s*[:=]\s*["']?[^\s"',;]+)/gi;
export const redact = (s) => String(s ?? '').replace(SECRET_RE, '[REDACTED]');
const snip = (s, n = SNIP) => redact(String(s ?? '').replace(/\s+/g, ' ').trim()).slice(0, n);

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
const STATUSES = ['done', 'blocked', 'needs-input'];

// Work type of a prompt (English and Vietnamese keywords; first match wins).
export const WORK_TYPES = [
  ['fix', /\b(bug|fix|error|crash|fail(s|ed|ing)?|broken|regression)\b|lỗi|sửa|hỏng|không chạy/i],
  ['test', /\b(tests?|coverage|e2e)\b|kiểm thử/i],
  ['review', /\b(review|audit|retro)\b|đánh giá|kiểm tra lại/i],
  ['infra', /\b(deploy|ci|cd|docker|k8s|kubernetes|pipeline|release|infra)\b|triển khai/i],
  ['docs', /\b(readme|docs?|changelog|runbook)\b|tài liệu/i],
  ['feature', /\b(add|implement|build|create|feature|support)\b|thêm|tạo|tính năng|làm (một|1|cho)/i],
  ['question', /\?\s*$|^(what|why|how|which|can|does|is)\b|^(tại sao|làm sao|có nên|cái gì|là gì)/i],
];
export const workType = (t) => (WORK_TYPES.find(([, re]) => re.test(t)) || ['other'])[0];
// A prompt right after a team run that pushes back on it.
export const CORRECTION_RE = /^(no\b|nope|wrong|not (what|right|correct)|that'?s not|still\b|again\b|undo|revert|why did you|you (forgot|missed|broke))|\b(doesn'?t work|didn'?t work|not working|still (fails?|broken|wrong))\b|^(không|ko|sai|chưa|vẫn)\b|không đúng|sai rồi|làm lại|sửa lại|vẫn (lỗi|sai|chưa)|chưa đúng|chưa được/i;
const TEST_RE = /\b(test|tests|vitest|jest|pytest|mocha|playwright|go test|cargo test|dotnet test|npm t)\b/i;

export function parseArgs(argv) {
  const o = { days: DAYS.def, notes: [], excludeProjects: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]; const v = () => argv[++i];
    if (a === '--days') o.days = Number(v());
    else if (/^\d+$/.test(a)) o.days = Number(a);
    else if (a === '--out') o.out = v();
    else if (a === '--project') o.project = v();
    else if (a === '--exclude-project') o.excludeProjects.push(v());
    else if (a === '--exclude-session') o.excludeSession = v();
    else if (a === '--root') o.root = v();
    else if (a === '--plugin') o.plugin = v();
    else if (a === '--plugin-root') o.pluginRoot = v();
    else if (a === '--include-dev') o.includeDev = true;
    else if (a === '--include-probes') o.includeProbes = true;
    else if (a === '--now') o.now = v();
    else if (a === '--show') o.show = v();
    else if (a.startsWith('--show=')) o.show = a.slice(7);
    else if (a === '--radius') o.radius = Number(v());
  }
  if (!Number.isFinite(o.days)) o.days = DAYS.def;
  const d = Math.min(DAYS.max, Math.max(DAYS.min, Math.round(o.days)));
  if (d !== o.days) o.notes.push(`--days ${o.days} clamped to ${d} (range ${DAYS.min}–${DAYS.max})`);
  o.days = d;
  if (o.excludeSession && o.excludeSession.includes('${')) delete o.excludeSession; // unsubstituted placeholder
  return o;
}

// What the plugin ships, with each definition's description and size (to compare triggers and prompt length).
export function inventory(root = PLUGIN_ROOT) {
  const words = (f) => { try { return readFileSync(f, 'utf8').split(/\s+/).filter(Boolean).length; } catch { return 0; } };
  const desc = (f) => { try { return (readFileSync(f, 'utf8').match(/^description:\s*"?(.+?)"?\s*$/m) || [])[1] || ''; } catch { return ''; } };
  const md = (d) => (existsSync(join(root, d)) ? readdirSync(join(root, d)).filter((f) => f.endsWith('.md')).map((f) => f.slice(0, -3)).sort() : []);
  const agents = md('agents');
  const preloaded = new Set();
  for (const a of agents) {
    const m = readFileSync(join(root, 'agents', `${a}.md`), 'utf8').match(/^skills:\s*\[(.*)\]/m);
    if (m) for (const s of m[1].split(',')) preloaded.add(s.trim().replace(/["']/g, '').split(':').pop());
  }
  const allSkills = existsSync(join(root, 'skills')) ? readdirSync(join(root, 'skills')).sort() : [];
  const workflows = existsSync(join(root, 'workflows')) ? readdirSync(join(root, 'workflows')).filter((f) => f.endsWith('.js')).map((f) => `team-${f.slice(0, -3)}`).sort() : [];
  const definitions = [
    ...agents.map((n) => ({ kind: 'agent', name: n, file: `agents/${n}.md` })),
    ...md('commands').map((n) => ({ kind: 'command', name: n, file: `commands/${n}.md` })),
    ...allSkills.map((n) => ({ kind: 'skill', name: n, file: `skills/${n}/SKILL.md` })),
    ...workflows.map((n) => ({ kind: 'workflow', name: n, file: `workflows/${n.slice(5)}.js` })),
  ].map((x) => ({ ...x, words: words(join(root, x.file)), description: x.kind === 'workflow' ? '' : desc(join(root, x.file)) }));
  let version = null;
  try { version = JSON.parse(readFileSync(join(root, '.claude-plugin', 'plugin.json'), 'utf8')).version; } catch { /* none */ }
  return { root, agents, commands: md('commands'), skills: allSkills.filter((s) => !preloaded.has(s)), preloadedSkills: [...preloaded], workflows, version, definitions };
}

// Agent runs only (agent-*.jsonl); workflow journals and other files are not runs.
const walkAgents = (dir, out = []) => {
  let ents; try { ents = readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of ents) {
    const f = join(dir, e.name);
    if (e.isDirectory()) walkAgents(f, out); else if (/^agent-.*\.jsonl$/.test(e.name)) out.push(f);
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

// A prompt's key for "the same instruction again": lowercase, no digits, paths, quotes or punctuation; first 80 chars.
export const promptKey = (t) => String(t).toLowerCase().replace(/[`'"][^`'"]*[`'"]/g, ' ').replace(/\S*[\\/]\S*/g, ' ')
  .replace(/[\d_]+/g, ' ').replace(/[^\p{L}\s]/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, 80);
const opening = (t) => promptKey(t).split(' ').slice(0, 4).join(' ');

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
  const esc = plugin.replace(/[-]/g, '\\-');
  const re = {
    version: new RegExp(`${esc}[\\\\/]+(\\d+\\.\\d+\\.\\d+)[\\\\/]`),
    // --plugin-dir: a working copy, no version in the path.
    dev: /plugins[\\/]+team[\\/]+(agents|commands|skills|workflows|hooks|tools|templates)[\\/]/,
  };
  const ev = (file, n, ts, text) => ({ ref: `${relative(root, file).split(sep).join('/')}:L${n}`, ts: ts || null, snippet: snip(text) });
  const ctx = { cutoff, P, re, ev, inv };

  const scannedList = [];
  for (const proj of (existsSync(root) ? readdirSync(root, { withFileTypes: true }) : []).filter((d) => d.isDirectory())) {
    const lname = proj.name.toLowerCase();
    if (opts.project && !lname.includes(opts.project.toLowerCase())) continue;
    if ((opts.excludeProjects || []).some((x) => lname.includes(x.toLowerCase()))) continue;
    const pdir = join(root, proj.name);
    for (const f of readdirSync(pdir).filter((x) => x.endsWith('.jsonl'))) {
      const id = f.slice(0, -6);
      if (id === opts.excludeSession) continue;
      const file = join(pdir, f);
      const subs = walkAgents(join(pdir, id, 'subagents'));
      const mtime = Math.max(statSync(file).mtimeMs, ...subs.map((s) => statSync(s).mtimeMs));
      if (mtime < cutoff) continue;
      scannedList.push(scanSession({ project: proj.name, id, file, subs, ...ctx }));
    }
  }
  // A copied or moved project keeps its transcripts: count one session once (same first entry).
  const seen = new Set();
  const unique = scannedList.filter((s) => !(s.firstUuid && seen.has(s.firstUuid)) && (seen.add(s.firstUuid), true));
  const dev = unique.filter((s) => s.dev && !opts.includeDev);
  const kept = unique.filter((s) => !s.dev || opts.includeDev);
  const probes = kept.filter((s) => s.probe && !opts.includeProbes);
  const work = kept.filter((s) => !(s.probe && !opts.includeProbes));
  const used = work.filter((s) => s.usesPlugin);
  // A forked or resumed session repeats its parent's prompts: count each (time, text) once.
  const seenPrompt = new Set();
  let dupPrompts = 0;
  for (const s of work) s.prompts = s.prompts.filter((p) => { const k = `${p.ts}|${p.text.slice(0, 200)}`; if (seenPrompt.has(k)) { dupPrompts++; return false; } seenPrompt.add(k); return true; });
  const meta = { generated: new Date(now).toISOString(), days, from: new Date(cutoff).toISOString(), root: '~/.claude/projects', plugin, pluginVersion: inv.version, pluginRoot: inv.root,
    scanned: scannedList.length, copiesMerged: scannedList.length - unique.length, devSessionsExcluded: dev.length, probeSessionsExcluded: probes.length, workSessions: work.length,
    pluginSessions: used.length, duplicatePrompts: dupPrompts, notes: opts.notes || [] };
  return { meta, inventory: inv, sessions: used, signals: signals(used, inv, P, work), excluded: { dev: dev.map((s) => s.ref), probes: probes.map((s) => s.ref) } };
}

function scanSession({ project, id, file, subs, cutoff, P, re, ev }) {
  const s = { project, id, ref: `${project}/${id}.jsonl`, cwd: null, start: null, end: null, entrypoint: null, ccVersion: null,
    pluginVersions: new Set(), usesPlugin: false, dev: false, probe: false, commands: [], spawns: [], workflows: [], skills: [], leadEdits: [], otherAgents: [],
    bash: [], prompts: [], corrections: [], interrupts: [], compactions: [], apiErrors: [], hookErrors: [], guard: [], leadContextMax: 0, leadCost: 0, agents: [],
    codeChanged: false, tested: false, reviewed: false };
  let turn = null; // the current user prompt and the team pieces that ran in its turn
  const teamUse = (actor) => { if (turn) { turn.p.withTeam = true; turn.actor = actor; } };
  for (const [n, o, raw] of lines(file)) {
    const ts = o.timestamp;
    const vm = raw.match(re.version); if (vm) s.pluginVersions.add(vm[1]); else if (re.dev.test(raw)) s.pluginVersions.add('dev');
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
          if (t.startsWith(P)) {
            teamUse(`agent:${t.slice(P.length)}`);
            if (/team-(developer|dba|devops)$/.test(t)) s.codeChanged = true;
            if (/team-(code-reviewer|qa|security)$/.test(t)) s.reviewed = true;
          }
        } else if (b.name === 'Workflow' && String(i.name || '').startsWith(P)) {
          s.workflows.push({ name: i.name.slice(P.length), ...ev(file, n, ts, i.name) });
          teamUse(`workflow:${i.name.slice(P.length)}`);
          if (/build-loop|review|release/.test(i.name)) { s.reviewed = true; s.tested = true; }
        } else if (b.name === 'Skill' && String(i.skill || '').startsWith(P)) {
          s.skills.push({ name: i.skill.slice(P.length), who: 'orchestrator', ...ev(file, n, ts, i.skill) });
          teamUse(`skill:${i.skill.slice(P.length)}`);
        } else if (/^(Edit|Write|MultiEdit|NotebookEdit)$/.test(b.name)) {
          const fp = String(i.file_path || i.notebook_path || '').replace(/\\/g, '/');
          if (PLUGIN_SRC_RE.test(fp)) s.editsPlugin = true;
          if (fp && !fp.includes('/.team/') && !fp.includes('/.claude/')) {
            s.leadEdits.push({ file: fp.split('/').slice(-2).join('/'), ...ev(file, n, ts, `${b.name} ${fp}`) });
            if (!/\.(md|txt|json)$/i.test(fp)) s.codeChanged = true;
          }
        } else if (/^(Bash|PowerShell)$/.test(b.name)) {
          const k = normBash(i.command); if (k) s.bash.push({ key: k, who: 'orchestrator', ...ev(file, n, ts, i.command) });
          if (TEST_RE.test(String(i.command || ''))) s.tested = true;
        }
      }
    } else if (o.type === 'user') {
      if (typeof c === 'string' || (Array.isArray(c) && c.every((b) => b.type === 'text'))) {
        const t = textOf(c);
        const cm = t.match(new RegExp(`<command-name>/${P}([\\w-]+)</command-name>`));
        if (cm) {
          const args = t.match(/<command-args>([\s\S]*?)<\/command-args>/)?.[1] || '';
          s.commands.push({ name: cm[1], ...ev(file, n, ts, args || cm[0]) });
          const p = { text: redact(args).slice(0, 500), len: args.length, type: workType(args || cm[1]), withTeam: true, ...ev(file, n, ts, `/${cm[1]} ${args}`) };
          s.prompts.push(p); turn = { p, actor: `command:${cm[1]}` };
        } else if (/\[Request interrupted by user/.test(t)) s.interrupts.push(ev(file, n, ts, t));
        else if (!o.isMeta && !o.isCompactSummary && !/^\s*</.test(t) && t.trim()) {
          // A team piece ran in the previous turn and this prompt pushes back → a correction of that piece.
          if (turn?.actor && CORRECTION_RE.test(t.trim())) s.corrections.push({ actor: turn.actor, ...ev(file, n, ts, t) });
          const p = { text: redact(t).slice(0, 500), len: t.length, type: workType(t), withTeam: false, handoffPaste: /###\s*Handoff|^\s*-\s*Status:\s*\w+/im.test(t), ...ev(file, n, ts, t) };
          s.prompts.push(p); turn = { p, actor: null };
        }
      }
      for (const b of Array.isArray(c) ? c : []) {
        if (b.type !== 'tool_result') continue;
        const t = textOf(b.content);
        if (/hook (error|blocking)/i.test(t.slice(0, 120))) { const r = guardRule(t); if (r) s.guard.push({ rule: r, who: 'orchestrator', ...ev(file, n, ts, t) }); }
      }
    } else if (o.type === 'attachment' && /hook_blocking_error|hook_error/.test(o.attachment?.type || '')) {
      const t = JSON.stringify(o.attachment); const r = guardRule(t);
      if (r) s.guard.push({ rule: r, who: 'orchestrator', ...ev(file, n, ts, t) });
    } else if (o.type === 'system') {
      if (o.subtype === 'compact_boundary') s.compactions.push(ev(file, n, ts, 'compaction'));
      for (const e of o.hookErrors || []) s.hookErrors.push(ev(file, n, ts, e));
    }
  }
  // An agent run with no entry inside the window (an older run of a resumed session) does not count.
  for (const f of subs) { const a = scanAgent(f, s, { cutoff, P, re, ev }); if (a.ref) s.agents.push(a); }
  s.usesPlugin = s.commands.length + s.spawns.length + s.workflows.length + s.skills.length > 0 || s.agents.some((a) => a.type?.startsWith(P));
  const cost = s.leadCost + s.agents.reduce((x, a) => x + a.cost, 0);
  // A probe: tiny, or run from a scratchpad (test sessions the user or an agent set up to try the plugin).
  s.scratch = SCRATCH_RE.test(project) || SCRATCH_RE.test(s.cwd || '');
  s.probe = s.scratch || (s.usesPlugin && (cost < PROBE_COST && s.agents.length <= 1 && !s.commands.length && !s.workflows.length));
  // Plugin development: the cwd is the plugin repo, or the session edited the plugin's own source (the repo may be gone).
  try { s.dev = s.editsPlugin || (!!s.cwd && existsSync(join(s.cwd, 'plugins', 'team', '.claude-plugin', 'plugin.json'))); } catch { s.dev = s.editsPlugin; }
  s.pluginVersions = [...s.pluginVersions].sort();
  return s;
}

function scanAgent(file, s, { cutoff, P, re, ev }) {
  let meta = {};
  try { meta = JSON.parse(readFileSync(file.replace(/\.jsonl$/, '.meta.json'), 'utf8')); } catch { /* none */ }
  const wf = file.split(sep).find((p) => p.startsWith('wf_')) || null;
  const a = { type: meta.agentType || null, model: meta.model || null, workflow: wf, description: snip(meta.description || ''), ref: null,
    start: null, end: null, cost: 0, toolCalls: 0, toolErrors: [], denials: [], status: null, statusRaw: null, next: null, lastText: '', statusRef: null, structured: null };
  const names = new Map();
  const times = [];
  for (const [n, o, raw] of lines(file)) {
    const ts = o.timestamp;
    const vm = raw.match(re.version); if (vm) s.pluginVersions.add(vm[1]); else if (re.dev.test(raw)) s.pluginVersions.add('dev');
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
        const i = b.input || {};
        if (b.name === 'SubagentHandback') { a.lastText = String(i.message || ''); a.statusRef = ev(file, n, ts, ''); }
        // Workflow agents return structured output: its `handoff` text and `status` field are the report.
        if (b.name === 'StructuredOutput') { a.structured = i.status || null; a.lastText = String(i.handoff || JSON.stringify(i)); a.statusRef = ev(file, n, ts, ''); }
        if (b.name === 'Skill' && String(i.skill || '').startsWith(P)) s.skills.push({ name: i.skill.slice(P.length), who: a.type || 'agent', ...ev(file, n, ts, i.skill) });
        if (/^(Bash|PowerShell)$/.test(b.name)) {
          const k = normBash(i.command); if (k) s.bash.push({ key: k, who: a.type || 'agent', ...ev(file, n, ts, i.command) });
          if (TEST_RE.test(String(i.command || ''))) s.tested = true;
        }
        if (/^(Edit|Write|MultiEdit)$/.test(b.name) && !/\.(md|txt|json)$/i.test(String(i.file_path || '')) && !String(i.file_path || '').replace(/\\/g, '/').includes('/.team/')) s.codeChanged = true;
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
  const m = [...t.matchAll(/-\s*Status:\s*([\w-]+)/gi)].pop();
  a.statusRaw = m ? m[1].toLowerCase() : null;
  a.status = a.statusRaw && STATUSES.includes(a.statusRaw) ? a.statusRaw
    : a.statusRaw ? 'non-standard'
      : a.structured && STATUSES.includes(a.structured) ? a.structured
        : a.structured ? 'structured' : !t ? 'none' : /^[{[]/.test(t) ? 'structured' : 'missing';
  // The role a Next line hands to; an ID there (`CART-T3`) is a ticket, not a role.
  const next = ([...t.matchAll(/-\s*Next:\s*`?([\w-]+)/gi)].pop() || [])[1]?.toLowerCase() || null;
  a.next = next && /^[a-z-]+$/.test(next) ? next : null;
  a.statusSnippet = snip(t.slice(-SNIP));
  a.durationS = activeSeconds(times);
  delete a.lastText;
  return a;
}

const short = (t, P) => String(t || '?').replace(P, '');
const bump = (m, k, by = 1) => m.set(k, (m.get(k) || 0) + by);
const group = (arr, key) => { const m = new Map(); for (const x of arr) { const k = key(x); if (!m.has(k)) m.set(k, []); m.get(k).push(x); } return m; };
const top = (arr, n = 3) => arr.slice(-n);
const pct = (a, b) => (b ? Math.round((100 * a) / b) : 0);
const sessionOf = (ref) => String(ref || '').split(':L')[0].replace(/\/subagents\/.*$/, '').replace(/\.jsonl$/, '');

export function signals(sessions, inv, P, work = sessions) {
  const out = [];
  // `all` = every occurrence behind the signal (evidence shows only the last 3).
  const add = (x, all = x.evidence) => out.push({ sessions: new Set(all.map((e) => sessionOf(e.ref))).size, total: all.length, ...x });
  const agents = sessions.flatMap((s) => s.agents.filter((a) => a.type?.startsWith(P)).map((a) => ({ ...a, session: s.ref })));
  const validNext = new Set(['user', 'orchestrator', 'none', 'lead', ...inv.agents, ...inv.agents.map((x) => x.replace(/^team-/, ''))]);

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
  const neverUsed = [];
  for (const [kind, list] of [['agents', inv.agents], ['commands', inv.commands], ['skills', inv.skills], ['workflows', inv.workflows]]) {
    const one = kind.slice(0, -1);
    const unused = list.filter((name) => !use[kind].get(name) && !(kind === 'agents' && name === 'team-orchestrator'));
    neverUsed.push(...unused.map((n) => `${kind}/${n}`));
    if (unused.length && sessions.length >= MIN_SESSIONS_FOR_UNUSED) out.push({ id: `unused-${kind}`, kind: 'unused', component: unused.map((n) => `${kind}/${n}`).join(', '), action: 'remove|merge|edit-description', summary: `${unused.length} ${kind} never used in ${sessions.length} plugin sessions: ${unused.join(', ')}${kind === 'commands' ? ' (counts typed commands only; /run picks pipelines itself, see workflows)' : ''}`, metric: { unused, sessions: sessions.length }, sessions: 0, total: 0, evidence: [] });
    const unknown = [...use[kind]].filter(([name]) => !list.includes(name));
    if (unknown.length) add({ id: `unknown-${kind}`, kind: 'unknown', component: kind, action: 'discount-evidence|docs', summary: `${kind} used but not shipped in ${inv.version || 'this version'} (older version, renamed or removed): ${unknown.map(([n, k]) => `${n} ${k}×`).join(', ')}`, metric: Object.fromEntries(unknown), evidence: unknown.slice(0, 3).map(([n]) => (evid.get(`${one}:${n}`) || []).at(-1)).filter(Boolean) });
  }

  // Work inventory: every prompt of the work sessions (plugin or not), by type, with or without the team.
  const prompts = work.flatMap((s) => s.prompts.map((p) => ({ ...p, session: s.ref })));
  const inventoryRows = [...group(prompts, (p) => p.type)].map(([type, list]) => ({ type, prompts: list.length, withTeam: list.filter((p) => p.withTeam).length, sessions: new Set(list.map((p) => p.session)).size, example: list.at(-1) })).sort((x, y) => y.prompts - x.prompts);
  for (const r of inventoryRows.filter((r) => r.type !== 'question' && r.type !== 'other' && r.prompts - r.withTeam >= 3)) {
    const hand = prompts.filter((p) => p.type === r.type && !p.withTeam);
    add({ id: `by-hand-${r.type}`, kind: 'work-by-hand', component: 'commands|agents', action: 'edit-description|add', summary: `${r.prompts - r.withTeam} of ${r.prompts} "${r.type}" prompts ran without the team`, metric: r, evidence: top(hand) }, hand);
  }

  // Corrections right after a team piece ran, by actor.
  const corrections = work.flatMap((s) => s.corrections);
  for (const [actor, list] of group(corrections, (c) => c.actor)) if (list.length >= 2) add({ id: `corrections-${actor.replace(/\W+/g, '-')}`, kind: 'correction', component: actor.replace(/^agent:/, 'agents/').replace(/^command:/, 'commands/').replace(/^workflow:/, 'workflows/').replace(/^skill:/, 'skills/'), action: 'edit', summary: `${list.length} corrections right after ${actor}`, metric: { count: list.length }, evidence: top(list) }, list);

  // The same instruction in ≥3 sessions; the same opening in ≥3 sessions; long prompts; pastes and pasted handoffs.
  const plain = prompts.filter((p) => p.len && p.len < LONG_PROMPT && !p.withTeam);
  for (const [k, list] of [...group(plain, (p) => promptKey(p.text))].filter(([k, l]) => k.length >= 12 && new Set(l.map((p) => p.session)).size >= 3).slice(0, 5)) {
    add({ id: `repeated-${k.slice(0, 24).replace(/\W+/g, '-')}`, kind: 'repeated-instruction', component: 'skills|agents|CLAUDE.md', action: 'add-rule|edit', summary: `the same instruction in ${new Set(list.map((p) => p.session)).size} sessions: "${snip(k, 60)}"`, metric: { count: list.length }, evidence: top(list) }, list);
  }
  for (const [k, list] of [...group(plain, (p) => opening(p.text))].filter(([k, l]) => k.split(' ').length === 4 && l.length >= 4 && new Set(l.map((p) => p.session)).size >= 3).slice(0, 5)) {
    add({ id: `opening-${k.replace(/\W+/g, '-').slice(0, 24)}`, kind: 'similar-opening', component: 'commands', action: 'add-command|edit', summary: `${list.length} prompts open with "${k}" in ${new Set(list.map((p) => p.session)).size} sessions`, metric: { count: list.length }, evidence: top(list) }, list);
  }
  const long = prompts.filter((p) => p.len >= LONG_PROMPT && p.len < LARGE_PASTE && !p.handoffPaste);
  if (long.length >= 3) add({ id: 'long-prompts', kind: 'long-prompt', component: 'commands|skills', action: 'add-command|add-reference', summary: `${long.length} long prompts (${LONG_PROMPT}+ chars) written from scratch`, metric: { count: long.length }, evidence: top(long) }, long);
  const pastes = prompts.filter((p) => p.handoffPaste || p.len >= LARGE_PASTE);
  if (pastes.length) add({ id: 'manual-handoffs', kind: 'manual-handoff', component: 'agents/team-orchestrator|workflows', action: 'edit', summary: `${pastes.filter((p) => p.handoffPaste).length} pasted Handoff blocks, ${pastes.filter((p) => !p.handoffPaste).length} large pastes`, metric: { count: pastes.length }, evidence: top(pastes) }, pastes);

  // Cost and time per agent type; per-agent signals only for the agents this version ships.
  const byType = group(agents, (a) => short(a.type, P));
  const shipped = [...byType].filter(([type]) => inv.agents.includes(type));
  const totalCost = agents.reduce((x, a) => x + a.cost, 0) || 1;
  const cost = [...byType].map(([type, list]) => ({ type, calls: list.length, models: [...new Set(list.map((a) => a.model).filter(Boolean))], costTokens: list.reduce((x, a) => x + a.cost, 0), share: Math.round(100 * list.reduce((x, a) => x + a.cost, 0) / totalCost), avgCost: Math.round(list.reduce((x, a) => x + a.cost, 0) / list.length), avgDurationS: Math.round(list.reduce((x, a) => x + a.durationS, 0) / list.length), avgToolCalls: Math.round(list.reduce((x, a) => x + a.toolCalls, 0) / list.length) })).sort((x, y) => y.costTokens - x.costTokens);
  for (const c of cost.filter((c) => c.share >= 30 && c.calls >= 3 && inv.agents.includes(c.type))) {
    add({ id: `cost-${c.type}`, kind: 'cost', component: `agents/${c.type}`, action: 'edit|model', summary: `${c.type}: ${c.share}% of specialist cost (${c.calls} calls, avg ${c.avgCost} cost-tokens, ${c.avgDurationS}s, models ${c.models.join(', ')})`, metric: c, evidence: top(byType.get(c.type).sort((x, y) => x.cost - y.cost).map((a) => ({ ref: a.ref, ts: a.start, snippet: `${a.cost} cost-tokens · ${a.description}` }))) });
  }

  // Sub-agent health per shipped type: handoff status, non-standard Status, Next naming no agent, tool errors, denials.
  const health = shipped.map(([type, list]) => ({ type, runs: list.length,
    ...Object.fromEntries(['done', 'blocked', 'needs-input', 'missing', 'non-standard', 'structured', 'none'].map((st) => [st, list.filter((a) => a.status === st).length])),
    invalidNext: list.filter((a) => a.next && !validNext.has(a.next)).length, toolErrors: list.reduce((x, a) => x + a.toolErrors.length, 0), denials: list.reduce((x, a) => x + a.denials.length, 0) }));
  for (const [type, list] of shipped) {
    for (const st of ['blocked', 'needs-input', 'missing', 'non-standard']) {
      const hit = list.filter((a) => a.status === st);
      if (hit.length >= 2 || (hit.length && (st === 'non-standard' || hit.length / list.length >= 0.25))) add({ id: `handoff-${st}-${type}`, kind: 'handoff', component: `agents/${type}`, action: 'edit', summary: `${type}: ${hit.length}/${list.length} runs ended ${st}${st === 'non-standard' ? ` (${[...new Set(hit.map((a) => a.statusRaw))].join(', ')})` : ''}`, metric: { count: hit.length, of: list.length }, evidence: top(hit.map((a) => ({ ...(a.statusRef || { ref: a.ref }), snippet: a.statusSnippet }))) });
    }
    const bad = list.filter((a) => a.next && !validNext.has(a.next));
    if (bad.length) add({ id: `invalid-next-${type}`, kind: 'handoff', component: `agents/${type}`, action: 'edit', summary: `${type}: Next names no agent (${[...new Set(bad.map((a) => a.next))].join(', ')}) in ${bad.length} runs`, metric: { count: bad.length }, evidence: top(bad.map((a) => ({ ...(a.statusRef || { ref: a.ref }), snippet: a.statusSnippet }))) });
    for (const [kind, key] of [['tool-errors', 'toolErrors'], ['denials', 'denials']]) {
      const all = list.flatMap((a) => a[key]);
      if (all.length < 3) continue;
      const tools = new Map(); for (const e of all) bump(tools, e.tool);
      add({ id: `${kind}-${type}`, kind, component: `agents/${type}`, action: kind === 'denials' ? 'disallowedTools|prompt' : 'prompt|skill', summary: `${type}: ${all.length} ${kind} in ${list.length} runs (${[...tools].sort((x, y) => y[1] - x[1]).slice(0, 3).map(([t, k]) => `${t} ${k}`).join(', ')})`, metric: { count: all.length, runs: list.length }, evidence: top(all) }, all);
    }
  }

  // Guard hook firings.
  for (const [k, list] of group(sessions.flatMap((s) => s.guard), (g) => `${g.rule}|${short(g.who, P)}`)) {
    const [rule, who] = k.split('|');
    add({ id: `guard-${rule}-${who}`, kind: 'guard', component: `hooks/guard.mjs (${rule}) · agents/${who}`, action: list.length >= 3 ? 'edit-prompt' : 'watch', summary: `guard ${rule} fired ${list.length}× for ${who}`, metric: { count: list.length }, evidence: top(list) }, list);
  }
  const hookErr = sessions.flatMap((s) => s.hookErrors);
  if (hookErr.length) add({ id: 'hook-errors', kind: 'hook-error', component: 'hooks', action: 'check', summary: `${hookErr.length} hook errors (any hook, not only this plugin's)`, metric: { count: hookErr.length }, evidence: top(hookErr) }, hookErr);

  // Re-spawns of one type in a session (fix rounds, retries).
  for (const s of sessions) for (const [t, list] of group(s.spawns, (x) => x.type)) if (list.length >= 4) add({ id: `respawn-${short(t, P)}-${s.id.slice(0, 8)}`, kind: 'respawn', component: `agents/${short(t, P)}`, action: 'brief|qa-loop', summary: `${short(t, P)} spawned ${list.length}× directly in one session`, metric: { count: list.length }, evidence: top(list) }, list);

  // The orchestrator doing a specialist's work; agents from outside the team.
  const edits = sessions.flatMap((s) => s.leadEdits);
  if (edits.length >= 3) add({ id: 'orchestrator-edits', kind: 'orchestrator-work', component: 'agents/team-orchestrator', action: 'edit|add-agent', summary: `the main session edited ${edits.length} non-.team files itself in plugin sessions (${[...new Set(edits.map((e) => e.file))].slice(0, 4).join(', ')})`, metric: { count: edits.length }, evidence: top(edits) }, edits);
  for (const [t, list] of group(sessions.flatMap((s) => s.otherAgents), (x) => x.type)) if (list.length >= 2) add({ id: `other-agent-${t}`, kind: 'roster-gap', component: 'agents', action: 'add-agent|edit-orchestrator', summary: `${t} (not a team agent) spawned ${list.length}× in plugin sessions`, metric: { count: list.length }, evidence: top(list) }, list);

  // Skipped steps: plugin sessions that changed code without a test run or without a review.
  const changed = sessions.filter((s) => s.codeChanged);
  const skipped = changed.filter((s) => !s.tested || !s.reviewed);
  if (changed.length && pct(skipped.length, changed.length) > 30) add({ id: 'skipped-steps', kind: 'skipped-step', component: 'skills/run-kit|commands', action: 'edit', summary: `${skipped.length}/${changed.length} code-changing plugin sessions without tests (${skipped.filter((s) => !s.tested).length}) or review (${skipped.filter((s) => !s.reviewed).length})`, metric: { count: skipped.length, of: changed.length }, evidence: top(skipped.map((s) => ({ ref: s.ref, ts: s.start, snippet: `tested ${s.tested} · reviewed ${s.reviewed}` }))) });

  // Repeated shell commands (candidate hook or tool).
  for (const [k, list] of [...group(sessions.flatMap((s) => s.bash), (b) => b.key)].sort((x, y) => y[1].length - x[1].length).slice(0, 6)) {
    const ss = new Set(list.map((b) => sessionOf(b.ref)));
    if (list.length >= 5 && ss.size >= 2) add({ id: `bash-${k.replace(/\W+/g, '-')}`, kind: 'repeated-command', component: 'hooks|tools|skills', action: 'add-tool|add-hook', summary: `\`${k}\` run ${list.length}× in ${ss.size} sessions by ${[...new Set(list.map((b) => short(b.who, P)))].slice(0, 4).join(', ')}`, metric: { count: list.length }, evidence: top(list) }, list);
  }

  // Interrupts, compactions, API errors, plugin versions.
  const intr = sessions.flatMap((s) => s.interrupts);
  if (intr.length >= 2) add({ id: 'interrupts', kind: 'friction', component: 'commands|agents/team-orchestrator', action: 'review', summary: `user interrupted ${intr.length}× in plugin sessions`, metric: { count: intr.length }, evidence: top(intr) }, intr);
  const comp = sessions.flatMap((s) => s.compactions);
  if (comp.length) add({ id: 'compactions', kind: 'context', component: 'agents/team-orchestrator|skills/run-kit', action: 'shrink-context', summary: `${comp.length} compactions in ${sessions.filter((s) => s.compactions.length).length} plugin sessions`, metric: { count: comp.length }, evidence: top(comp) }, comp);
  const api = sessions.flatMap((s) => s.apiErrors);
  if (api.length) add({ id: 'api-errors', kind: 'environment', component: '-', action: 'none', summary: `${api.length} API errors (limits, network): not a plugin defect`, metric: { count: api.length }, evidence: top(api) }, api);
  const released = (s) => s.pluginVersions.filter((v) => v !== 'dev');
  const old = sessions.filter((s) => released(s).length && inv.version && !released(s).includes(inv.version));
  if (old.length) add({ id: 'old-versions', kind: 'version', component: 'plugin', action: 'discount-evidence', summary: `${old.length} sessions ran another plugin version (${[...new Set(old.flatMap(released))].join(', ')}); current ${inv.version}`, metric: { count: old.length }, evidence: old.slice(-3).map((s) => ({ ref: s.ref, ts: s.start, snippet: s.pluginVersions.join(', ') })) });
  const devRuns = sessions.filter((s) => s.pluginVersions.includes('dev') && !released(s).length);
  const unknownVer = sessions.filter((s) => !s.pluginVersions.length);

  // Adoption since the plugin's first use in the window, and the follow-up metrics (same command, re-measure later).
  const first = sessions.map((s) => s.start).filter(Boolean).sort()[0] || null;
  const since = first ? prompts.filter((p) => p.ts && p.ts >= first) : [];
  const handoffRuns = agents.filter((a) => inv.agents.includes(short(a.type, P)));
  const adoption = { firstUse: first, prompts: since.length, withTeam: since.filter((p) => p.withTeam).length, sessions: new Set(since.map((p) => p.session)).size, pluginSessions: sessions.length };
  const metrics = {
    promptsWithTeamPct: pct(adoption.withTeam, adoption.prompts),
    correctionsPerAgentRun: handoffRuns.length ? +(corrections.filter((c) => c.actor.startsWith('agent:')).length / handoffRuns.length).toFixed(2) : 0,
    longPrompts: long.length,
    neverUsed: neverUsed.length,
    skippedStepPct: pct(skipped.length, changed.length),
    handoffCompliancePct: pct(handoffRuns.filter((a) => STATUSES.includes(a.status)).length, handoffRuns.length),
    invalidNext: handoffRuns.filter((a) => a.next && !validNext.has(a.next)).length,
    toolErrorsPerRun: handoffRuns.length ? +(handoffRuns.reduce((x, a) => x + a.toolErrors.length, 0) / handoffRuns.length).toFixed(2) : 0,
  };
  const versions = { current: inv.version, dev: devRuns.length, unknown: unknownVer.length, older: old.length };
  return { usage, neverUsed, inventory: inventoryRows.map(({ example, ...r }) => ({ ...r, example: example ? { ref: example.ref, snippet: example.snippet } : null })), health, cost, adoption, metrics, versions, list: out };
}

export function renderDigest(d) {
  const { meta, signals: sg, sessions, inventory: inv } = d;
  const L = [];
  const shown = (n, m) => (m > n ? ` (showing ${n} of ${m}; digest.json has all)` : '');
  L.push(`# Retrospect digest — ${meta.plugin} ${meta.pluginVersion || ''}`, '');
  L.push(`Window: last ${meta.days} days (${meta.from.slice(0, 10)} → ${meta.generated.slice(0, 10)}) · transcripts scanned ${meta.scanned} · work sessions ${meta.workSessions} · plugin sessions ${meta.pluginSessions}`);
  L.push(`Excluded: plugin-repo sessions ${meta.devSessionsExcluded} · probe sessions ${meta.probeSessionsExcluded} (run from a scratchpad, or < ${PROBE_COST} cost-tokens with ≤1 agent run and no command) · copied sessions ${meta.copiesMerged} · duplicate prompts ${meta.duplicatePrompts}`);
  L.push(`Plugin versions: current ${sg.versions.current} · older ${sg.versions.older} sessions · working copy (dev, version unknown) ${sg.versions.dev} · unknown ${sg.versions.unknown}`);
  for (const n of meta.notes) L.push(`Note: ${n}`);
  if (meta.pluginSessions < 10) L.push(`Note: fewer than 10 plugin sessions — every conclusion is low confidence.`);
  L.push('', 'Every count is a keyword heuristic: `node retrospect.mjs --show <ref>` before citing it. Refs are `<project>/<session>.jsonl:L<line>` under ~/.claude/projects. Cost-tokens = input + 1.25×cache write + 0.1×cache read + 5×output.', '');

  L.push('## Follow-up metrics', '', '| Metric | Now |', '|---|---|');
  for (const [k, v] of Object.entries(sg.metrics)) L.push(`| ${k} | ${v} |`);
  L.push('', `Adoption: first use ${sg.adoption.firstUse?.slice(0, 10) || '–'} · ${sg.adoption.withTeam}/${sg.adoption.prompts} prompts in ${sg.adoption.sessions} sessions used the team since then`, '');

  L.push('## Work inventory (all work sessions)', '', '| Type | Prompts | With team | Sessions | Example |', '|---|---|---|---|---|');
  for (const r of sg.inventory) L.push(`| ${r.type} | ${r.prompts} | ${r.withTeam} | ${r.sessions} | ${r.example ? `\`${r.example.ref}\` ${r.example.snippet.slice(0, 80).replace(/\|/g, '/')}` : ''} |`);

  L.push('', `## Sessions${shown(LIST, sessions.length)}`, '', '| Session | Start | Entry | Plugin ver | Commands | Agent runs | Orch. ctx max | Orch. cost-tokens |', '|---|---|---|---|---|---|---|---|');
  for (const s of sessions.slice(-LIST)) L.push(`| ${s.ref} | ${(s.start || '').slice(0, 16)} | ${s.entrypoint || ''} | ${s.pluginVersions.join(' ') || '?'} | ${s.commands.map((c) => c.name).join(' ') || '-'} | ${s.agents.length} | ${s.leadContextMax} | ${s.leadCost} |`);

  L.push('', '## Usage', '');
  for (const [k, m] of Object.entries(sg.usage)) L.push(`- ${k}: ${Object.entries(m).map(([n, c]) => `${n} ${c}`).join(', ') || 'none'}`);
  L.push(`- never used: ${sg.neverUsed.join(', ') || 'none'}`);

  L.push('', '## Sub-agent health (agents this version ships)', '', '| Agent | Runs | done | blocked | needs-input | missing | non-standard | structured/none | invalid Next | tool errors | denials |', '|---|---|---|---|---|---|---|---|---|---|---|');
  for (const h of sg.health) L.push(`| ${h.type} | ${h.runs} | ${h.done} | ${h.blocked} | ${h['needs-input']} | ${h.missing} | ${h['non-standard']} | ${h.structured + h.none} | ${h.invalidNext} | ${h.toolErrors} | ${h.denials} |`);

  L.push('', '## Cost per specialist', '', '| Agent | Calls | Models | Share | Avg cost-tokens | Avg s | Avg tool calls |', '|---|---|---|---|---|---|---|');
  for (const c of sg.cost) L.push(`| ${c.type} | ${c.calls} | ${c.models.join(' ')} | ${c.share}% | ${c.avgCost} | ${c.avgDurationS} | ${c.avgToolCalls} |`);

  L.push('', '## Definitions', '', inv.definitions.map((x) => `${x.file} ${x.words}w`).join(' · '));

  L.push('', `## Signals (${sg.list.length})`, '');
  const order = ['correction', 'work-by-hand', 'repeated-instruction', 'similar-opening', 'long-prompt', 'manual-handoff', 'skipped-step', 'guard', 'handoff', 'denials', 'tool-errors', 'respawn', 'orchestrator-work', 'roster-gap', 'repeated-command', 'cost', 'context', 'friction', 'unused', 'unknown', 'version', 'hook-error', 'environment'];
  for (const x of [...sg.list].sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind))) {
    L.push(`### ${x.id} — ${x.kind}`, `- ${x.summary}`, `- Component: ${x.component} · suggested action: ${x.action} · sessions: ${x.sessions}${x.total > x.evidence.length ? ` · showing ${x.evidence.length} of ${x.total}` : ''}`);
    for (const e of x.evidence) L.push(`  - \`${e.ref}\`${e.ts ? ` @${e.ts.slice(0, 16)}` : ''}${e.snippet ? ` — ${e.snippet.replace(/\|/g, '/')}` : ''}`);
  }
  return L.join('\n') + '\n';
}

// The context of one evidence item: ±radius entries around the line, one summarized line each, redacted.
export function show(ref, { root = join(homedir(), '.claude', 'projects'), radius = 4 } = {}) {
  const m = String(ref).match(/^(.+\.jsonl):L(\d+)$/);
  if (!m) return `not a ref: ${ref} (want <project>/<session>.jsonl:L<n>)`;
  const file = resolve(root, m[1]);
  if (!file.startsWith(resolve(root))) return `outside ${root}: ${ref}`;
  let text; try { text = readFileSync(file, 'utf8').split('\n'); } catch { return `cannot read ${m[1]}`; }
  const at = Number(m[2]);
  const out = [];
  for (let n = Math.max(1, at - radius); n <= Math.min(text.length, at + radius); n++) {
    let o; try { o = JSON.parse(text[n - 1]); } catch { continue; }
    const c = o.message?.content;
    const parts = typeof c === 'string' ? [c] : Array.isArray(c) ? c.map((b) => (b.type === 'tool_use' ? `[${b.name}] ${JSON.stringify(b.input)}` : b.type === 'tool_result' ? `[result${b.is_error ? ' error' : ''}] ${textOf(b.content)}` : b.type === 'thinking' ? '' : b.text || '')) : [o.attachment ? `[${o.attachment.type}] ${JSON.stringify(o.attachment)}` : o.subtype || ''];
    const body = snip(parts.filter(Boolean).join(' · '), 400);
    if (body) out.push(`${n === at ? '▶' : ' '} L${n} ${o.type}${o.timestamp ? ` @${o.timestamp.slice(0, 16)}` : ''}: ${body}`);
  }
  return out.join('\n');
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url).toLowerCase() === resolve(process.argv[1]).toLowerCase();
if (isMain) {
  const o = parseArgs(process.argv.slice(2));
  if (o.show) { console.log(show(o.show, { root: o.root, radius: Number.isFinite(o.radius) ? o.radius : 4 })); process.exit(0); }
  const d = collect(o);
  const out = o.out || join(tmpdir(), `${o.plugin || 'technical-team'}-retrospect`);
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, 'digest.json'), JSON.stringify(d, null, 1));
  writeFileSync(join(out, 'digest.md'), renderDigest(d));
  console.log(`${d.meta.pluginSessions} plugin sessions (${d.meta.scanned} scanned, last ${d.meta.days} days), ${d.signals.list.length} signals → ${join(out, 'digest.md')}`);
}
