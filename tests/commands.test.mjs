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
const commands = fs.readdirSync(path.join(ROOT, 'commands')).filter((f) => f.endsWith('.md')).map((f) => f.slice(0, -3)).sort();

const REMOVED = ['plan', 'change', 'hotfix', 'investigate', 'audit', 'adr', 'roster'];
const EXPECTED = ['docs', 'feature', 'fix', 'hire', 'infra', 'init', 'new', 'release', 'review', 'run', 'status', 'test'];

function frontmatter(name) {
  const m = read(`commands/${name}.md`).match(/^---\r?\n([\s\S]*?)\r?\n---/);
  assert.ok(m, `${name}.md has frontmatter`);
  return m[1];
}

function docFiles() {
  const out = ['README.md', 'skills/run-kit/SKILL.md'];
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
  const kit = read('skills/run-kit/SKILL.md');
  const kitCmds = [...kit.matchAll(/^\| `([a-z-]+)` \|/gm)].map((m) => m[1]).filter((c) => !c.startsWith('-'));
  assert.deepEqual([...new Set(kitCmds)].sort(), EXPECTED, 'run-kit §1.2 table');
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
  const has = (file, id) => new RegExp(`^\\| ${id} \\|`, 'm').test(read(`commands/${file}.md`));
  const reused = {
    feature: ['P1', 'P2', 'P2a', 'P3', 'P4', 'P5', 'D1', 'D2', 'D3', 'D4', 'D5'],
    docs: ['2', '3', '4', 'A2'],
    infra: ['1', '2', '3', '4a', '4b'],
    release: ['0', '1', '2', '3'],
    fix: ['1', '2', '3', '4', '5', '6', '7'],
  };
  for (const [file, ids] of Object.entries(reused)) {
    for (const id of ids) assert.ok(has(file, id), `${file}.md step ${id}`);
  }
  const nw = read('commands/new.md');
  for (const ref of ['`feature.md` P1', '`feature.md` P2–P4', '`feature.md` D1–D4', '`infra.md` 3–4b', '`docs.md` Sync 2–4', '`release.md` 0–3', '`fix.md` steps 1–7']) {
    assert.ok(nw.includes(ref), `new.md reuses ${ref}`);
  }
  assert.match(read('commands/infra.md'), /Inside `new`/, 'infra.md documents the G1 rule inside new');
});

test('new: the five user gates and the resume checkpoint are defined', () => {
  const nw = read('commands/new.md');
  for (const g of ['**REQ**', '**STACK**', '**G1**', '**Mk**', '**RELEASE**']) assert.ok(nw.includes(`| — | ${g} |`), `gate row ${g}`);
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
    assert.ok(read('agents/lead.md').includes(name), `lead.md mentions agent ${name}`);
  }
  for (const d of fs.readdirSync(path.join(ROOT, 'skills'))) {
    assert.ok(readme.includes('`' + d + '`'), `README mentions skill ${d}`);
  }
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
  assert.equal(ls().length, 6);
  assert.ok(fs.existsSync(path.join(dir, '.claude', 'agents')));
});
