// Consistency checks: the command and agent sets match what the README
// documents, every agent a command or skill names exists, and nothing still
// points at the removed lead/gate machinery. Run: node --test tests/commands.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const list = (dir) => fs.readdirSync(path.join(ROOT, dir)).filter((f) => f.endsWith('.md')).map((f) => f.slice(0, -3)).sort();
const walk = (dir) => fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? walk(`${dir}/${e.name}`) : e.name.endsWith('.md') ? [`${dir}/${e.name}`] : []);
const frontmatter = (p) => {
  const m = read(p).match(/^---\r?\n([\s\S]*?)\r?\n---/);
  assert.ok(m, `${p} has frontmatter`);
  return m[1];
};

const COMMANDS = ['docs', 'feature', 'fix', 'infra', 'new', 'release', 'review', 'test'];
const AGENTS = ['architect', 'ba', 'code-reviewer', 'dba', 'debugger', 'designer', 'developer', 'devops', 'pm', 'qa', 'security', 'writer'].map((a) => `team-${a}`);
const DOCS = ['README.md', ...walk('commands'), ...walk('agents'), ...walk('skills')];

test('command and agent files are exactly the documented sets', () => {
  assert.deepEqual(list('commands'), COMMANDS);
  assert.deepEqual(list('agents'), AGENTS);
});

test('every command has a description and an argument-hint', () => {
  for (const c of COMMANDS) {
    const fm = frontmatter(`commands/${c}.md`);
    assert.match(fm, /^description: ".+"$/m, `${c}: description`);
    assert.match(fm, /^argument-hint: ".+"$/m, `${c}: argument-hint`);
    assert.match(read(`commands/${c}.md`), /\$ARGUMENTS/, `${c}: uses $ARGUMENTS`);
  }
});

test('every agent has name = file name, a description, a model and a handoff block', () => {
  for (const a of AGENTS) {
    const fm = frontmatter(`agents/${a}.md`);
    assert.match(fm, new RegExp(`^name: ${a}$`, 'm'), `${a}: name`);
    assert.match(fm, /^description: .+$/m, `${a}: description`);
    assert.match(fm, /^model: (sonnet|opus|haiku|inherit)$/m, `${a}: model`);
    assert.match(read(`agents/${a}.md`), /### Handoff/, `${a}: handoff block`);
  }
});

test('every referenced agent and skill exists', () => {
  const skills = fs.readdirSync(path.join(ROOT, 'skills'));
  for (const f of DOCS) {
    for (const [, name] of read(f).matchAll(/technical-team:(team-[a-z-]+)/g)) {
      assert.ok(AGENTS.includes(name), `${f} references missing agent ${name}`);
    }
    for (const [, name] of read(f).matchAll(/technical-team:([a-z]+-[a-z-]+)`/g)) {
      if (!name.startsWith('team-')) assert.ok(skills.includes(name), `${f} references missing skill ${name}`);
    }
  }
});

test('README lists every command, and only those', () => {
  const readme = read('README.md');
  const cmds = [...readme.matchAll(/^\| `\/technical-team:([a-z-]+)` \|/gm)].map((m) => m[1]);
  assert.deepEqual([...new Set(cmds)].sort(), COMMANDS);
});

test('nothing points at the removed lead and gate machinery', () => {
  const gone = [/team-lead/, /team-hr/, /run-kit/, /W-NNN/, /STATE\.md/, /OPS_HANDOFF/, /\bG[1-4]\b/, /CLAUDE_PLUGIN_ROOT\}\/(templates|hooks|config|scripts)/];
  for (const f of DOCS) for (const re of gone) assert.doesNotMatch(read(f), re, `${f} still mentions ${re}`);
});
