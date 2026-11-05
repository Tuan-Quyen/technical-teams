#!/usr/bin/env node
// Creates .team/ files from the plugin templates, on demand.
//
//   node team-init.mjs                 -> .team/STATE.md only (what every run needs)
//   node team-init.mjs SPEC PLAN ...   -> just the named files (STATE, SPEC, PLAN, TASKS, OPS_HANDOFF, ROSTER)
//   node team-init.mjs --config        -> also .claude/technical-team.json (only /technical-team:init passes it)
//   node team-init.mjs --all           -> every .team file + .claude/agents/ + config (the old up-front setup)
//
// Never overwrites an existing file, so it can be re-run safely and cannot reset
// ownership headers or content the owners already wrote. archive/ is not created
// here: owners create it when they first archive a section.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const project = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const tplDir = path.join(ROOT, 'templates', 'team');
const teamDir = path.join(project, '.team');

const available = fs.readdirSync(tplDir).filter((f) => f.endsWith('.md')).map((f) => f.slice(0, -3)).sort();
const args = process.argv.slice(2);
const all = args.includes('--all');
const withConfig = all || args.includes('--config');
const named = args.filter((a) => !a.startsWith('--')).map((a) => a.replace(/^\.team[\\/]/, '').replace(/\.md$/i, '').toUpperCase());

const unknown = named.filter((n) => !available.includes(n));
if (unknown.length) {
  console.error(`unknown .team file(s): ${unknown.join(', ')}. Known: ${available.join(', ')}`);
  process.exit(2);
}
const wanted = all ? available : (named.length ? named : ['STATE']);

const created = [];
const kept = [];
fs.mkdirSync(teamDir, { recursive: true });
for (const name of wanted) {
  const dest = path.join(teamDir, name + '.md');
  if (fs.existsSync(dest)) { kept.push(name + '.md'); continue; }
  fs.copyFileSync(path.join(tplDir, name + '.md'), dest, fs.constants.COPYFILE_EXCL);
  created.push(name + '.md');
}

if (all) {
  const agentsDir = path.join(project, '.claude', 'agents');
  if (!fs.existsSync(agentsDir)) {
    fs.mkdirSync(agentsDir, { recursive: true });
    fs.writeFileSync(path.join(agentsDir, '.gitkeep'), '');
    created.push('../.claude/agents/');
  }
}

let cfgNote = 'not requested';
if (withConfig) {
  const cfgDest = path.join(project, '.claude', 'technical-team.json');
  cfgNote = 'kept existing .claude/technical-team.json';
  if (!fs.existsSync(cfgDest)) {
    fs.mkdirSync(path.dirname(cfgDest), { recursive: true });
    fs.copyFileSync(path.join(ROOT, 'templates', 'technical-team.json'), cfgDest, fs.constants.COPYFILE_EXCL);
    cfgNote = 'created .claude/technical-team.json (empty command allowlists = denylist mode)';
  }
}

console.log(JSON.stringify({ project, created, kept, config: cfgNote }, null, 2));
