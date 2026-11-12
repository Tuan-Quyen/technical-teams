#!/usr/bin/env node
// Creates .team/ files from the plugin templates, on demand.
//
//   node team-init.mjs                      -> .team/STATE.md only (what every run needs)
//   node team-init.mjs TASKS PRODUCT ...    -> the named singletons (STATE, TASKS, PRODUCT, ARCHITECTURE, ROSTER)
//   node team-init.mjs <type> <slug>        -> one per-item file; slug = W-NNN-<kebab-title>
//        requirements      -> .team/requirements/<slug>.md
//        system-design     -> .team/system-design/<slug>.md
//        frontend-design   -> .team/frontend-design/<slug>.md   (slug `_system` -> the design system)
//        qa                -> .team/qa/<slug>.md
//        review | security | debug -> .team/reports/<slug>/<type>.md
//        adr               -> .team/adr/<NNNN-kebab-decision>.md
//   node team-init.mjs --config             -> also .claude/technical-team.json (only /technical-team:init passes it)
//   node team-init.mjs --all                -> every singleton + .claude/agents/ + config
//
// Never overwrites an existing file, so it can be re-run safely and cannot reset
// content the owners already wrote. Nothing is created ahead of need: per-item
// files only when asked by type and slug, archive/ only when an item is closed.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const project = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const tplDir = path.join(ROOT, 'templates', 'team');
const teamDir = path.join(project, '.team');

export const SINGLETONS = ['ARCHITECTURE', 'PRODUCT', 'ROSTER', 'STATE', 'TASKS'];
// type -> [template (under templates/), destination under .team/ for a slug]
export const ITEM_TYPES = {
  'requirements': ['team/item/requirements.md', (s) => `requirements/${s}.md`],
  'system-design': ['team/item/system-design.md', (s) => `system-design/${s}.md`],
  'frontend-design': ['team/item/frontend-design.md', (s) => `frontend-design/${s}.md`],
  'qa': ['team/item/qa.md', (s) => `qa/${s}.md`],
  'review': ['team/item/review.md', (s) => `reports/${s}/review.md`],
  'security': ['team/item/security.md', (s) => `reports/${s}/security.md`],
  'debug': ['team/item/debug.md', (s) => `reports/${s}/debug.md`],
};
export const SLUG_RE = /^W-\d{3,}-[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ADR_RE = /^\d{4}-[a-z0-9]+(?:-[a-z0-9]+)*$/;

function fail(msg) {
  console.error(msg);
  process.exit(2);
}

const args = process.argv.slice(2);
const all = args.includes('--all');
const withConfig = all || args.includes('--config');
const positional = args.filter((a) => !a.startsWith('--'));

// Each job: { tpl: absolute template path, dest: path relative to .team/, fill: (text) => text }
const jobs = [];
const singleton = (name) => jobs.push({ tpl: path.join(tplDir, name + '.md'), dest: name + '.md' });

const first = positional[0];
if (first && (first in ITEM_TYPES || first === 'adr')) {
  const slug = (positional[1] || '').replace(/\.md$/i, '');
  if (positional.length !== 2) fail(`usage: team-init.mjs ${first} <slug>   (one type and one slug per call)`);
  if (first === 'adr') {
    if (!ADR_RE.test(slug)) fail(`bad ADR name "${slug}": expected NNNN-<kebab-decision>, e.g. 0007-use-websocket`);
    const n = slug.slice(0, 4);
    jobs.push({ tpl: path.join(ROOT, 'templates', 'adr.md'), dest: `adr/${slug}.md`, fill: (t) => t.replace('# NNNN.', `# ${n}.`) });
  } else if (first === 'frontend-design' && slug === '_system') {
    jobs.push({ tpl: path.join(tplDir, 'frontend-design-system.md'), dest: 'frontend-design/_system.md' });
  } else {
    if (!SLUG_RE.test(slug)) fail(`bad slug "${slug}": expected W-NNN-<kebab-title>, e.g. W-012-offline-sync`);
    const id = slug.match(/^W-\d+/)[0];
    const [tpl, dest] = ITEM_TYPES[first];
    jobs.push({
      tpl: path.join(ROOT, 'templates', tpl),
      dest: dest(slug),
      fill: (t) => t.replaceAll('W-000-<kebab-title>', slug).replaceAll('W-000', id),
    });
  }
} else {
  const named = positional.map((a) => a.replace(/^\.team[\\/]/, '').replace(/\.md$/i, '').toUpperCase());
  const unknown = named.filter((n) => !SINGLETONS.includes(n));
  if (unknown.length) {
    fail(`unknown .team file(s): ${unknown.join(', ')}. Singletons: ${SINGLETONS.join(', ')}. Per-item files: team-init.mjs <${Object.keys(ITEM_TYPES).join(' | ')} | adr> <slug>`);
  }
  for (const name of all ? SINGLETONS : (named.length ? named : ['STATE'])) singleton(name);
}

const created = [];
const kept = [];
for (const job of jobs) {
  const dest = path.join(teamDir, job.dest);
  if (fs.existsSync(dest)) { kept.push(job.dest); continue; }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const text = fs.readFileSync(job.tpl, 'utf8');
  fs.writeFileSync(dest, job.fill ? job.fill(text) : text, { flag: 'wx' }); // wx: fail rather than overwrite
  created.push(job.dest);
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
    cfgNote = 'created .claude/technical-team.json (per-role skills, external agents)';
  }
}

console.log(JSON.stringify({ project, created, kept, config: cfgNote }, null, 2));
