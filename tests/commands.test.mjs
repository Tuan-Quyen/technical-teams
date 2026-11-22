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
const COMMANDS = [...PIPELINES, 'retrospect', 'run', 'standup', 'triage'].sort();
const COLORS = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'cyan'];
const WORKERS = ['architect', 'ba', 'code-reviewer', 'dba', 'debugger', 'designer', 'developer', 'devops', 'pm', 'qa', 'retrospector', 'security', 'writer'].map((a) => `team-${a}`);
const AGENTS = [...WORKERS, 'team-orchestrator'].sort();
const SKILLS = ['business-analysis', 'development-process', 'plan', 'retrospect', 'run-kit', 'specialist-rules', 'test-process'];
const TEMPLATE_DIRS = ['adr', 'core', 'design', 'reports', 'requirements'];
const DOCS = [...walk('commands'), ...walk('agents'), ...walk('skills'), ...walk('templates')];
const REPO_URL = 'https://github.com/Tuan-Quyen/technical-teams';

// The .team/ layout documented in the README; `<slug>` and `NNNN-<…>` are placeholders.
const LAYOUT = [
  /^\.team\/?$/, /^\.team\/STATE\.md$/, /^\.team\/items\/(<slug>\.json|\*\.json)?$/, /^\.team\/ISSUES\.md$/, /^\.team\/retrospect\/(<YYYY-MM-DD>\/((retrospect\.md|evidence\/?|drafts\/.*))?|\.gitignore)?$/, /^\.team\/TASKS\.md$/, /^\.team\/PRODUCT\.md$/, /^\.team\/ARCHITECTURE\.md$/,
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

test('every command runs per run-kit §2, which routes to every pipeline and points at the orchestrator', () => {
  const kit = read('skills/run-kit/SKILL.md');
  for (const c of COMMANDS.filter((x) => x !== 'run')) assert.match(read(`commands/${c}.md`), /Load `technical-team:run-kit` and run this per its §2 \*Running a pipeline\*/, `${c}: runs per run-kit §2`);
  assert.match(read('commands/run.md'), /agents\/team-orchestrator\.md/, 'run hands the request to the orchestrator');
  for (const c of PIPELINES) assert.match(kit, new RegExp(`\\| \`${c}[\` ]`), `run-kit §2 routes to ${c}`);
  assert.match(kit, /^### Running a pipeline$/m, 'run-kit holds the shared pipeline rules');
  assert.match(kit, /follow `\$\{CLAUDE_PLUGIN_ROOT\}\/agents\/team-orchestrator\.md` §3–§6/, 'run-kit §2 points at the orchestrator');
  assert.match(read('agents/team-orchestrator.md'), /pick the row of its §2 table/, 'the orchestrator classifies with run-kit §2');
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
  assert.match(read('agents/team-orchestrator.md'), /mcp__/, 'orchestrator names MCP tools in briefs');
});

test('the orchestrator finds project agents and briefs them with the team rules', () => {
  const orchestrator = read('agents/team-orchestrator.md');
  assert.match(orchestrator, /Glob `\.claude\/agents\/\*\.md`/, 'orchestrator lists project agents at start');
  assert.match(orchestrator, /### Project specialists/, 'orchestrator has a Project specialists section');
  for (const mode of ['replace', 'consult']) assert.match(orchestrator, new RegExp(`\\*\\*${mode}\\*\\*`), `orchestrator defines mode ${mode}`);
  const kit = read('skills/run-kit/SKILL.md');
  assert.match(kit, /\*\*Project specialists\*\*/, 'run-kit roster mentions project specialists');
  assert.match(kit, /\*\*Briefing a project specialist\*\*/, 'run-kit has the specialist brief');
});

test('every agent has a color, and the run-kit roster shows the same one', () => {
  const kit = read('skills/run-kit/SKILL.md');
  for (const a of AGENTS) {
    const color = frontmatter(`agents/${a}.md`).match(/^color: (\w+)$/m)?.[1];
    assert.ok(COLORS.includes(color), `${a}: color is one of ${COLORS.join(', ')}`);
    const row = kit.split('\n').find((l) => l.startsWith(`| \`${a}\` |`));
    assert.ok(row, `${a}: has a row in the run-kit roster`);
    assert.equal(row.split('|')[2].trim(), color, `${a}: roster color matches frontmatter`);
  }
});

test('every specialist lists what it writes and preloads the one shared rules skill', () => {
  const rules = read('skills/specialist-rules/SKILL.md');
  assert.match(rules, /### Handoff/, 'shared rules hold the handoff');
  assert.match(rules, /Never commit or push/, 'shared rules forbid commit and push');
  for (const a of WORKERS) {
    const s = read(`agents/${a}.md`);
    const fm = frontmatter(`agents/${a}.md`);
    assert.match(s, /\n## Writes\n/, `${a}: has a Writes section`);
    assert.doesNotMatch(fm, /run-kit/, `${a}: does not preload run-kit`);
    assert.match(fm, /^skills: \["technical-team:specialist-rules"\]$/m, `${a}: preloads specialist-rules`);
    assert.doesNotMatch(s, /### Handoff/, `${a}: no copy of the handoff block (it lives in specialist-rules)`);
  }
  assert.doesNotMatch(frontmatter('agents/team-orchestrator.md'), /specialist-rules/, 'the orchestrator does not preload specialist rules');
});

test('run-kit covers roster, pipelines, brief, workspace and handoff only', () => {
  const kit = read('skills/run-kit/SKILL.md');
  const sections = [...kit.matchAll(/^## \d+\. (.+)$/gm)].map((m) => m[1]);
  assert.deepEqual(sections, ['Roster', 'Pipelines', 'Writing a brief', 'Workspace `.team/`', 'Handoff', 'Workflow steps']);
  for (const a of AGENTS) assert.ok(kit.includes(`| \`${a}\` |`), `roster lists ${a}`);
  for (const c of COMMANDS) assert.ok(kit.includes(`| \`${c}`), `run-kit lists command ${c}`);
  assert.doesNotMatch(kit, /claude --agent|main session/, 'run-kit does not prescribe how the orchestrator is launched');
  // The core stays short; detail lives in references the core names, each read only when its step comes up.
  const refs = fs.readdirSync(path.join(ROOT, 'skills/run-kit/references')).sort();
  assert.deepEqual(refs, ['qa-lines.md', 'qa-loop.md', 'roles.md', 'workflow.md', 'workspace.md']);
  for (const r of refs) assert.match(kit, new RegExp(`\\| \`${r.replace('.', '\\.')}\` \\(§`), `run-kit's map names ${r}`);
});

test('every skill file stays under 150 lines; longer content goes to a reference', () => {
  for (const f of DOCS.filter((d) => d.startsWith('skills/') && d.endsWith('.md'))) {
    const n = read(f).split('\n').length - (read(f).endsWith('\n') ? 1 : 0);
    assert.ok(n < 150, `${f}: ${n} lines`);
  }
});

test('item state belongs to the orchestrating session, with or without the orchestrator; STATE.md is generated', () => {
  const kit = read('skills/run-kit/SKILL.md');
  assert.match(kit, /^### Orchestrating without the orchestrator$/m, 'run-kit covers direct orchestration');
  assert.match(frontmatter('skills/run-kit/SKILL.md'), /spawning team agents yourself/, 'run-kit loads for direct orchestration');
  assert.match(kit, /Spawned agents never write item state \(specialist-rules\)/);
  assert.match(read('agents/team-orchestrator.md'), /You write only `\.team\/items\/`/, 'the orchestrator writes the item JSON');
  assert.match(read('skills/run-kit/references/workspace.md'), /\| `STATE\.md` — open items, resume point \| view, generated from `items\/` \| nobody writes it \|/);
  for (const a of WORKERS) assert.doesNotMatch(read(`agents/${a}.md`), /write[^\n]*`?\.team\/(STATE\.md|items)/i, `${a}: never writes item state`);
});

test('TASKS.md belongs to pm alone', () => {
  for (const f of DOCS) assert.doesNotMatch(read(f), /Status column|orchestrator \(Status\)/, `${f}: only pm writes TASKS.md`);
  assert.doesNotMatch(read('agents/team-orchestrator.md'), /You write only[^\n]*TASKS/, 'orchestrator does not write TASKS.md');
});

const WORKFLOW_NAMES = fs.readdirSync(path.join(ROOT, 'workflows')).filter((f) => f.endsWith('.js')).map((f) => read(`workflows/${f}`).match(/^  name: '([^']+)'/m)[1]);

test('every referenced agent, skill and plugin file exists', () => {
  for (const f of DOCS) {
    const s = read(f);
    for (const [, name] of s.matchAll(/technical-team:(team-[a-z-]+)/g)) assert.ok(AGENTS.includes(name) || WORKFLOW_NAMES.includes(name), `${f}: missing agent ${name}`);
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

test('README counts, blocked-tools table and template tree match the plugin', () => {
  const readme = read('README.md', REPO);
  const count = (re) => Number(readme.match(re)?.[1]);
  assert.equal(count(/\*\*(\d+) agent chuyên môn\*\*/), WORKERS.length, 'specialist count');
  assert.equal(count(/\*\*(\d+) lệnh\*\*/), COMMANDS.length, 'command count');
  const templates = walk('templates').map((p) => p.slice('templates/'.length)).sort();
  assert.equal(count(/\*\*(\d+) template\*\*/), templates.length, 'template count');

  // Template tree: `├── core/   A.md · B.md`, one line per type folder.
  const tree = readme.match(/```\ntemplates\/\n([\s\S]*?)```/);
  assert.ok(tree, 'README has the templates/ tree');
  const listed = [...tree[1].matchAll(/^[├└]── ([a-z]+)\/\s+(.+)$/gm)]
    .flatMap(([, dir, files]) => files.split('·').map((f) => `${dir}/${f.trim()}`)).sort();
  assert.deepEqual(listed, templates, 'templates/ tree');

  // Blocked-tools table: `| \`team-x\` · \`team-y\` | \`Bash\`, \`NotebookEdit\` (note) | ✅ |`; "không" = none.
  const rows = [...readme.matchAll(/^\| (`team-[a-z-]+`(?: · `team-[a-z-]+`)*) \| ([^|]+) \| ✅ \|$/gm)];
  const documented = {};
  for (const [, agents, blocked] of rows) {
    const tools = blocked.trim().startsWith('không') ? [] : [...blocked.matchAll(/`([A-Za-z_]+)`/g)].map((m) => m[1]).sort();
    for (const [, a] of agents.matchAll(/`(team-[a-z-]+)`/g)) documented[a] = tools;
  }
  assert.deepEqual(Object.keys(documented).sort(), WORKERS, 'every specialist is in the blocked-tools table once');
  for (const a of WORKERS) {
    const actual = (frontmatter(`agents/${a}.md`).match(/^disallowedTools: (.+)$/m)?.[1] ?? '')
      .split(',').map((t) => t.trim()).filter(Boolean).sort();
    assert.deepEqual(documented[a], actual, `${a}: README blocked tools vs disallowedTools`);
  }
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
    assert.match(meta.whenToUse || '', /^Internal step of \/technical-team:.+run .+ instead of invoking this directly\.$/, `${w}: meta.whenToUse tells a direct caller to run the command`);
    assert.ok(commands.includes(`technical-team:${meta.name}`), `${w}: a command calls it by name technical-team:${meta.name}`);
    assert.match(src, /if you invoked this directly, \$\{how\}/, `${w}: the args error carries the run-the-command hint`);
    assert.match(src, /const HOW = 'run \/technical-team:/, `${w}: HOW hint`);
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
  // review.js and release.js gate a diff or a release: same result shape, same item check.
  for (const name of ['FINDING', 'RESULT', 'CONTRACT', 'clean', 'dataBlock', 'parseArgs', 'ROUND_CAP', 'CLOSED', 'itemStatus']) {
    assert.ok(block(ref, name), `review.js has ${name}`);
    assert.equal(block(read('workflows/release.js'), name), block(ref, name), `release.js: ${name} drifted from review.js`);
  }
  for (const name of ['SKEPTIC', 'skepticPrompt', 'verifyFindings', 'dedupe']) assert.ok(block(ref, name), `review.js has ${name}`);
  // release.js fails closed on severe open issues from .team/ISSUES.md, as it does on items.
  const rel = read('workflows/release.js');
  assert.match(rel, /if \(!Array\.isArray\(A\.issues\)\) failA\(/, 'release.js requires args.issues');
  assert.match(rel, /const goNoGo = [^\n]*issueResults\.every\(\(i\) => i\.accepted\)/, 'an unaccepted issue makes release.js NO-GO');
  // Every script parses args, cleans agent text and wraps it in a data block the same way.
  for (const w of WORKFLOWS) for (const name of ['clean', 'dataBlock', 'parseArgs']) assert.equal(block(read(`workflows/${w}`), name), block(ref, name), `${w}: ${name} drifted from review.js`);
  // The cap is the same constant wherever an item is judged.
  for (const w of ['build-loop.js', 'review.js', 'release.js']) assert.equal(block(read(`workflows/${w}`), 'ROUND_CAP'), 'const ROUND_CAP = 3', `${w}: cap`);
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

test('the Workflow opt-in lives once in run-kit §2; workflow commands point to it; run and the orchestrator state the opt-in rules', () => {
  const sentence = "**Workflow opt-in** — the Workflow tool is available (also if deferred) AND the user typed a slash command of this plugin for this item (the command itself, or `/technical-team:run`, which hands the chosen pipeline to the orchestrator) → run the command's workflow step (§6). Otherwise (no tool, or the orchestrator was started without a slash command) → run the command's steps inline.";
  assert.ok(read('skills/run-kit/SKILL.md').includes(sentence), 'run-kit §2 has the opt-in sentence');
  const users = COMMANDS.filter((c) => read(`commands/${c}.md`).includes('workflows/'));
  assert.deepEqual(users, ['feature', 'fix', 'infra', 'new', 'release', 'review'], 'commands that run workflows');
  for (const c of COMMANDS) assert.ok(!read(`commands/${c}.md`).includes('the Workflow tool is available'), `${c}: no copy of the opt-in rule`);
  for (const c of users) assert.match(read(`commands/${c}.md`), /\*\*Workflow\*\* \(run-kit §2 opt-in/, `${c}: points to the opt-in`);
  assert.match(read('commands/run.md'), /Typing `\/technical-team:run` is your opt-in for the workflows/, 'run.md states the opt-in');
  assert.match(read('agents/team-orchestrator.md'), /`workflows: yes\|no` → `"workflows": true\|false`/, 'the orchestrator records the opt-in in the item');
});

test('commands call workflows by name and point to run-kit §6; the shared workflow rules are not repeated in them', () => {
  const kit = read('skills/run-kit/SKILL.md');
  const sec = read('skills/run-kit/references/workflow.md');
  assert.ok(kit.includes('`references/workflow.md`'), 'run-kit §6 points to its reference');
  assert.match(sec, /Read `\$\{CLAUDE_PLUGIN_ROOT\}\/workflows\/<file>\.js`[^\n]*pass its text as `script`/, 'run-kit §6 has the fallback');
  assert.match(sec, /tell the user it runs in the background/, 'run-kit §6 has the background rule');
  for (const s of ['`stuck`', '`stopped`', '`done`', 'startAt', 'fromGroup', ...['blocked', 'needs-input', 'missing', 'no-verdict', 'disputed', 'unowned', 'stalled', 'spec-issues', 'retest-incomplete', 'fail-without-blocker', 'qa-pending'].map((x) => `\`${x}\``)]) assert.ok(sec.includes(s), `run-kit §6 covers ${s}`);
  assert.match(kit, /^## 6\. Workflow steps$/m, 'run-kit has the §6 heading');
  const row = (status) => {
    const l = sec.split('\n').find((x) => x.startsWith(`| \`${status}\``) || x.startsWith(`| \`${status}\`, `) || x.includes(`\`, \`${status}\` |`));
    assert.ok(l, `run-kit §6 has a row for ${status}`);
    return l;
  };
  const pairs = { done: /next step/, stuck: /decide with the user/, stopped: /route every `needsUser`/, blocked: /Past the cap/, 'needs-input': /§5 table/, missing: /re-spawn that agent once.*ask the user/, 'no-verdict': /blocked/, disputed: /the user decides/, unowned: /who owns.*startAt: "review"/, stalled: /ask the user/, 'retest-incomplete': /nothing counts as fixed/ };
  for (const [st, re] of Object.entries(pairs)) assert.match(row(st), re, `run-kit §6: ${st} row routes correctly`);
  let n = 0;
  for (const c of COMMANDS) {
    const text = read(`commands/${c}.md`);
    if (!text.includes('workflows/')) continue;
    n++;
    assert.doesNotMatch(text, /the file text unchanged|Read it again|Read the file again/, `${c}: no pass-the-file-text instruction`);
    assert.doesNotMatch(text, /`script`|pass its text|runs in the background|task notification|if the name is not found/i, `${c}: shared workflow rules are not repeated`);
    assert.match(text, /name: 'technical-team:team-[\w-]+'/, `${c}: calls Workflow by name`);
    assert.match(text, /per run-kit §6/, `${c}: routes the result per run-kit §6`);
  }
  assert.equal(n, 6, 'six workflow commands');
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
  const t = (id, group, files, o = {}) => ({ id, title: id, role: 'developer', group, files, dependsOn: [], acs: ['AC-1'], estimate: 1, ...o });
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
  // with the item key, ticket IDs must be <KEY>-T<n>
  const keyed = new Function('a', `${code}; return checkTickets;`)({ key: 'CART' });
  const keyedRules = (ts) => keyed(ts).map((i) => i.rule).sort();
  assert.deepEqual(keyedRules([t('CART-T1', 1, ['a.js']), t('CART-T2', 2, ['b.js'], { dependsOn: ['CART-T1'] })]), [], 'keyed IDs pass');
  assert.deepEqual(keyedRules([t('T-1', 1, ['a.js']), t('USER-T2', 1, ['b.js']), t('CART-T0', 1, ['c.js'])]), ['id-format', 'id-format', 'id-format'], 'old, foreign and zero IDs are sent back to pm');
  assert.deepEqual(rules([t('T-1', 1, ['../x.js'])]), ['unsafe-path'], 'unsafe path');
  assert.deepEqual(rules([t('T-1', 1, ['a.js'], { acs: [] })]), ['acs'], 'missing AC');
  assert.deepEqual(rules([t('T-1', 1, ['a.js']), t('T-1', 1, ['b.js'])]), ['unique-id'], 'duplicate id');
  assert.deepEqual(rules([t('T-1', 1, ['a.js'], { role: 'qa' })]), ['role'], 'invalid role');
  assert.deepEqual(rules([t('T-1', 1, [])]), ['files'], 'no files');
  assert.deepEqual(rules([t('T-1', 1, ['a.js'], { estimate: undefined })]), ['estimate'], 'missing estimate');
  assert.deepEqual(rules([t('T-1', 1, ['a.js'], { estimate: 0 })]), ['estimate'], 'zero estimate');
  assert.deepEqual(rules([t('T-1', 1, ['a.js'], { estimate: 3 })]), ['estimate-split'], 'over 2d is split');
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
        const metaName = read(`workflows/${w}`).match(/^  name: '([^']+)'/m)[1];
        const allNames = WORKFLOWS.map((x) => read(`workflows/${x}`).match(/^  name: '([^']+)'/m)[1]);
        const named = [...cmd.slice(0, m.index).matchAll(/technical-team:(team-[\w-]+)'|workflows\/([\w-]+\.js)/g)].filter((h) => !h[1] || allNames.includes(h[1])).pop();
        if (!named || !(named[1] === metaName || named[2] === w)) continue;
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

test('--small is the user flag only: feature.md says so and needs one ticket; the orchestrator only suggests it', () => {
  const f = read('commands/feature.md');
  assert.match(f, /`--small` is the user's flag only: it applies only when `\$ARGUMENTS` contains `--small`/, 'feature: --small is user-only');
  assert.match(f, /never pick it yourself/, 'feature: the orchestrator never picks --small');
  assert.match(f, /suggest `--small` in one line before step 1 and wait for the user's yes/, 'feature: suggest and wait');
  assert.match(f, /exactly one ticket \(one developer, `groups: \[\[one item\]\]`\), no parallel groups/, 'feature: --small is one ticket');
  const row = read('skills/run-kit/SKILL.md').split('\n').find((l) => l.includes('| `feature --small`'));
  assert.match(row, /the user's flag only; the orchestrator may suggest it, never choose it/, 'run-kit §2: suggests only');
});
