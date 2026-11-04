#!/usr/bin/env node
// Creates the .team/ workspace from the plugin templates.
// Never overwrites an existing file, so it can be re-run safely and cannot
// reset ownership headers or content that the owners already wrote.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const project = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const tplDir = path.join(ROOT, 'templates', 'team');
const teamDir = path.join(project, '.team');

const created = [];
const kept = [];
fs.mkdirSync(path.join(teamDir, 'archive'), { recursive: true });

for (const file of fs.readdirSync(tplDir).filter((f) => f.endsWith('.md')).sort()) {
  const dest = path.join(teamDir, file);
  if (fs.existsSync(dest)) { kept.push(file); continue; }
  fs.copyFileSync(path.join(tplDir, file), dest, fs.constants.COPYFILE_EXCL);
  created.push(file);
}

const keep = path.join(teamDir, 'archive', '.gitkeep');
if (!fs.existsSync(keep)) fs.writeFileSync(keep, '');

const agentsDir = path.join(project, '.claude', 'agents');
if (!fs.existsSync(agentsDir)) {
  // Created up front so Claude Code watches it from the next session on;
  // specialists hired later then load without another restart.
  fs.mkdirSync(agentsDir, { recursive: true });
  fs.writeFileSync(path.join(agentsDir, '.gitkeep'), '');
  created.push('../.claude/agents/');
}

const cfgDest = path.join(project, '.claude', 'technical-team.json');
let cfgNote = 'kept existing .claude/technical-team.json';
if (!fs.existsSync(cfgDest)) {
  fs.mkdirSync(path.dirname(cfgDest), { recursive: true });
  fs.copyFileSync(path.join(ROOT, 'templates', 'technical-team.json'), cfgDest, fs.constants.COPYFILE_EXCL);
  cfgNote = 'created .claude/technical-team.json (empty command allowlists = denylist mode)';
}

console.log(JSON.stringify({ project, created, kept, config: cfgNote }, null, 2));
