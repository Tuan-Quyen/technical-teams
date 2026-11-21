#!/usr/bin/env node
// Static metrics for the redesign baseline (docs/redesign/REDESIGN.md §7).
// Usage: node scripts/measure.mjs [--team <path-to-.team>] [--json]
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, extname } from 'node:path';

const root = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const plugin = join(root, 'plugins', 'team');
const args = process.argv.slice(2);
const teamDir = args.includes('--team') ? args[args.indexOf('--team') + 1] : null;
const asJson = args.includes('--json');

const walk = (dir) => readdirSync(dir).flatMap((n) => {
  const p = join(dir, n);
  if (n === 'node_modules' || n === 'results') return [];
  return statSync(p).isDirectory() ? walk(p) : [p];
});
const words = (s) => (s.match(/\S+/g) || []).length;
const read = (p) => readFileSync(p, 'utf8');

function pluginMetrics() {
  const files = walk(plugin);
  const md = files.filter((p) => extname(p) === '.md');
  const js = files.filter((p) => ['.js', '.mjs'].includes(extname(p)));
  const byDir = {};
  for (const p of md) {
    const d = relative(plugin, p).split(/[\\/]/)[0];
    byDir[d] = (byDir[d] || 0) + words(read(p));
  }
  const agents = md.filter((p) => p.includes(join('agents', '')))
    .map((p) => ({ name: relative(plugin, p), words: words(read(p)) }))
    .sort((a, b) => b.words - a.words);
  // Duplicated "## Rules" block across agents
  const rules = agents.map((a) => {
    const s = read(join(plugin, a.name));
    const i = s.indexOf('\n## Rules');
    return i < 0 ? '' : s.slice(i);
  }).filter(Boolean);
  // words repeated because the same block is copied into several agents
  const counts = rules.reduce((m, r) => m.set(r, (m.get(r) || 0) + 1), new Map());
  const dupRules = [...counts].reduce((n, [r, k]) => n + (k - 1) * words(r), 0);
  // Context the lead loads for one `feature` run (lead + run-kit + command + its references)
  // A run takes one path: through the Workflow tool (workflow.md) or inline (qa-lines.md); report the larger.
  const ctx = (refs) => ['agents/team-lead.md', 'skills/run-kit/SKILL.md', 'commands/feature.md',
    'skills/run-kit/references/qa-loop.md', 'skills/run-kit/references/workspace.md', ...refs]
    .map((r) => join(plugin, r)).filter(existsSync).reduce((n, p) => n + words(read(p)), 0);
  const leadCtx = Math.max(ctx(['skills/run-kit/references/workflow.md']), ctx(['skills/run-kit/references/qa-lines.md']));
  return {
    proseWords: md.reduce((n, p) => n + words(read(p)), 0),
    jsLines: js.reduce((n, p) => n + read(p).split('\n').length, 0),
    proseByDir: byDir,
    agentWordsMax: agents[0],
    agentWordsMin: agents[agents.length - 1],
    duplicatedRulesWords: dupRules,
    leadFeatureContextWords: leadCtx,
  };
}

function teamMetrics(dir) {
  const files = walk(dir).filter((p) => extname(p) === '.md');
  const live = files.filter((p) => !relative(dir, p).startsWith('archive'));
  const stat = (p) => {
    const s = read(p);
    const lines = s.split('\n');
    return {
      file: relative(dir, p).replace(/\\/g, '/'),
      words: words(s),
      maxLine: Math.max(...lines.map((l) => l.length)),
      revisionHeadings: lines.filter((l) => /^#+\s.*\b(Revision|Revised|Round \d)/i.test(l)).length,
    };
  };
  const all = live.map(stat).sort((a, b) => b.words - a.words);
  return {
    liveWords: all.reduce((n, f) => n + f.words, 0),
    archiveWords: files.filter((p) => !live.includes(p)).reduce((n, p) => n + words(read(p)), 0),
    filesOver4k: all.filter((f) => f.words > 4000).length,
    linesOver300: all.filter((f) => f.maxLine > 300).length,
    revisionHeadings: all.reduce((n, f) => n + f.revisionHeadings, 0),
    top5: all.slice(0, 5),
  };
}

const out = { plugin: pluginMetrics(), ...(teamDir ? { team: teamMetrics(teamDir) } : {}) };
console.log(asJson ? JSON.stringify(out, null, 2) : out);
