// Consistency checks for the command set: the documented list matches the
// files, nothing references a removed command, and every step that another
// pipeline reuses by ID (new.md, run.md) still exists in its source file.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
// A pipeline step is a list line: `- **P1** (ba) …`, `- A1. (lead) …` or `3. (developer) …`.
// The parenthesis names the owner; `owner` must appear in it.
const stepRe = (id, owner) => new RegExp(`^(?:- )?\\*{0,2}${id}\\*{0,2}\\.? \\(${owner ? `[^)]*\\b${owner}\\b` : ''}`, 'm');
const commands = fs.readdirSync(path.join(ROOT, 'commands')).filter((f) => f.endsWith('.md')).map((f) => f.slice(0, -3)).sort();

const REMOVED = ['plan', 'change', 'hotfix', 'investigate', 'audit', 'adr', 'roster'];
const EXPECTED = ['docs', 'feature', 'fix', 'hire', 'infra', 'init', 'new', 'release', 'review', 'run', 'status', 'test'];

function frontmatter(name) {
  const m = read(`commands/${name}.md`).match(/^---\r?\n([\s\S]*?)\r?\n---/);
  assert.ok(m, `${name}.md has frontmatter`);
  return m[1];
}

function docFiles() {
  const out = ['README.md', 'skills/run-kit/SKILL.md', 'skills/run-kit/references/usage.md'];
  for (const dir of ['agents', 'commands', 'templates', 'templates/team']) {
    for (const f of fs.readdirSync(path.join(ROOT, dir))) if (f.endsWith('.md')) out.push(`${dir}/${f}`);
  }
  return out;
}

test('command files are exactly the documented set', () => {
  assert.deepEqual(commands, EXPECTED);
});

test('every command has a description; pipelines with input have an argument-hint', () => {
  for (const c of commands) {
    const fm = frontmatter(c);
    assert.match(fm, /^description: ".+"$/m, `${c}: description`);
    if (!['init', 'status'].includes(c)) {
      assert.match(read(`commands/${c}.md`), /^## Pipeline$/m, `${c}: has a Pipeline section`);
    }
    if (!['init', 'status'].includes(c)) assert.match(fm, /^argument-hint: ".+"$/m, `${c}: argument-hint`);
  }
});

test('run-kit and README list every command, and only those', () => {
  const kit = read('skills/run-kit/references/usage.md');
  const kitCmds = [...kit.matchAll(/^\| `([a-z-]+)` \|/gm)].map((m) => m[1]).filter((c) => !c.startsWith('-'));
  assert.deepEqual([...new Set(kitCmds)].sort(), EXPECTED, 'run-kit usage §2 table');
  const readme = read('README.md');
  const start = readme.search(/^## \d+\. Lệnh workflow/m);
  assert.ok(start >= 0, 'README has a "Lệnh workflow" section');
  const sec = readme.slice(start, readme.indexOf('\n### ', start));
  const rmCmds = [...sec.matchAll(/^\| `([a-z-]+)` \|/gm)].map((m) => m[1]);
  assert.deepEqual([...new Set(rmCmds)].sort(), EXPECTED, 'README §7 table');
});

test('no reference to a removed command (except the README migration note)', () => {
  for (const f of docFiles()) {
    let text = read(f);
    if (f === 'README.md') text = text.replace(/\*\*Đổi từ bản [^\n]*/, '');
    for (const c of REMOVED) {
      assert.doesNotMatch(text, new RegExp(`/technical-team:${c}\\b`), `${f}: /technical-team:${c}`);
      assert.doesNotMatch(text, new RegExp(`commands/${c}\\.md`), `${f}: commands/${c}.md`);
      assert.doesNotMatch(text, new RegExp('(?<!/ )`' + c + '`(?! fix)'), `${f}: \`${c}\` as a command`); // `terraform validate / `plan`` is a tool command
    }
  }
});

test('every commands/<name>.md reference points to an existing file', () => {
  for (const f of docFiles()) {
    for (const m of read(f).matchAll(/commands\/([a-z-]+)\.md/g)) {
      if (m[1] === 'name') continue; // placeholder commands/<name>.md
      assert.ok(commands.includes(m[1]), `${f} references commands/${m[1]}.md`);
    }
  }
});

test('steps reused by ID in new.md exist in their source pipelines', () => {
  const has = (file, id) => stepRe(id).test(read(`commands/${file}.md`));
  const reused = {
    feature: ['P1', 'P1a', 'P2', 'P2a', 'P3a', 'P3', 'P4', 'P5', 'D1', 'D2', 'D3', 'D4', 'D5'],
    docs: ['2', '3', '4', 'A2'],
    infra: ['1', '2', '3', '4a', '4b'],
    release: ['0', '1', '2', '3'],
    fix: ['1', '2', '3', '4', '5', '6', '7'],
  };
  for (const [file, ids] of Object.entries(reused)) {
    for (const id of ids) assert.ok(has(file, id), `${file}.md step ${id}`);
  }
  const nw = read('commands/new.md');
  for (const ref of ['`feature.md` P1', '`feature.md` P1a–P4', '`feature.md` D1–D4', '`infra.md` 3–4b', '`docs.md` Sync 2–4', '`release.md` 0–3', '`fix.md` steps 1–7']) {
    assert.ok(nw.includes(ref), `new.md reuses ${ref}`);
  }
  assert.match(read('commands/infra.md'), /Inside `new`/, 'infra.md documents the G1 rule inside new');
});

test('new: the five user gates and the resume checkpoint are defined', () => {
  const nw = read('commands/new.md');
  for (const g of ['**REQ**', '**STACK**', '**G1**', '**Mk**', '**RELEASE**']) assert.ok(nw.includes(`- ${g} (gate)`), `gate step ${g}`);
  assert.match(nw, /### R — Resume check/);
  const state = read('templates/team/STATE.md');
  for (const l of ['**Phase:**', '**Next step:**', '**Milestones:**', '**Input:**']) assert.ok(state.includes(l), `STATE template: ${l}`);
  assert.match(read('commands/status.md'), /pipeline `new`/);
});

test('every agent and skill is documented in README (and agents in run-kit or lead)', () => {
  const readme = read('README.md');
  for (const f of fs.readdirSync(path.join(ROOT, 'agents')).filter((x) => x.endsWith('.md'))) {
    const name = f.slice(0, -3);
    assert.ok(readme.includes('`' + name + '`'), `README mentions agent ${name}`);
    assert.ok(read('agents/team-lead.md').includes(name), `lead.md mentions agent ${name}`);
  }
  for (const d of fs.readdirSync(path.join(ROOT, 'skills'))) {
    assert.ok(readme.includes('`' + d + '`'), `README mentions skill ${d}`);
  }
});

test('every core agent is named team-<role>, file name and frontmatter agree', () => {
  for (const f of fs.readdirSync(path.join(ROOT, 'agents')).filter((x) => x.endsWith('.md'))) {
    const name = f.slice(0, -3);
    const body = read(`agents/${f}`);
    if (body.includes('technical-team:specialist')) continue;
    assert.match(name, /^team-[a-z-]+$/, `agents/${f}: core agents carry the team- prefix`);
    assert.match(body, new RegExp(`^name: ${name}$`, 'm'), `agents/${f}: frontmatter name matches the file`);
  }
  for (const f of docFiles()) {
    assert.doesNotMatch(read(f), /technical-team:(lead|ba|designer|architect|pm|developer|debugger|qa|code-reviewer|security|devops|writer|hr|dba)(?![\w-])/, `${f}: old agent name without team- prefix`);
  }
});

test('designer and live preview are wired into the delivery pipelines', () => {
  const feature = read('commands/feature.md');
  for (const id of ['P1a', 'D3a', 'S3a']) assert.match(feature, stepRe(id, 'designer'), `feature.md ${id} is the designer's step`);
  for (const f of ['commands/feature.md', 'commands/fix.md', 'commands/test.md', 'commands/release.md', 'commands/new.md']) {
    assert.match(read(f), /live.preview/i, `${f} asks for a live preview`);
  }
  assert.match(read('agents/team-qa.md'), /^  - technical-team:live-preview$/m, 'qa preloads live-preview');
  assert.match(read('agents/team-qa.md'), /^  - technical-team:test-process$/m, 'qa preloads test-process');
  assert.match(feature, stepRe('P3a', 'qa'), 'feature.md P3a is the qa test plan');
  assert.ok(!fs.existsSync(path.join(ROOT, 'templates', 'team', 'QA.md')), 'no separate QA.md: qa works in TASKS.md');
  assert.match(read('templates/team/TASKS.md'), /^### QA — W-000/m, 'TASKS template has the QA subsection');
  for (const ref of ['techniques.md', 'quality-checklist.md', 'ux-verification.md', 'defects-and-reports.md']) {
    assert.ok(fs.existsSync(path.join(ROOT, 'skills', 'test-process', 'references', ref)), ref);
    assert.ok(read('skills/test-process/SKILL.md').includes(ref), `test-process SKILL.md points to ${ref}`);
  }
  assert.ok(fs.existsSync(path.join(ROOT, 'templates', 'team', 'DESIGN.md')), 'DESIGN.md template');
  for (const ref of ['common-bugs.md', 'web.md', 'mobile.md', 'desktop.md', 'cli.md', 'service.md']) {
    assert.ok(fs.existsSync(path.join(ROOT, 'skills', 'live-preview', 'references', ref)), ref);
    assert.ok(read('skills/live-preview/SKILL.md').includes(ref), `SKILL.md points to ${ref}`);
  }
});

test('qa gate calibration and upstream alignment stay wired', () => {
  const tp = read('skills/test-process/references/process.md');
  for (const rule of ['Scope lock', 'Target lock', 'Depth per tier', 'Round focus', 'Severity needs evidence', '## 5. Micro verify']) assert.ok(tp.includes(rule), `test-process process.md: ${rule}`);
  const tps = read('skills/test-process/SKILL.md');
  for (const rule of ['Scope lock', 'Target lock', 'Depth by tier', 'Severity']) assert.ok(tps.includes(rule), `test-process SKILL.md: ${rule}`);
  assert.match(read('agents/team-lead.md'), /\*\*open in-scope blocker\/critical\/major defects\*\*/, 'lead: progress = fewer open in-scope defects');
  assert.match(read('agents/team-lead.md'), /three consecutive rounds show no progress/, 'lead: escalation on no progress');
  assert.match(read('agents/team-developer.md'), /RTM conditions/, 'developer builds to qa conditions');
  assert.match(read('agents/team-pm.md'), /Screens \+ states/, 'pm tickets carry designed states');
  assert.match(read('agents/team-code-reviewer.md'), /^7\. UI/m, 'code-reviewer UI check');
  assert.match(read('agents/team-developer.md'), /Nghi lỗi thiết kế/, 'developer: design-flaw handoff');
  assert.match(read('agents/team-architect.md'), /## Design escalation/, 'architect: design escalation workflow');
  assert.match(read('agents/team-lead.md'), /\*\*Design escalation\*\*/, 'lead: routes design escalation');
});

test('preloaded skills stay small; detail lives in references', () => {
  const words = (f) => read(f).split(/\s+/).length;
  for (const f of ['skills/run-kit/SKILL.md', 'skills/test-process/SKILL.md', 'skills/live-preview/SKILL.md']) {
    assert.ok(words(f) <= 800, `${f} has ${words(f)} words (preloaded: keep <= 800, move detail to references/)`);
  }
  assert.ok(read('skills/live-preview/SKILL.md').includes('pass.md'), 'live-preview points to pass.md');
  assert.ok(read('skills/test-process/SKILL.md').includes('process.md'), 'test-process points to process.md');
  assert.ok(read('skills/run-kit/SKILL.md').includes('references/usage.md'), 'run-kit points to usage.md');
});

test('parallel review and micro verify are wired', () => {
  const feature = read('commands/feature.md');
  assert.match(feature, /^- \*\*D2\*\*[^\n]*security reviews the same diff in parallel/m, 'D2: security in parallel on first pass');
  assert.match(feature, /^- \*\*D4\*\*[^\n]*\*\*delta\*\*/m, 'D4: delta only');
  assert.match(feature, stepRe('S2m', 'qa'), 'S2m micro verify by qa');
  assert.match(read('agents/team-lead.md'), /^- \*\*Micro \(small mode only\)\*\*/m, 'lead: micro criteria');
});

test('squads and qa fan-out are wired', () => {
  const lead = read('agents/team-lead.md');
  assert.match(lead, /^## Squads$/m, 'lead: squads section');
  for (const s of ['Discovery', 'Build', 'Verify', 'Support']) assert.match(lead, new RegExp(`^- \\*\\*${s}\\*\\*:`, 'm'), `lead: squad ${s}`);
  assert.match(lead, /^- \*\*QA fan-out\*\*:[^\n]*independent/m, 'lead: qa fan-out rule');
  assert.match(lead, /Only the merge verdict counts for G2/, 'lead: one verdict');
  const qa = read('agents/team-qa.md');
  for (const run of ['**core**', '**platform**', '**merge**']) assert.ok(qa.includes(run), `qa: ${run} run`);
  const feature = read('commands/feature.md');
  assert.match(feature, /^- \*\*D3\*\*[^\n]*QA fan-out/m, 'D3: qa fan-out');
  assert.match(feature, /^- \*\*S3\*\*[^\n]*QA fan-out/m, 'S3: qa fan-out');
  for (const f of ['commands/fix.md', 'commands/test.md', 'skills/run-kit/references/usage.md']) {
    assert.match(read(f), /fan.out|fans out/i, `${f} mentions the fan-out`);
  }
  assert.match(read('README.md'), /QA tỏa nhánh theo nền tảng/, 'README: qa fan-out');
});

test('ba: guided elicitation, product baseline and discover mode are wired', () => {
  assert.ok(!fs.existsSync(path.join(ROOT, 'agents', 'analyst.md')), 'analyst was renamed to ba');
  const ba = read('agents/team-ba.md');
  assert.match(ba, /^name: team-ba$/m);
  assert.match(ba, /^  - technical-team:business-analysis$/m, 'ba preloads business-analysis');
  for (const s of ['Ready-to-spec', 'PRODUCT.md', 'cần quyết định', 'As-is + impact']) assert.ok(ba.includes(s), `ba.md: ${s}`);
  const skill = read('skills/business-analysis/SKILL.md');
  for (const s of ['Greenfield', 'Operating system', 'Discovery', 'Guide, do not interrogate', 'Playback', 'Facts are labelled', '## Ready-to-spec']) assert.ok(skill.includes(s), `business-analysis SKILL.md: ${s}`);
  assert.ok(skill.split(/\s+/).length <= 800, 'business-analysis SKILL.md stays small (preloaded)');
  for (const ref of ['elicitation.md', 'contexts.md']) {
    assert.ok(fs.existsSync(path.join(ROOT, 'skills', 'business-analysis', 'references', ref)), ref);
    assert.ok(skill.includes(ref), `SKILL.md points to ${ref}`);
  }
  const feature = read('commands/feature.md');
  assert.match(feature, /^- \*\*P1\*\* \(ba\)[^\n]*\*\*round\*\*/m, 'P1: ba elicitation rounds');
  assert.match(feature, /^- `--discover`[^\n]*\*\*discover\*\*/m, 'feature: discover mode');
  for (const id of ['V0', 'V1', 'V2', 'V3']) assert.match(feature, stepRe(id), `feature.md step ${id}`);
  assert.match(frontmatter('feature'), /--discover/, 'feature argument-hint has --discover');
  assert.match(read('agents/team-lead.md'), /\*\*Elicitation rounds \(REQ\)\*\*:[^\n]*as written/, 'lead relays rounds unchanged');
  assert.match(read('commands/new.md'), /PRODUCT\.md/, 'new: product baseline at N1');
  for (const h of ['## Capability map', '## Business rules', '## Backlog', '## Glossary']) assert.ok(read('templates/team/PRODUCT.md').includes(h), `PRODUCT template: ${h}`);
  for (const h of ['### As-is and impact', '### Scenarios', '### Assumptions']) assert.ok(read('templates/team/SPEC.md').includes(h), `SPEC template: ${h}`);
  for (const f of docFiles()) assert.doesNotMatch(read(f), /(?<![Bb]usiness )\banalyst\b/, `${f}: old role name`);
});

test('disable-model-invocation kept on user-initiated commands', () => {
  for (const c of ['run', 'new', 'hire', 'init', 'status']) {
    assert.match(frontmatter(c), /^disable-model-invocation: true$/m, c);
  }
});

test('team-init creates .team files on demand, never up front', async () => {
  const { spawnSync } = await import('node:child_process');
  const os = await import('node:os');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tt-init-'));
  const run = (...a) => spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'team-init.mjs'), ...a], { env: { ...process.env, CLAUDE_PROJECT_DIR: dir }, encoding: 'utf8' });
  const ls = () => fs.readdirSync(path.join(dir, '.team')).sort();
  assert.equal(run().status, 0);
  assert.deepEqual(ls(), ['STATE.md'], 'default: STATE.md only');
  assert.ok(!fs.existsSync(path.join(dir, '.claude')), 'no .claude/ unless asked');
  fs.writeFileSync(path.join(dir, '.team', 'STATE.md'), 'mine');
  assert.equal(run('SPEC', '.team/plan.md').status, 0);
  assert.deepEqual(ls(), ['PLAN.md', 'SPEC.md', 'STATE.md']);
  assert.equal(fs.readFileSync(path.join(dir, '.team', 'STATE.md'), 'utf8'), 'mine', 'never overwrites');
  assert.equal(run('BOGUS').status, 2);
  assert.equal(run('--config').status, 0);
  assert.ok(fs.existsSync(path.join(dir, '.claude', 'technical-team.json')));
  assert.ok(!fs.existsSync(path.join(dir, '.claude', 'agents')));
  assert.equal(run('--all').status, 0);
  assert.equal(ls().length, 8);
  assert.ok(fs.existsSync(path.join(dir, '.claude', 'agents')));
});
