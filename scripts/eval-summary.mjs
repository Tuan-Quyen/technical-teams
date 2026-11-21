#!/usr/bin/env node
// Summarise eval-run.mjs result files per case (pass rate, mean cost/time/turns, .team/ words).
// Usage: node scripts/eval-summary.mjs <dir-or-files...>   e.g. plugins/team/evals/baseline
//        node scripts/eval-summary.mjs --compare <baseline-dir> <candidate-dir>
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const files = (p) => (statSync(p).isDirectory()
  ? readdirSync(p).filter((f) => f.startsWith('cap-') && f.endsWith('.json')).map((f) => join(p, f)) : [p]);
const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);

function collect(paths) {
  const byCase = {};
  for (const f of paths.flatMap(files)) {
    for (const c of JSON.parse(readFileSync(f, 'utf8')).cases) (byCase[c.name] ||= []).push(...c.runs);
  }
  return Object.fromEntries(Object.entries(byCase).map(([name, runs]) => [name, {
    runs: runs.length,
    pass: runs.filter((r) => r.pass).length,
    cost: mean(runs.map((r) => r.metrics.costUsd || 0)),
    seconds: mean(runs.map((r) => r.metrics.seconds || 0)),
    turns: mean(runs.map((r) => r.metrics.turns || 0)),
    // Token totals from every transcript (main + subagents + workflow agents); reported cost can miss subagents.
    outTok: mean(runs.map((r) => Object.values(r.metrics.transcriptUsage?.byModel || {}).reduce((n, u) => n + u.output, 0))),
    freshInTok: mean(runs.map((r) => Object.values(r.metrics.transcriptUsage?.byModel || {}).reduce((n, u) => n + u.input + u.cacheWrite, 0))),
    teamWords: mean(runs.map((r) => (r.metrics.teamBreakdown ? Object.entries(r.metrics.teamBreakdown).filter(([f]) => f !== 'CREW.md' && !f.startsWith('archive/')).reduce((n, [, w]) => n + w, 0) : r.metrics.teamWords || 0))),
    teamMaxLine: Math.max(...runs.map((r) => r.metrics.teamMaxLine || 0)),
  }]));
}

const k = (x) => (x ? `${(x / 1000).toFixed(1)}k` : '–');
const row = (n, s) => `| ${n} | ${s.pass}/${s.runs} | ${k(s.outTok)} | ${k(s.freshInTok)} | $${s.cost.toFixed(2)} | ${Math.round(s.seconds)} s | ${Math.round(s.turns)} | ${Math.round(s.teamWords)} | ${s.teamMaxLine} |`;
const head = '| Case | Pass | Out tok | Fresh in tok | Cost (reported) | Time | Turns | .team words | Max line |\n|---|---|---|---|---|---|---|---|---|';
const args = process.argv.slice(2);
if (args[0] === '--compare') {
  const a = collect([args[1]]); const b = collect([args[2]]);
  const pct = (x, y) => (x ? `${(((y - x) / x) * 100).toFixed(0)}%` : 'n/a');
  console.log('| Case | Pass A→B | Out tok Δ | Fresh in Δ | Cost Δ (reported) | Time Δ | .team words Δ |\n|---|---|---|---|---|---|---|');
  for (const n of Object.keys(a)) {
    if (!b[n]) continue;
    console.log(`| ${n} | ${a[n].pass}/${a[n].runs} → ${b[n].pass}/${b[n].runs} | ${pct(a[n].outTok, b[n].outTok)} | ${pct(a[n].freshInTok, b[n].freshInTok)} | ${pct(a[n].cost, b[n].cost)} | ${pct(a[n].seconds, b[n].seconds)} | ${pct(a[n].teamWords, b[n].teamWords)} |`);
  }
} else {
  console.log(head);
  for (const [n, s] of Object.entries(collect(args.length ? args : ['plugins/team/evals/baseline']))) console.log(row(n, s));
}
