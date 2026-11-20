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
const SKILLS = ['business-analysis', 'run-kit', 'test-process'];
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
    const desc = fm.match(/^description: (.+)$/m)[1];
    assert.ok(desc.startsWith('"') || !/: /.test(desc), `${a}: a description with ": " must be quoted, or the YAML frontmatter breaks`);
    assert.match(fm, /^model: (sonnet|opus|haiku|inherit)$/m, `${a}: model`);
  }
});

test('no agent has a tools allowlist, so project MCP tools and skills reach it', () => {
  for (const a of AGENTS) {
    const fm = frontmatter(`agents/${a}.md`);
    assert.doesNotMatch(fm, /^tools:/m, `${a}: use disallowedTools, not a tools allowlist`);
    const deny = fm.match(/^disallowedTools: (.+)$/m)?.[1].split(/,\s*/) ?? [];
    assert.ok(!deny.some((t) => t.startsWith('mcp__') || t === 'Skill'), `${a}: does not block MCP tools or skills`);
  }
  assert.match(read('agents/team-lead.md'), /mcp__/, 'lead names MCP tools in briefs');
});

test('the lead finds project agents and briefs them with the team rules', () => {
  const lead = read('agents/team-lead.md');
  assert.match(lead, /Glob `\.claude\/agents\/\*\.md`/, 'lead lists project agents at start');
  assert.match(lead, /### Project specialists/, 'lead has a Project specialists section');
  for (const mode of ['replace', 'consult']) assert.match(lead, new RegExp(`\\*\\*${mode}\\*\\*`), `lead defines mode ${mode}`);
  const kit = read('skills/run-kit/SKILL.md');
  assert.match(kit, /\*\*Project specialists\*\*/, 'run-kit roster mentions project specialists');
  assert.match(kit, /\*\*Briefing a project specialist\*\*/, 'run-kit has the specialist brief');
});

test('every agent has a color; persona defaults live only in the CREW template', () => {
  const crew = read('templates/core/CREW.md');
  for (const a of AGENTS) {
    const color = frontmatter(`agents/${a}.md`).match(/^color: (\w+)$/m)?.[1];
    assert.ok(COLORS.includes(color), `${a}: color is one of ${COLORS.join(', ')}`);
    assert.doesNotMatch(read(`agents/${a}.md`), /\*\*Persona\*\*/, `${a}: no Persona in the agent file`);
    const row = crew.split('\n').find((l) => l.startsWith(`| \`${a}\` |`));
    assert.ok(row, `${a}: has a default row in the CREW template`);
    const [, , emoji, name, vibe, rowColor] = row.split('|').map((c) => c.trim());
    assert.ok(emoji !== '–' && name !== '–' && vibe !== '–', `${a}: CREW row has emoji, name and vibe`);
    assert.equal(rowColor, color, `${a}: CREW default color matches frontmatter`);
  }
  for (const a of WORKERS) assert.match(read(`agents/${a}.md`), /\.team\/CREW\.md/, `${a}: reads CREW.md`);
  assert.match(read('agents/team-lead.md'), /Missing → create it from `\$\{CLAUDE_PLUGIN_ROOT\}\/templates\/core\/CREW\.md`/, 'lead creates CREW.md');
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
  for (const c of COMMANDS) assert.ok(kit.includes(`| \`${c}`), `run-kit lists command ${c}`);
  assert.doesNotMatch(kit, /claude --agent|main session/, 'run-kit does not prescribe how the lead is launched');
  assert.ok(!fs.existsSync(path.join(ROOT, 'skills/run-kit/references')), 'run-kit has no usage guide');
});

test('STATE.md belongs to the orchestrating session, with or without the lead', () => {
  const kit = read('skills/run-kit/SKILL.md');
  assert.match(kit, /^### Orchestrating without the lead$/m, 'run-kit covers direct orchestration');
  assert.match(frontmatter('skills/run-kit/SKILL.md'), /spawning team agents yourself/, 'run-kit loads for direct orchestration');
  assert.match(read('templates/core/STATE.md'), /Orchestrating without the lead/, 'STATE template points to the rule');
  for (const a of WORKERS) assert.doesNotMatch(read(`agents/${a}.md`), /STATE\.md` and `\.team\/archive\/` are the lead's/, `${a}: STATE is not lead-only`);
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

const WORKFLOWS = fs.readdirSync(path.join(ROOT, 'workflows')).filter((f) => f.endsWith('.js')).sort();
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

test('every workflow script is used by a command, parses, and only spawns real agents', () => {
  assert.ok(WORKFLOWS.length > 0, 'has workflow scripts');
  const commands = COMMANDS.map((c) => read(`commands/${c}.md`)).join('\n');
  for (const w of WORKFLOWS) {
    assert.ok(commands.includes(`\${CLAUDE_PLUGIN_ROOT}/workflows/${w}`), `${w}: referenced by a command`);
    const src = read(`workflows/${w}`);
    assert.match(src, /^export const meta = /m, `${w}: has meta`);
    const body = src.replace(/^export const meta/m, 'const meta');
    assert.doesNotThrow(() => new AsyncFunction('agent', 'parallel', 'pipeline', 'phase', 'log', 'args', 'budget', 'workflow', body), `${w}: parses as JS`);
    const meta = new Function(`${src.match(/^export (const meta = \{[\s\S]*?\n\})/m)[1]}; return meta;`)();
    assert.ok(meta.name && meta.description, `${w}: meta has name and description`);
    const literal = src.match(/^export const meta = (\{[\s\S]*?\n\})/m)[1].replace(/'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"/g, "''");
    assert.doesNotMatch(literal, /\$\{|`|\.\.\.|\(|\/\//, `${w}: meta is a pure literal (no templates, calls, spreads, comments)`);
    const idents = [...literal.matchAll(/\b([A-Za-z_]\w*)\b(?!\s*:)/g)].map((m) => m[1]).filter((id) => !['true', 'false', 'null'].includes(id));
    assert.deepEqual(idents, [], `${w}: meta has only keys and literals`);
    for (const [, name] of src.matchAll(/technical-team:(team-[a-z-]+)/g)) assert.ok(AGENTS.includes(name), `${w}: unknown agent ${name}`);
    for (const [, role] of src.matchAll(/'((?:code-reviewer|security|dba|qa|devops|writer|developer|debugger|architect|ba|pm|designer))'/g)) {
      assert.ok(AGENTS.includes(`team-${role}`), `${w}: unknown role ${role}`);
    }
    assert.doesNotMatch(src, /Date\.now|Math\.random|new Date\(\s*\)/, `${w}: no non-deterministic calls`);
  }
});

test('the shared schema and contract blocks are identical across workflow scripts', () => {
  const block = (src, name) => {
    const lines = src.split('\n');
    const i = lines.findIndex((l) => l.startsWith(`const ${name} = `));
    if (i < 0) return null;
    if (!/[{[]$/.test(lines[i])) return lines[i];
    const end = lines.findIndex((l, j) => j > i && /^[}\]]$/.test(l));
    return lines.slice(i, end + 1).join('\n');
  };
  const ref = read('workflows/review.js');
  const SHARED = ['FINDING', 'RESULT', 'SKEPTIC', 'CONTRACT', 'clean', 'dataBlock', 'parseArgs', 'skepticPrompt', 'verifyFindings', 'dedupe'];
  const PLAN_SHARED = ['clean', 'dataBlock', 'parseArgs'];
  const RELEASE_ONLY_MISSING = ['SKEPTIC', 'skepticPrompt', 'verifyFindings', 'dedupe'];
  for (const name of SHARED) assert.ok(block(ref, name), `review.js has ${name}`);
  for (const w of WORKFLOWS) {
    const src = read(`workflows/${w}`);
    for (const name of w === 'plan-tickets.js' ? PLAN_SHARED : SHARED) {
      const b = block(src, name);
      if (b) assert.equal(b, block(ref, name), `${w}: ${name} drifted from review.js`);
      else assert.ok(w === 'release.js' && RELEASE_ONLY_MISSING.includes(name), `${w}: missing ${name}`);
    }
  }
  for (const name of ['root', 'safePath']) assert.equal(block(read('workflows/plan-tickets.js'), name), block(read('workflows/build-loop.js'), name), `plan-tickets: ${name} drifted from build-loop.js`);
  // Skeptics get no agentType (they must not inherit "write the report"); agent text goes into a data block.
  assert.doesNotMatch(block(ref, 'verifyFindings'), /agentType/, 'skeptics run without an agentType');
  assert.match(block(ref, 'skepticPrompt'), /dataBlock\(/, 'skeptic prompt wraps the finding in a data block');
  assert.doesNotMatch(read('workflows/build-loop.js'), /fix:unmatched/, 'unowned findings never get a fixer');
  // parseArgs: a malformed args string must fail loudly, not as a misleading "args needs slug".
  const parseArgs = new Function(`${block(ref, 'parseArgs')}; return parseArgs;`)();
  assert.deepEqual(parseArgs('{"slug":"x"}', 'w'), { slug: 'x' });
  assert.deepEqual(parseArgs({ slug: 'x' }, 'w'), { slug: 'x' });
  assert.equal(parseArgs(undefined, 'w'), undefined);
  assert.throws(() => parseArgs('{"slug": ', 'w'), /w: args arrived as a string that is not valid JSON/);
  // safePath rejects paths that could widen a fixer's Write scope.
  const sp = block(read('workflows/build-loop.js'), 'safePath');
  const safePath = new Function('root', `${sp}; return safePath;`)('D:/repo');
  assert.equal(safePath('.\\src\\a.js'), 'src/a.js');
  assert.equal(safePath('D:\\repo\\src\\a.js'), 'src/a.js');
  for (const bad of ['.', './', '.GIT/hooks/x', 'a/.Claude/x', '/etc/passwd', 'C:/x', 'E:\\x\\y', '~/x', 'src/../../x', '..', '.git/hooks/pre-commit', 'a/.claude/settings.json', '']) assert.equal(safePath(bad), null, `safePath rejects "${bad}"`);
  for (const c of ['feature', 'fix', 'infra', 'new']) assert.match(read(`commands/${c}.md`), /workflows\/build-loop\.js/, `${c}: uses build-loop`);
});

test('every command that runs a workflow carries the shared opt-in sentence; run and the lead state the opt-in rules', () => {
  const sentence = "**Workflow opt-in** — the Workflow tool is available (also if deferred) AND the user typed a slash command of this plugin for this item (this command, or `/technical-team:run`, which hands the chosen pipeline to the lead) → run the workflow. Otherwise (no tool, or the lead was started without a slash command) → run the steps inline below.";
  const users = COMMANDS.filter((c) => read(`commands/${c}.md`).includes('workflows/'));
  assert.deepEqual(users, ['feature', 'fix', 'infra', 'new', 'release', 'review'], 'commands that run workflows');
  for (const c of users) assert.ok(read(`commands/${c}.md`).includes(sentence), `${c}: has the Workflow opt-in sentence`);
  assert.match(read('commands/run.md'), /Typing `\/technical-team:run` is your opt-in for the workflows/, 'run.md states the opt-in');
  assert.match(read('agents/team-lead.md'), /`workflows: yes\|no`/, 'the lead records workflows: yes|no in the STATE row');
  assert.match(read('templates/core/STATE.md'), /\| Workflows \|/, 'STATE row has a Workflows field');
});

test('plan-tickets checkTickets enforces the ticket rules in code', () => {
  const block = (src, name) => {
    const lines = src.split('\n');
    const i = lines.findIndex((l) => l.startsWith(`const ${name} = `));
    assert.ok(i >= 0, `has ${name}`);
    if (!/[{[]$/.test(lines[i])) return lines[i];
    return lines.slice(i, lines.findIndex((l, j) => j > i && /^[}\]]$/.test(l)) + 1).join('\n');
  };
  const src = read('workflows/plan-tickets.js');
  const code = ['root', 'ROLES', 'safePath', 'checkTickets'].map((n) => block(src, n)).join(';\n');
  const check = new Function('a', `${code}; return checkTickets;`)({});
  const t = (id, group, files, o = {}) => ({ id, title: id, role: 'developer', group, files, dependsOn: [], acs: ['AC-1'], ...o });
  const rules = (tickets) => check(tickets).map((i) => i.rule).sort();
  assert.deepEqual(rules([t('T-1', 1, ['src/a.js']), t('T-2', 1, ['src/b.js']), t('T-3', 2, ['src/a.js'], { dependsOn: ['T-1', 'T-2'] })]), [], 'clean set');
  assert.deepEqual(rules([t('T-1', 1, ['src/a.js']), t('T-2', 1, ['./src/a.js'])]), ['file-overlap'], 'same file in a group');
  assert.deepEqual(rules([t('T-1', 1, ['src/a']), t('T-2', 1, ['src/a/b.js'])]), ['file-overlap'], 'directory prefix overlap');
  assert.deepEqual(rules([t('T-1', 1, ['src/ab.js']), t('T-2', 1, ['src/a/b.js'])]), [], 'a name prefix is not a directory prefix');
  assert.deepEqual(rules([t('T-1', 1, ['a.js']), t('T-2', 1, ['b.js'], { dependsOn: ['T-1'] })]), ['dependency-order'], 'dependency in the same group');
  assert.deepEqual(rules([t('T-1', 1, ['a.js'], { dependsOn: ['T-2'] }), t('T-2', 2, ['b.js'])]), ['dependency-order'], 'dependency in a later group');
  assert.ok(rules([t('T-1', 1, ['a.js'], { dependsOn: ['T-2'] }), t('T-2', 2, ['b.js'], { dependsOn: ['T-1'] })]).includes('cycle'), 'cycle');
  assert.deepEqual(rules([t('T-1', 1, ['a.js'], { dependsOn: ['T-9'] })]), ['unknown-dependency'], 'unknown dependsOn');
  assert.deepEqual(rules([t('T-1', 1, ['a.js'], { dependsOn: ['T-1'] })]), ['self-dependency'], 'self dependency');
  assert.deepEqual(rules([t('T-1', 1, ['a.js']), t('T-2', 3, ['b.js'])]), ['group-gap'], 'group gap');
  assert.deepEqual(rules([t('T-1', 1, ['../x.js'])]), ['unsafe-path'], 'unsafe path');
  assert.deepEqual(rules([t('T-1', 1, ['a.js'], { acs: [] })]), ['acs'], 'missing AC');
  assert.deepEqual(rules([t('T-1', 1, ['a.js']), t('T-1', 1, ['b.js'])]), ['unique-id'], 'duplicate id');
  assert.deepEqual(rules([t('T-1', 1, ['a.js'], { role: 'qa' })]), ['role'], 'invalid role');
  assert.deepEqual(rules([t('T-1', 1, [])]), ['files'], 'no files');
  assert.deepEqual(rules([]), ['no-tickets'], 'empty ticket list');
  assert.deepEqual(rules([t('T-1', 1, ['src/A.js']), t('T-2', 1, ['src/a.JS'])]), ['file-overlap'], 'overlap ignores case');
  const m = (id, milestone, group, files, o = {}) => t(id, group, files, { milestone, ...o });
  assert.deepEqual(rules([m('T-1', 1, 1, ['a.js']), m('T-2', 2, 1, ['a.js'], { dependsOn: ['T-1'] })]), [], 'same group and file in different milestones, dependency on an earlier milestone');
  assert.deepEqual(rules([m('T-1', 2, 1, ['a.js']), m('T-2', 1, 1, ['b.js'], { dependsOn: ['T-1'] })]), ['dependency-order'], 'dependency on a later milestone');
  assert.deepEqual(rules([m('T-1', 1, 1, ['a.js']), m('T-2', 2, 2, ['b.js'])]), ['group-gap'], 'group gap inside the second milestone');
  assert.deepEqual(rules([m('T-1', 1, 1, ['a.js']), m('T-2', 1, 1, ['a.js'])]), ['file-overlap'], 'overlap inside one milestone');
  assert.deepEqual(rules([m('T-1', 0, 1, ['a.js'])]), ['milestone'], 'invalid milestone');
});

test('args keys: every key a workflow script reads is documented by its commands, and every documented key is read', () => {
  for (const w of WORKFLOWS) {
    const src = read(`workflows/${w}`);
    const read_ = new Set([...src.matchAll(/\b(?:a|A|args)\.([A-Za-z_]\w*)/g)].map((m) => m[1]));
    const cmds = COMMANDS.filter((c) => read(`commands/${c}.md`).includes(`workflows/${w}`)).map((c) => read(`commands/${c}.md`));
    assert.ok(cmds.length, `${w}: has a command`);
    const text = cmds.join('\n');
    for (const key of read_) assert.match(text, new RegExp(`\\b${key}\\b`), `${w}: args.${key} is not mentioned in any command that runs it`);
    for (const cmd of cmds) {
      for (const m of cmd.matchAll(/`args` = `(\{[^`]*\})`/g)) {
        const snippet = m[1];
        const named = [...cmd.slice(0, m.index).matchAll(/workflows\/([\w-]+\.js)/g)].pop();
        if (!named || named[1] !== w) continue;
        let inner = snippet.slice(1, -1);
        while (/[{[][^{}[\]]*[}\]]/.test(inner)) inner = inner.replace(/[{[][^{}[\]]*[}\]]/g, '');
        const keys = inner.split(',').map((k) => k.split(':')[0].trim()).filter(Boolean);
        assert.ok(keys.length, `${w}: parsed documented keys`);
        for (const key of keys) assert.ok(read_.has(key), `${w}: documented args key "${key}" is never read by the script`);
      }
    }
  }
});

const claude = spawnSync('claude', ['--version'], { shell: true, encoding: 'utf8' });
const hasClaude = claude.status === 0;

for (const target of [PLUGIN_DIR, '.claude-plugin/marketplace.json']) {
  test(`claude plugin validate --strict ${target}`, { skip: !hasClaude && 'claude CLI not installed' }, () => {
    const r = spawnSync('claude', ['plugin', 'validate', target, '--strict'], { cwd: REPO, shell: true, encoding: 'utf8', timeout: 120000 });
    assert.equal(r.status, 0, `${r.stdout}\n${r.stderr}`);
  });
}
