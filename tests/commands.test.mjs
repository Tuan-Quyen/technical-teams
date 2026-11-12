// Tests for the technical-team plugin in plugins/team/.
// - Consistency: commands, agents, skills, templates and the .team/ layout
//   match each other and the README.
// - Manifests: plugin.json and marketplace.json carry homepage, repository and
//   the MIT license, and the marketplace points at the plugin folder.
// - Validate: `claude plugin validate --strict` on the plugin and the
//   marketplace (skipped when the claude CLI is not installed).
// Run from the repo root: npm test   (or: node --test tests/*.test.mjs)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PLUGIN_DIR = 'plugins/team';
const ROOT = path.join(REPO, PLUGIN_DIR);
const read = (p, base = ROOT) => fs.readFileSync(path.join(base, p), 'utf8').replace(/\r\n/g, '\n');
const json = (p, base = ROOT) => JSON.parse(read(p, base));
const list = (dir) => fs.readdirSync(path.join(ROOT, dir)).filter((f) => f.endsWith('.md')).map((f) => f.slice(0, -3)).sort();
const walk = (dir) => fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? walk(`${dir}/${e.name}`) : e.name.endsWith('.md') ? [`${dir}/${e.name}`] : []);
const frontmatter = (p) => {
  const m = read(p).match(/^---\n([\s\S]*?)\n---/);
  assert.ok(m, `${p} has frontmatter`);
  return m[1];
};

const PIPELINES = ['feature', 'fix', 'infra', 'new', 'release', 'review', 'test'];
const COMMANDS = [...PIPELINES, 'crew', 'run'].sort();
const COLORS = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'cyan'];
const WORKERS = ['architect', 'ba', 'code-reviewer', 'dba', 'debugger', 'designer', 'developer', 'devops', 'pm', 'qa', 'security', 'writer'].map((a) => `team-${a}`);
const AGENTS = [...WORKERS, 'team-lead'].sort();
const SKILLS = ['business-analysis', 'live-preview', 'run-kit', 'test-process'];
const TEMPLATE_DIRS = ['adr', 'core', 'design', 'reports', 'requirements'];
const DOCS = [...walk('commands'), ...walk('agents'), ...walk('skills'), ...walk('templates')];
const REPO_URL = 'https://github.com/Tuan-Quyen/technical-teams';

// The .team/ layout documented in the README; `<slug>` and `NNNN-<…>` are placeholders.
const LAYOUT = [
  /^\.team\/?$/, /^\.team\/STATE\.md$/, /^\.team\/CREW\.md$/, /^\.team\/TASKS\.md$/, /^\.team\/PRODUCT\.md$/, /^\.team\/ARCHITECTURE\.md$/,
  /^\.team\/requirements\/(<slug>\.md)?$/, /^\.team\/system-design\/(<slug>\.md)?$/,
  /^\.team\/frontend-design\/(DESIGN\.md|<slug>\.md)?$/, /^\.team\/adr\/(NNNN-<[a-z-]+>\.md)?$/,
  /^\.team\/reports\/<slug>\/((qa|review|security|debug)\.md)?$/, /^\.team\/docs\/.*$/, /^\.team\/archive\/(<slug>\/)?$/,
];

test('command, agent and skill sets are exactly the documented ones', () => {
  assert.deepEqual(list('commands'), COMMANDS);
  assert.deepEqual(list('agents'), AGENTS);
  assert.deepEqual(fs.readdirSync(path.join(ROOT, 'skills')).sort(), SKILLS);
});

test('every command has a description, an argument-hint and uses $ARGUMENTS', () => {
  for (const c of COMMANDS) {
    const fm = frontmatter(`commands/${c}.md`);
    assert.match(fm, /^description: ".+"$/m, `${c}: description`);
    assert.match(fm, /^argument-hint: ".+"$/m, `${c}: argument-hint`);
    assert.match(read(`commands/${c}.md`), /\$ARGUMENTS/, `${c}: uses $ARGUMENTS`);
  }
});

test('every pipeline runs under the lead, and the lead routes to every pipeline', () => {
  for (const c of COMMANDS) assert.match(read(`commands/${c}.md`), /agents\/team-lead\.md/, `${c}: follows the lead`);
  const lead = read('agents/team-lead.md');
  for (const c of PIPELINES) assert.match(lead, new RegExp(`\\| \`${c}\``), `lead classifies to ${c}`);
});

test('every agent has name = file name, a description and a model', () => {
  for (const a of AGENTS) {
    const fm = frontmatter(`agents/${a}.md`);
    assert.match(fm, new RegExp(`^name: ${a}$`, 'm'), `${a}: name`);
    assert.match(fm, /^description: .+$/m, `${a}: description`);
    assert.match(fm, /^model: (sonnet|opus|haiku|inherit)$/m, `${a}: model`);
  }
});

test('every agent has a color, a Persona (emoji + vibe) and a matching badge in run-kit', () => {
  const kit = read('skills/run-kit/SKILL.md');
  const square = { red: '🟥', orange: '🟧', yellow: '🟨', green: '🟩', blue: '🟦', purple: '🟪', pink: '🩷', cyan: '🩵' };
  for (const a of AGENTS) {
    const color = frontmatter(`agents/${a}.md`).match(/^color: (\w+)$/m)?.[1];
    assert.ok(COLORS.includes(color), `${a}: color is one of ${COLORS.join(', ')}`);
    const p = read(`agents/${a}.md`).match(/^\*\*Persona\*\* — (\S+) · vibe: .+$/m);
    assert.ok(p, `${a}: has a **Persona** — <emoji> · vibe: … line`);
    assert.match(kit, new RegExp(`^\\| \`${a}\` \\|.*\\| ${square[color]} ${p[1]} \\|$`, 'm'), `${a}: run-kit badge matches color + emoji`);
  }
  for (const a of WORKERS) assert.match(read(`agents/${a}.md`), /\.team\/CREW\.md/, `${a}: honours CREW.md`);
  assert.match(read('agents/team-lead.md'), /\.team\/CREW\.md/, 'lead reads CREW.md');
});

test('every specialist lists what it writes and ends with the same Rules + Handoff block', () => {
  const block = (a) => {
    const s = read(`agents/${a}.md`);
    assert.match(s, /\n\*\*Writes\*\*\n/, `${a}: has a Writes list`);
    assert.doesNotMatch(frontmatter(`agents/${a}.md`), /run-kit/, `${a}: does not preload run-kit`);
    const i = s.indexOf('\n## Rules\n');
    assert.ok(i >= 0, `${a}: has a ## Rules section`);
    return s.slice(i);
  };
  const first = block(WORKERS[0]);
  assert.match(first, /### Handoff/, 'block has the handoff');
  for (const a of WORKERS) assert.equal(block(a), first, `${a}: Rules block differs from ${WORKERS[0]}`);
});

test('run-kit covers roster, pipelines, brief, workspace and handoff only', () => {
  const kit = read('skills/run-kit/SKILL.md');
  const sections = [...kit.matchAll(/^## \d+\. (.+)$/gm)].map((m) => m[1]);
  assert.deepEqual(sections, ['Roster', 'Pipeline workflow commands', 'Writing a brief', 'Workspace `.team/`', 'Handoff']);
  for (const a of AGENTS) assert.ok(kit.includes(`| \`${a}\` |`), `roster lists ${a}`);
  for (const c of PIPELINES) assert.ok(kit.includes(`| \`${c}`), `pipelines list ${c}`);
  assert.doesNotMatch(kit, /claude --agent|main session/, 'run-kit does not prescribe how the lead is launched');
  assert.ok(!fs.existsSync(path.join(ROOT, 'skills/run-kit/references')), 'run-kit has no usage guide');
});

test('TASKS.md belongs to pm alone', () => {
  for (const f of DOCS) assert.doesNotMatch(read(f), /Status column|lead \(Status\)/, `${f}: only pm writes TASKS.md`);
  assert.doesNotMatch(read('agents/team-lead.md'), /You write only[^\n]*TASKS/, 'lead does not write TASKS.md');
});

test('every referenced agent, skill and plugin file exists', () => {
  for (const f of DOCS) {
    const s = read(f);
    for (const [, name] of s.matchAll(/technical-team:(team-[a-z-]+)/g)) assert.ok(AGENTS.includes(name), `${f}: missing agent ${name}`);
    for (const [, name] of s.matchAll(/technical-team:([a-z]+-[a-z-]+)`/g)) {
      if (!name.startsWith('team-')) assert.ok(SKILLS.includes(name), `${f}: missing skill ${name}`);
    }
    for (const [, p] of s.matchAll(/\$\{CLAUDE_PLUGIN_ROOT\}\/([A-Za-z0-9_./-]+\.md)/g)) {
      assert.ok(fs.existsSync(path.join(ROOT, p)), `${f}: missing ${p}`);
    }
  }
});

test('templates are grouped by type, and every template is used', () => {
  assert.deepEqual(fs.readdirSync(path.join(ROOT, 'templates')).sort(), TEMPLATE_DIRS, 'only type folders at the top');
  const have = walk('templates').map((p) => p.slice('templates/'.length)).sort();
  const named = new Set();
  for (const f of [...walk('agents'), ...walk('commands')]) {
    for (const [, t] of read(f).matchAll(/\}\/templates\/([A-Za-z/-]+\.md)/g)) named.add(t);
  }
  assert.deepEqual([...named].sort(), have);
});

test('every .team/ path fits the documented layout', () => {
  for (const f of DOCS) {
    for (const [p] of read(f).matchAll(/\.team\/[A-Za-z0-9<>_*.\/-]*/g)) {
      const clean = p.replace(/[.,]+$/, '').replace(/\*\*$/, '');
      assert.ok(LAYOUT.some((re) => re.test(clean)), `${f}: ${clean} is not in the layout`);
    }
  }
});

test('README lists every command, and only those', () => {
  const cmds = [...read('README.md', REPO).matchAll(/^\| `\/technical-team:([a-z-]+)` \|/gm)].map((m) => m[1]);
  assert.deepEqual([...new Set(cmds)].sort(), COMMANDS);
});

test('nothing points at removed machinery', () => {
  const gone = [/team-hr/, /agent-kit/, /W-NNN/, /OPS_HANDOFF/, /\bG[1-4]\b/, /\/technical-team:docs\b/, /Phiếu bàn giao/, /CLAUDE_PLUGIN_ROOT\}\/(hooks|config|scripts)/];
  for (const f of DOCS) for (const re of gone) assert.doesNotMatch(read(f), re, `${f} still mentions ${re}`);
});

test('plugin.json and marketplace.json carry homepage, repository and the MIT license', () => {
  const plugin = json('.claude-plugin/plugin.json');
  assert.equal(plugin.name, 'technical-team');
  assert.equal(plugin.license, 'MIT');
  assert.equal(plugin.repository, REPO_URL);
  assert.match(plugin.homepage, new RegExp(`^${REPO_URL}`));
  assert.match(read('LICENSE', REPO), /^MIT License/, 'repo ships the license text');

  const market = json('.claude-plugin/marketplace.json', REPO);
  const entry = market.plugins.find((p) => p.name === plugin.name);
  assert.ok(entry, 'marketplace lists the plugin');
  assert.equal(entry.source, `./${PLUGIN_DIR}`);
  assert.equal(entry.license, 'MIT');
  assert.equal(entry.repository, REPO_URL);
  assert.equal(entry.homepage, plugin.homepage);
});

const claude = spawnSync('claude', ['--version'], { shell: true, encoding: 'utf8' });
const hasClaude = claude.status === 0;

for (const target of [PLUGIN_DIR, '.claude-plugin/marketplace.json']) {
  test(`claude plugin validate --strict ${target}`, { skip: !hasClaude && 'claude CLI not installed' }, () => {
    const r = spawnSync('claude', ['plugin', 'validate', target, '--strict'], { cwd: REPO, shell: true, encoding: 'utf8', timeout: 120000 });
    assert.equal(r.status, 0, `${r.stdout}\n${r.stderr}`);
  });
}
