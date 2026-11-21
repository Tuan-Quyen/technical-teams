#!/usr/bin/env node
// Cross-platform capability eval runner (docs/redesign/REDESIGN.md §7).
// Runs `claude -p --plugin-dir <plugin>` on a fresh copy of a fixture repo, then grades
// deterministically in node. Works wherever `claude`, `node` and `git` run (Windows/macOS/Linux).
//
// Usage: node scripts/eval-run.mjs [--plugin plugins/team] [--case <glob>] [--runs 1]
//                                  [--out <file.json>] [--keep]
// Safety: Bash runs on the host (no OS sandbox). Only run cases you authored; each case
// whitelists Bash patterns, and every other tool call is denied in print mode.
import { spawn, execFileSync } from 'node:child_process';
import { mkdirSync, cpSync, mkdtempSync, readFileSync, writeFileSync, readdirSync, existsSync, rmSync, statSync } from 'node:fs';
import { tmpdir, homedir } from 'node:os';
import { join, resolve, extname, relative, dirname } from 'node:path';

const repo = resolve(new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const opt = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i < 0 ? d : process.argv[i + 1]; };
const flag = (k) => process.argv.includes(`--${k}`);
const pluginDir = resolve(opt('plugin', join(repo, 'plugins', 'team')));
const evalsDir = join(repo, 'plugins', 'team', 'evals');
const caseGlob = new RegExp(`^${(opt('case', '*')).replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`);
const runs = Number(opt('runs', 1));
const outFile = opt('out', null);
// --disallow Workflow,TaskStop → extra tools denied for every case (e.g. to compare inline vs workflow path)
const extraDisallowed = (opt('disallow', '') || '').split(',').filter(Boolean);

const git = (cwd, ...a) => execFileSync('git', a, { cwd, encoding: 'utf8' }).trim();
const words = (s) => (s.match(/\S+/g) || []).length;
const walk = (d) => (existsSync(d) ? readdirSync(d).flatMap((n) => {
  const p = join(d, n); return statSync(p).isDirectory() ? walk(p) : [p];
}) : []);

function loadCases() {
  const dir = join(evalsDir, 'cap');
  return readdirSync(dir).map((n) => ({ dir: join(dir, n), ...JSON.parse(readFileSync(join(dir, n, 'case.json'), 'utf8')) }))
    .filter((c) => caseGlob.test(c.name));
}

function prepare(c) {
  const work = mkdtempSync(join(tmpdir(), 'tt-eval-'));
  cpSync(join(evalsDir, 'fixtures', c.fixture), work, { recursive: true });
  git(work, 'init', '-q');
  git(work, '-c', 'user.email=eval@local', '-c', 'user.name=eval', 'add', '-A');
  git(work, '-c', 'user.email=eval@local', '-c', 'user.name=eval', 'commit', '-qm', 'fixture');
  for (const s of c.setup || []) {
    const p = join(work, s.write);
    const before = readFileSync(p, 'utf8');
    const after = before.replace(s.replace[0], s.replace[1]);
    if (after === before) throw new Error(`setup replace did not match in ${s.write}`);
    writeFileSync(p, after);
  }
  const snapshot = Object.fromEntries((c.setup || []).map((s) => [s.write, readFileSync(join(work, s.write), 'utf8')]));
  return { work, head: git(work, 'rev-parse', 'HEAD'), snapshot };
}

function runClaude(c, work) {
  const args = ['-p', c.prompt, '--plugin-dir', pluginDir, '--output-format', 'stream-json', '--verbose',
    // Sessions persist so subagent/workflow transcripts exist for token accounting (usageFromTranscripts).
    '--permission-mode', 'default',
    '--max-budget-usd', String(c.maxBudgetUsd ?? 5), '--allowedTools', ...c.allowedTools,
    ...((c.disallowedTools || extraDisallowed).length ? ['--disallowedTools', ...(c.disallowedTools || []), ...extraDisallowed] : [])];
  return new Promise((done) => {
    const t0 = Date.now();
    const child = spawn('claude', args, { cwd: work, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = ''; let err = '';
    child.stdout.on('data', (d) => { out += d; });
    child.stderr.on('data', (d) => { err += d; });
    const timer = setTimeout(() => child.kill(), (c.timeoutSec ?? 1200) * 1000);
    child.on('close', (code) => {
      clearTimeout(timer);
      const events = out.split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
      done({ code, events, stderr: err.slice(-2000), seconds: Math.round((Date.now() - t0) / 1000) });
    });
  });
}

// Every tool call in the run, subagents included (stream-json emits their messages too).
const toolCalls = (events) => events.flatMap((e) => (e.type === 'assistant' ? e.message?.content || [] : []))
  .filter((b) => b.type === 'tool_use').map((b) => ({ name: b.name, input: JSON.stringify(b.input) }));
const allText = (events) => events.flatMap((e) => (e.type === 'assistant' ? e.message?.content || [] : []))
  .map((b) => (b.type === 'text' ? b.text : JSON.stringify(b.input || ''))).join('\n')
  + events.filter((e) => e.type === 'result').map((e) => e.result || '').join('\n');

function grade(c, ctx, res) {
  const calls = toolCalls(res.events);
  const spawns = calls.filter((t) => t.name === 'Agent' || t.name === 'Task');
  return (c.checks || []).map((k) => {
    let pass = false; let note = '';
    try {
      if (k.type === 'hidden_test') {
        cpSync(join(c.dir, k.file), join(ctx.work, k.dest));
        try { execFileSync(process.execPath, k.cmd.split(' ').slice(1), { cwd: ctx.work, stdio: 'pipe' }); pass = true; } catch (e) { note = String(e.stdout || e.message).slice(-300); }
      } else if (k.type === 'no_tool') {
        const hit = calls.find((t) => new RegExp(k.pattern).test(t.input)); pass = !hit; note = hit ? hit.input.slice(0, 160) : '';
      } else if (k.type === 'tool') {
        pass = calls.some((t) => new RegExp(k.pattern).test(t.input));
      } else if (k.type === 'order') {
        const i = spawns.findIndex((t) => t.input.includes(k.first)); const j = spawns.findIndex((t) => t.input.includes(k.then));
        pass = i >= 0 && (j < 0 || i < j); note = `first@${i} then@${j}`;
      } else if (k.type === 'head_unchanged') {
        pass = git(ctx.work, 'rev-parse', 'HEAD') === ctx.head;
      } else if (k.type === 'file_equals_setup') {
        pass = readFileSync(join(ctx.work, k.file), 'utf8') === ctx.snapshot[k.file];
      } else if (k.type === 'final_regex') {
        const fin = res.events.filter((e) => e.type === 'result').map((e) => e.result || '').join('\n');
        pass = new RegExp(k.pattern, k.flags || '').test(fin); note = fin.slice(-200);
      } else if (k.type === 'cmd') {
        try { execFileSync(process.execPath, k.cmd.split(' ').slice(1), { cwd: ctx.work, stdio: 'pipe' }); pass = true; } catch (e) { note = String(e.stdout || e.message).slice(-300); }
      } else if (k.type === 'file_contains') {
        pass = new RegExp(k.pattern, k.flags || '').test(readFileSync(join(ctx.work, k.file), 'utf8'));
      } else if (k.type === 'regex_any') {
        const team = walk(join(ctx.work, '.team')).map((p) => readFileSync(p, 'utf8')).join('\n');
        pass = new RegExp(k.pattern, k.flags || '').test(allText(res.events) + team);
      }
    } catch (e) { note = e.message; }
    return { name: k.name, pass, note };
  });
}

// `total_cost_usd` can leave out subagents (seen: runs with no sonnet usage at all), so sum
// usage from every transcript of the session — main, subagents, workflow agents — deduped by message id.
function usageFromTranscripts(sessionId, work) {
  const projects = join(homedir(), '.claude', 'projects');
  if (!sessionId || !existsSync(projects)) return null;
  const dir = readdirSync(projects).map((d) => join(projects, d)).find((d) => existsSync(join(d, `${sessionId}.jsonl`)));
  if (!dir) return null;
  const files = [join(dir, `${sessionId}.jsonl`), ...walk(join(dir, sessionId)).filter((p) => p.endsWith('.jsonl'))];
  const seen = new Set(); const byModel = {};
  for (const f of files) {
    for (const line of readFileSync(f, 'utf8').split('\n')) {
      let e; try { e = JSON.parse(line); } catch { continue; }
      const m = e.message; if (e.type !== 'assistant' || !m?.usage) continue;
      const id = m.id || `${f}:${line.length}:${seen.size}`; if (seen.has(id)) continue; seen.add(id);
      const u = (byModel[m.model || '?'] ||= { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, messages: 0 });
      u.input += m.usage.input_tokens || 0; u.output += m.usage.output_tokens || 0;
      u.cacheRead += m.usage.cache_read_input_tokens || 0; u.cacheWrite += m.usage.cache_creation_input_tokens || 0; u.messages++;
    }
  }
  // Remove this run's transcripts (the temp cwd is unique to the run).
  if (/tt-eval-/.test(dir) && !flag('keep')) rmSync(dir, { recursive: true, force: true });
  return { files: files.length, byModel };
}

function metrics(ctx, res) {
  const result = res.events.find((e) => e.type === 'result') || {};
  const spawns = toolCalls(res.events).filter((t) => t.name === 'Agent' || t.name === 'Task')
    .map((t) => (t.input.match(/"subagent_type":"([^"]+)"/) || [])[1] || '?');
  // .md counts whitespace words; item JSON counts the words of its string values (its keys and syntax are not prose).
  const teamDir = join(ctx.work, '.team');
  const teamFiles = walk(teamDir).filter((p) => ['.md', '.json'].includes(extname(p)));
  const strings = (v) => (typeof v === 'string' ? [v] : v && typeof v === 'object' ? Object.values(v).flatMap(strings) : []);
  const jsonWords = (s) => { try { return strings(JSON.parse(s)).reduce((n, x) => n + words(x), 0); } catch { return words(s); } };
  const teamText = teamFiles.map((p) => readFileSync(p, 'utf8'));
  const teamBreakdown = Object.fromEntries(teamFiles.map((p, i) => [relative(teamDir, p).replace(/\\/g, '/'), extname(p) === '.json' ? jsonWords(teamText[i]) : words(teamText[i])]));
  const u = result.usage || {};
  return {
    costUsd: result.total_cost_usd ?? null,
    turns: result.num_turns ?? null,
    seconds: res.seconds,
    tokens: { input: u.input_tokens, output: u.output_tokens, cacheRead: u.cache_read_input_tokens, cacheWrite: u.cache_creation_input_tokens },
    spawns,
    tools: toolCalls(res.events).reduce((m, t) => ({ ...m, [t.name]: (m[t.name] || 0) + 1 }), {}),
    teamFiles: teamFiles.length,
    teamWords: Object.entries(teamBreakdown).filter(([f]) => f !== 'CREW.md' && !f.startsWith('archive/')).reduce((n, [, w]) => n + w, 0), // live .team/ only: no CREW.md (config), no archive/
    teamBreakdown,
    teamMaxLine: Math.max(0, ...teamText.filter((_, i) => extname(teamFiles[i]) === '.md').flatMap((s) => s.split('\n').map((l) => l.length))),
    modelUsage: result.modelUsage ?? null,
    transcriptUsage: usageFromTranscripts(result.session_id, ctx.work),
    final: (result.result || '').slice(0, 2000),
    exitCode: res.code,
    stopReason: result.subtype ?? null,
  };
}

const report = { plugin: relative(repo, pluginDir) || pluginDir, startedAt: new Date().toISOString(), cases: [] };
for (const c of loadCases()) {
  const entry = { name: c.name, runs: [] };
  for (let r = 1; r <= runs; r++) {
    const ctx = prepare(c);
    process.stderr.write(`▶ ${c.name} run ${r}/${runs} in ${ctx.work}\n`);
    const res = await runClaude(c, ctx.work);
    const checks = grade(c, ctx, res);
    const m = metrics(ctx, res);
    entry.runs.push({ pass: checks.every((k) => k.pass), checks, metrics: m, work: flag('keep') ? ctx.work : undefined });
    process.stderr.write(`  ${checks.map((k) => `${k.pass ? '✓' : '✗'} ${k.name}`).join('  ')}  $${m.costUsd?.toFixed(2)} ${m.seconds}s spawns=${m.spawns.join(',')}\n`);
    if (!flag('keep')) rmSync(ctx.work, { recursive: true, force: true });
  }
  entry.passRate = entry.runs.filter((x) => x.pass).length / entry.runs.length;
  report.cases.push(entry);
}
const json = JSON.stringify(report, null, 2);
if (outFile) { mkdirSync(dirname(resolve(outFile)), { recursive: true }); writeFileSync(outFile, json); } else console.log(json);
