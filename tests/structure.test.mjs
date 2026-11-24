// Document format of plugins/team: every agent, command, skill and reference follows
// the section skeleton of its type (CLAUDE.md § Document format).
// Run from the repo root: node --test tests/structure.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'plugins/team');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8').replace(/\r\n/g, '\n');
const md = (dir) => fs.readdirSync(path.join(ROOT, dir)).filter((f) => f.endsWith('.md'));
const body = (s) => s.replace(/^---\n[\s\S]*?\n---\n/, '').replace(/```[\s\S]*?```/g, '');
const h2 = (s) => [...body(s).matchAll(/^## (.+)$/gm)].map((m) => m[1]);
const h1 = (s) => [...body(s).matchAll(/^# (.+)$/gm)].map((m) => m[1]);

const AGENT = ['Inputs', 'Before you start', 'Work', 'Done when', 'Stop and report', 'Writes', 'Never'];
const METHOD = ['When to load', 'Principles', 'Method', 'Done when', 'References'];
const METHOD_SKILLS = ['business-analysis', 'development-process', 'plan', 'retrospect', 'test-process'];

test('agents: one title, a bold mission line, then the agent sections in order', () => {
  for (const f of md('agents')) {
    const s = read(`agents/${f}`);
    assert.equal(h1(s).length, 1, `${f}: one H1`);
    assert.match(body(s), /^# .+\n\n\*\*.+/m, `${f}: bold mission line under the title`);
    assert.deepEqual(h2(s), AGENT, `${f}: sections`);
    if (f !== 'team-orchestrator.md') assert.match(s, /preloaded `technical-team:specialist-rules`/, `${f}: points at the shared rules`);
  }
});

// Blocks run alone or as a step of a parent pipeline (run-kit §2 Composing commands); only they have `## As a step`.
const BLOCKS = ['fix', 'infra', 'release', 'review', 'standup', 'test'];

test('commands: title is the slash command; When to use, As a step (blocks only), Steps, Workflow (only with a workflow), Done when', () => {
  for (const f of md('commands')) {
    const s = read(`commands/${f}`);
    const name = f.slice(0, -3);
    assert.deepEqual(h1(s), [`/technical-team:${name}`], `${f}: title`);
    const want = ['When to use', ...(BLOCKS.includes(name) ? ['As a step'] : []), 'Steps', ...(s.includes('workflows/') ? ['Workflow'] : []), 'Done when'];
    assert.deepEqual(h2(s), want, `${f}: sections`);
    if (name !== 'run') assert.match(s, /\n## Steps\n\n\| # \| Step \| Agent[^|]*\| Gate \/ verify \|/, `${f}: steps table`);
  }
});

test('method skills: When to load, Principles (rule, bullets, test), Method, Done when, References', () => {
  for (const k of METHOD_SKILLS) {
    const s = read(`skills/${k}/SKILL.md`);
    assert.deepEqual(h2(s), METHOD, `${k}: sections`);
    const principles = body(s).split('\n## Principles\n')[1].split('\n## Method\n')[0];
    const items = principles.split(/^### /m).slice(1);
    assert.ok(items.length >= 3, `${k}: at least three principles`);
    for (const p of items) {
      assert.match(p, /^\d\. .+\n\n\*\*.+\*\*\n/, `${k}: "${p.split('\n')[0]}" opens with a bold rule`);
      assert.match(p, /\nTest: .+/, `${k}: "${p.split('\n')[0]}" ends with a Test line`);
    }
    for (const f of fs.readdirSync(path.join(ROOT, `skills/${k}/references`))) assert.ok(s.includes(`\`${f}\``), `${k}: References lists ${f}`);
  }
});

test('specialist-rules holds the four Karpathy principles once; run-kit opens with When to load and ends with References', () => {
  const rules = read('skills/specialist-rules/SKILL.md');
  assert.deepEqual(h2(rules), ['When to load', 'Principles', 'Writes — `.team/` spec rules', 'Tools', 'Handoff']);
  const titles = [...rules.matchAll(/^### (\d\. .+)$/gm)].map((m) => m[1]);
  assert.deepEqual(titles, ['1. Think before you work', '2. Simplicity first', '3. Surgical changes', '4. Goal-driven']);
  assert.equal((rules.match(/^Test: /gm) || []).length, 4, 'each principle ends with a Test line');
  for (const f of md('agents')) assert.doesNotMatch(read(`agents/${f}`), /^### \d\. (Think|Simplicity|Surgical|Goal)/m, `${f}: no copy of the principles`);
  const kit = h2(read('skills/run-kit/SKILL.md'));
  assert.equal(kit[0], 'When to load');
  assert.equal(kit.at(-1), 'References');
});

test('every skill reference opens with its title and a "Used by · Read when" line', () => {
  for (const k of fs.readdirSync(path.join(ROOT, 'skills'))) {
    const dir = path.join(ROOT, 'skills', k, 'references');
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) {
      const lines = read(`skills/${k}/references/${f}`).split('\n');
      assert.match(lines[0], /^# /, `${k}/${f}: title`);
      assert.match(lines[2], /^> Used by: .+ · Read when: .+/, `${k}/${f}: Used by · Read when`);
    }
  }
});

test('blocks: an As a step table of modes; every "<block> (as a step: <mode>)" a command uses names a mode the block defines', () => {
  const modes = {};
  for (const b of BLOCKS) {
    const sec = body(read(`commands/${b}.md`)).split('\n## As a step\n')[1].split('\n## ')[0];
    assert.match(sec, /^\| Mode \| Parent step \| Runs \| Hands back \|$/m, `${b}: As a step table`);
    modes[b] = [...sec.matchAll(/^\| `([\w-]+)` \|/gm)].map((m) => m[1]);
    assert.ok(modes[b].length, `${b}: at least one mode`);
    assert.match(read(`commands/${b}.md`), /^- As a step[^\n]*$/m, `${b}: Done when says what a step hands back`);
  }
  let uses = 0;
  for (const f of md('commands')) {
    for (const m of read(`commands/${f}`).matchAll(/`([\w-]+)` \(as a step: ([\w-]+)\)/g)) {
      uses++;
      assert.ok(BLOCKS.includes(m[1]), `${f}: ${m[1]} is not a block`);
      assert.ok(modes[m[1]].includes(m[2]), `${f}: ${m[1]} has no mode ${m[2]}`);
    }
  }
  assert.ok(uses >= 10, 'parents compose blocks');
  for (const p of ['feature', 'new']) assert.match(read(`commands/${p}.md`), /`review` \(as a step: gate\)|`feature\.md`/, `${p}: composes review`);
  assert.match(read('skills/run-kit/SKILL.md'), /\*\*Composing commands\*\*/, 'run-kit §2 holds the composition rule');
});
