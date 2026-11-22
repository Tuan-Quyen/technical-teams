#!/usr/bin/env node
// Migrates a project's docs from the old IDs to item-key IDs (run-kit §3 *IDs people can read*). Dry run by default.
//   node migrate-ids.mjs [project-dir] [--write] [--all] [--key <slug>=<KEY> ...] [--shared <slug>] [--keep-backup]
//
//   old          new          what                   defined by (the item it belongs to)
//   T-1          CART-T1      ticket                 the item's TASKS.md section
//   F-001        CART-B1      tracker bug/finding    the item's findings.md
//   AC1, AC-1    CART-AC1     acceptance criterion   the item's requirements file
//   E1           CART-E1      edge case              the item's requirements file
//   Q-D1         CART-D1      decision               the item's requirements / design files
//   M1           CART-M1      milestone              the item's TASKS.md section / system design
//   R-01 S-01 Q-01  CART-R1 CART-S1 CART-Q1  review / security / qa finding   the item's review.md / security.md / qa.md
// Product-wide IDs (BR-1, G-1 in PRODUCT.md) are one per project already and stay as they are.
//
// Which item an old ID belongs to: an item named on the same line, if it defines the ID; else the file's own item if
// it defines it; else the one item that defines it; else, when no item defines it, the file's own item. Anything
// else (two items define it, no clue on the line) is left as it is and listed, with its line. --shared <slug> names
// the item for files of no item. --all also scans the project's other docs and source files (comments and test
// names), not only .team/. --write copies .team/ to .team.bak-<timestamp>/, writes, checks (a second pass finds
// nothing, every tracker uses the item's bug IDs) and deletes the copy; a failed check restores everything.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { deriveKey as keyFromSlug } from '../../../tools/team-state.mjs';

const KEY_RE = /^[A-Z][A-Z0-9]{1,5}$/;
const SLUG = '[a-z0-9][a-z0-9-]*';
// An optional [AREA] [FEATURE] label before the slug in a TASKS.md heading.
const LABEL = '(?:\\[[A-Z0-9-]+\\] )*';
// Old IDs, never glued to a letter or digit before them; an already migrated ID (CART-T1) is skipped in code.
const B = '(?<![A-Za-z0-9])';
const TYPES = {
  D: new RegExp(`${B}Q-D(\\d+)\\b`, 'g'),
  T: new RegExp(`${B}T-(\\d+)\\b`, 'g'),
  B: new RegExp(`${B}F-0*(\\d+)\\b`, 'g'),
  AC: new RegExp(`${B}AC-?(\\d+)\\b`, 'g'),
  E: new RegExp(`${B}E(\\d+)\\b`, 'g'),
  M: new RegExp(`${B}M(\\d+)\\b`, 'g'),
  R: new RegExp(`${B}R-0*(\\d+)\\b`, 'g'),
  S: new RegExp(`${B}S-0*(\\d+)\\b`, 'g'),
  Q: new RegExp(`${B}Q-0*(\\d+)\\b`, 'g'),
};
const TEXT = /\.(md|ts|tsx|js|jsx|mjs|cjs|vue|svelte|py|go|rb|java|kt|swift|cs|feature|txt|ya?ml)$/i;
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', 'coverage', '.next', '.nuxt', 'out', 'vendor', '.venv', 'target', '.claude']);

const readText = (p) => fs.readFileSync(p, 'utf8');
const walk = (d, skip = new Set()) => (fs.existsSync(d) ? fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => {
  if (e.isDirectory()) return skip.has(e.name) || e.name.startsWith('.team.bak') ? [] : walk(path.join(d, e.name), skip);
  return [path.join(d, e.name)];
}) : []);
const cells = (line) => line.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
const row = (cs) => `| ${cs.join(' | ')} |`;
const posix = (p) => p.split(path.sep).join('/');

// A key from the slug, shared with team-state.mjs: readable, never taken, never a digit suffix.
export const deriveKey = (slug, taken) => {
  const k = keyFromSlug(slug, taken);
  if (!k) throw new Error(`no free key for ${slug} from its slug: pass --key ${slug}=<KEY>`);
  return k;
};

// Which item a .team/ file belongs to: reports|archive/<slug>/…, requirements|system-design|frontend-design/<slug>.md.
const ownerOf = (rel) => {
  const p = posix(rel);
  let m = p.match(new RegExp(`^(?:reports|archive)/(${SLUG})/`));
  if (m) return m[1];
  m = p.match(new RegExp(`^(?:requirements|system-design|frontend-design)/(${SLUG})\\.md$`));
  return m ? m[1] : null;
};
const tasksSections = (text) => {
  const out = [];
  let cur = null;
  for (const line of text.split('\n')) {
    const h = line.match(new RegExp(`^## ${LABEL}(${SLUG})(?: · ([A-Z][A-Z0-9]{1,5}))? — `));
    if (h) { cur = { slug: h[1], key: h[2] || null, lines: [] }; out.push(cur); continue; }
    if (/^## /.test(line)) cur = null;
    if (cur) cur.lines.push(line);
  }
  return out;
};
// Ranges such as T-1..T-10, AC18–AC21, AC1-AC4 define every number in between.
// Already migrated IDs (POMO-T8) count too, so a half-migrated project still knows who defines what.
const NEW_FORM = { D: 'D', T: 'T', B: 'B', AC: 'AC', E: 'E', M: 'M', R: 'R', S: 'S', Q: 'Q' };
const numbers = (text, type) => {
  const out = new Set();
  for (const m of text.matchAll(TYPES[type])) out.add(Number(m[1]));
  const neu = `(?<![A-Za-z0-9])[A-Z][A-Z0-9]{1,5}-${NEW_FORM[type]}(\\d+)\\b`;
  for (const m of text.matchAll(new RegExp(neu, 'g'))) out.add(Number(m[1]));
  const one = TYPES[type].source;
  for (const r of [`${one}\\s*(?:\\.\\.|–|-|to)\\s*${one}`, `${neu}\\s*(?:\\.\\.|–|-|to)\\s*${neu}`]) {
    for (const m of text.matchAll(new RegExp(r, 'g'))) for (let i = Number(m[1]); i <= Number(m[2]) && i - Number(m[1]) < 500; i++) out.add(i);
  }
  return out;
};

const discover = (team) => {
  const slugs = new Set();
  const known = new Map();
  const defs = Object.fromEntries(Object.keys(TYPES).map((t) => [t, new Map()]));
  const rows = new Map();
  const def = (type, text, slug) => { for (const n of numbers(text, type)) { if (!defs[type].has(n)) defs[type].set(n, new Set()); defs[type].get(n).add(slug); } };
  const tasks = path.join(team, 'TASKS.md');
  if (fs.existsSync(tasks)) {
    for (const sec of tasksSections(readText(tasks).replace(/\r\n/g, '\n'))) {
      slugs.add(sec.slug);
      if (sec.key) known.set(sec.slug, sec.key);
      def('T', sec.lines.join('\n'), sec.slug);
      def('M', sec.lines.join('\n'), sec.slug);
    }
  }
  const state = path.join(team, 'STATE.md');
  if (fs.existsSync(state)) {
    let header = null;
    for (const line of readText(state).split(/\r?\n/)) {
      if (!line.trim().startsWith('|')) { header = null; continue; }
      const cs = cells(line);
      if (!header) { header = cs; continue; }
      if (cs.every((c) => /^:?-+:?$/.test(c))) continue;
      if (header[0] === 'Slug' && new RegExp(`^${SLUG}$`).test(cs[0])) {
        slugs.add(cs[0]);
        const k = header.indexOf('Key');
        if (k > 0 && KEY_RE.test(cs[k] || '')) known.set(cs[0], cs[k]);
      }
    }
  }
  for (const d of ['reports', 'archive']) {
    const dir = path.join(team, d);
    if (fs.existsSync(dir)) for (const e of fs.readdirSync(dir, { withFileTypes: true })) if (e.isDirectory()) slugs.add(e.name);
  }
  for (const d of ['requirements', 'system-design', 'frontend-design']) {
    for (const f of walk(path.join(team, d))) if (f.endsWith('.md') && path.basename(f) !== 'DESIGN.md' && path.dirname(f) === path.join(team, d)) slugs.add(path.basename(f, '.md'));
  }
  for (const f of walk(team)) {
    const rel = posix(path.relative(team, f));
    const s = ownerOf(rel);
    if (!s || !rel.endsWith('.md')) continue;
    const text = readText(f);
    const base = path.basename(rel);
    if (base === 'findings.md') def('B', text, s);
    if (base === 'review.md') def('R', text, s);
    if (base === 'security.md') def('S', text, s);
    if (base === 'qa.md') def('Q', text, s);
    // The table row that defines a gate finding, kept to match a bare mention elsewhere by its content.
    const gate = { 'review.md': 'R', 'security.md': 'S', 'qa.md': 'Q', 'findings.md': 'B' }[base];
    if (gate) {
      for (const line of text.split(/\r?\n/)) {
        const m = line.match(/^\|\s*([^|]+?)\s*\|/);
        if (!m) continue;
        const n = [...numbers(m[1], gate)][0];
        if (n === undefined) continue;
        const k = `${gate}${n}`;
        if (!rows.has(k)) rows.set(k, new Map());
        rows.get(k).set(s, `${rows.get(k).get(s) || ''} ${line}`);
      }
    }
    if (/(^|\/)requirements\//.test(rel)) { def('AC', text, s); def('E', text, s); def('D', text, s); }
    if (/(^|\/)frontend-design\//.test(rel)) def('D', text, s);
    if (/(^|\/)system-design\//.test(rel)) { def('M', text, s); def('D', text, s); }
  }
  return { slugs: [...slugs].sort(), known, defs, rows };
};
const STOP = new Set(['the', 'and', 'for', 'with', 'that', 'this', 'from', 'when', 'into', 'then', 'than', 'only', 'still', 'after', 'before', 'until', 'open', 'fixed', 'verified', 'should', 'suggestion', 'blocking', 'major', 'minor', 'test', 'tests', 'src']);
const distinct = (t) => new Set(String(t).toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((w) => w.length > 3 && !STOP.has(w) && !/^\d+$/.test(w)));

export const migrate = (root, { write = false, all = false, keys: overrides = {}, shared = null, keepBackup = false, stamp = null } = {}) => {
  const team = path.join(root, '.team');
  if (!fs.existsSync(team)) throw new Error(`no .team/ in ${root}`);
  const { slugs, known, defs, rows } = discover(team);
  let guessFile = null;
  if (shared && !slugs.includes(shared)) throw new Error(`--shared ${shared}: no such item (items: ${slugs.join(', ') || 'none'})`);
  const keys = {};
  const source = {};
  const taken = new Set();
  for (const [s, k] of Object.entries(overrides)) {
    if (!KEY_RE.test(k || '')) throw new Error(`--key ${s}=${k}: a key is 2-6 capitals or digits, first a capital`);
    if (taken.has(k)) throw new Error(`--key ${s}=${k}: key used twice`);
    keys[s] = k; source[s] = 'given'; taken.add(k);
  }
  for (const s of slugs) if (!keys[s] && known.has(s) && !taken.has(known.get(s))) { keys[s] = known.get(s); source[s] = 'existing'; taken.add(keys[s]); }
  for (const s of slugs) if (!keys[s]) { keys[s] = deriveKey(s, taken); source[s] = 'derived'; taken.add(keys[s]); }
  const keyList = Object.values(keys).sort((x, y) => y.length - x.length).join('|');
  const migrated = keyList ? new RegExp(`(^|[^A-Za-z0-9])(${keyList})-$`) : null;
  const slugRes = slugs.map((s) => [s, new RegExp(`(^|[^a-z0-9-])${s.replace(/[-]/g, '\\-')}([^a-z0-9-]|$)`)]);

  const resolve = (type, n, own, line) => {
    const set = defs[type].get(n) || new Set();
    const named = slugRes.filter(([s, re]) => s !== own && re.test(line)).map(([s]) => s);
    if (named.length === 1 && (set.has(named[0]) || !set.size)) return named[0];
    if (own && set.has(own)) return own;
    if (set.size === 1) return [...set][0];
    if (set.size === 0) return own || (slugs.length === 1 ? slugs[0] : null);
    // The other IDs on the line, where one item alone defines them, all point to the same item that has this one.
    const near = new Set();
    for (const [t, re] of Object.entries(TYPES)) {
      for (const m of line.matchAll(re)) { const d = defs[t].get(Number(m[1])); if (d && d.size === 1) near.add([...d][0]); }
      for (const m of line.matchAll(new RegExp(`(?<![A-Za-z0-9])(${keyList})-${t}\\d+\\b`, 'g'))) { const s = slugs.find((x) => keys[x] === m[1]); if (s) near.add(s); }
    }
    if (near.size === 1 && set.has([...near][0])) return [...near][0];
    // Several items define it and nothing on the line names one: match the line against each item's defining row.
    const cand = rows.get(`${type}${n}`);
    if (cand) {
      const words = distinct(line);
      const scored = [...cand].filter(([s]) => set.has(s)).map(([s, r]) => [s, [...distinct(r)].filter((w) => words.has(w)).length]).sort((x, y) => y[1] - x[1]);
      if (scored.length && scored[0][1] >= 2 && (scored.length === 1 || scored[0][1] > scored[1][1])) return { slug: scored[0][0], guessed: true };
    }
    return null;
  };
  // Rewrites one file's text line by line; `left` collects what stays, with its line number.
  const rewrite = (text, own, left) => text.split('\n').map((line, i) => Object.keys(TYPES).reduce((l, type) => l.replace(TYPES[type], (m, n, off, str) => {
    if (migrated && migrated.test(str.slice(Math.max(0, off - 8), off))) return m;
    let s = resolve(type, Number(n), own, line);
    if (!s) { left.push(`${m} (line ${i + 1})`); return m; }
    if (typeof s === 'object') { s = s.slug; if (guessFile) guessFile.push(`${m} → ${keys[s]}-${type}${Number(n)} (line ${i + 1})`); }
    return `${keys[s]}-${type}${Number(n)}`;
  }), line)).join('\n');
  // Old IDs still in a text (not part of a migrated ID).
  const oldCount = (text) => Object.values(TYPES).reduce((n, re) => n + [...text.matchAll(re)].filter((m) => !(migrated && migrated.test(text.slice(Math.max(0, m.index - 8), m.index)))).length, 0);

  const migrateState = (text, left) => {
    const out = [];
    let header = null, keyAt = -1, capAt = -1;
    for (const line of text.split('\n')) {
      const t = line.trim();
      if (!t.startsWith('|')) {
        header = null;
        const note = t.match(new RegExp(`^- (${SLUG}):`));
        let l = note && keys[note[1]] ? rewrite(line, note[1], left) : line;
        if (/^## Approvals\s*$/.test(t)) l = '## Approvals (audit log)';
        out.push(l);
        continue;
      }
      let cs = cells(line);
      if (!header) {
        header = cs; keyAt = -1; capAt = -1;
        const orig = cs.join('|');
        if (cs[0] === 'Slug') {
          capAt = cs.indexOf('Cap');
          if (capAt > 0) cs.splice(capAt, 1);
          cs = cs.map((c) => (c === 'Last F-ID' ? 'Last bug no.' : c));
          if ((cs.includes('Fix rounds') || cs.includes('Pipeline')) && !cs.includes('Key')) { cs.splice(1, 0, 'Key'); keyAt = 1; }
        }
        out.push(cs.join('|') === orig ? line : row(cs));
        continue;
      }
      if (cs.every((c) => /^:?-+:?$/.test(c))) {
        if (capAt < 0 && keyAt < 0) { out.push(line); continue; }
        if (capAt > 0) cs.splice(capAt, 1);
        if (keyAt > 0) cs.splice(keyAt, 0, '---');
        out.push(`|${cs.join('|')}|`);
        continue;
      }
      if (header[0] !== 'Slug') { out.push(line); continue; }
      const own = keys[cs[0]] ? cs[0] : null;
      if (capAt < 0 && keyAt < 0) { out.push(own ? rewrite(line, own, left) : line); continue; }
      if (capAt > 0) cs.splice(capAt, 1);
      if (keyAt > 0) cs.splice(keyAt, 0, own ? keys[own] : '');
      out.push(own ? rewrite(row(cs), own, left) : row(cs));
    }
    return out.join('\n');
  };
  const LEGEND = '> IDs: `<KEY>-T<n>` ticket · `<KEY>-B<n>` bug or finding · `<KEY>-AC<n>` acceptance criterion; KEY is the item\'s key (heading below, STATE.md). Write an ID with its summary the first time in a line: `CART-T2 (save button)`.';
  const migrateTasks = (text, left) => {
    let own = null;
    const lines = text.split('\n').map((line) => {
      const h = line.match(new RegExp(`^## (${LABEL})(${SLUG})(?: · ([A-Z][A-Z0-9]{1,5}))? — (.*)$`));
      if (h) { own = h[2]; return `## ${h[1]}${h[2]} · ${keys[h[2]]} — ${h[4]}`; }
      if (/^## /.test(line)) own = null;
      return own ? rewrite(line, own, left) : line;
    });
    if (!text.includes('> IDs: `<KEY>-T<n>`')) {
      const i = lines.findIndex((l) => l.startsWith('> '));
      lines.splice(i >= 0 ? i + 1 : 1, 0, LEGEND);
    }
    return lines.join('\n');
  };

  const targets = () => {
    const inTeam = walk(team).filter((f) => /\.(md|json)$/.test(f)).map((f) => ({ abs: f, rel: path.relative(team, f), inTeam: true }));
    if (!all) return inTeam;
    const outside = walk(root, SKIP_DIRS).filter((f) => !posix(path.relative(root, f)).startsWith('.team/') && TEXT.test(f))
      .map((f) => ({ abs: f, rel: path.relative(root, f), inTeam: false }));
    return [...inTeam, ...outside];
  };
  const plan = () => {
    const changes = [];
    const ambiguous = [];
    const guessed = [];
    for (const t of targets()) {
      const before = readText(t.abs);
      if (before.includes('\u0000')) continue;
      const text = before.replace(/\r\n/g, '\n');
      const left = [];
      guessFile = [];
      let after;
      if (t.inTeam && posix(t.rel) === 'STATE.md') after = migrateState(text, left);
      else if (t.inTeam && posix(t.rel) === 'TASKS.md') after = migrateTasks(text, left);
      else after = rewrite(text, (t.inTeam && ownerOf(t.rel)) || shared, left);
      const label = t.inTeam ? `.team/${posix(t.rel)}` : posix(t.rel);
      if (left.length) ambiguous.push({ file: label, ids: left });
      if (guessFile.length) guessed.push({ file: label, ids: guessFile });
      if (after !== text) changes.push({ abs: t.abs, file: label, ids: Math.max(oldCount(text) - oldCount(after), 0), after: before.includes('\r\n') ? after.replace(/\n/g, '\r\n') : after });
    }
    guessFile = null;
    return { changes, ambiguous, guessed };
  };
  const { changes, ambiguous, guessed } = plan();

  let backup = null;
  let backupKept = false;
  if (write && changes.length) {
    backup = path.join(root, `.team.bak-${stamp || new Date().toISOString().replace(/[-:]/g, '').replace(/\..*$/, '')}`);
    fs.cpSync(team, backup, { recursive: true });
    const outside = changes.filter((c) => !c.file.startsWith('.team/')).map((c) => ({ abs: c.abs, text: readText(c.abs) }));
    try {
      for (const c of changes) fs.writeFileSync(c.abs, c.after);
      const again = plan();
      if (again.changes.length) throw new Error(`a second pass still changes ${again.changes.map((c) => c.file).join(', ')}`);
      for (const f of walk(team).filter((p) => p.endsWith('findings.md'))) {
        const json = readText(f).match(/```json\r?\n([\s\S]*?)\r?\n```/);
        if (!json) continue;
        const own = ownerOf(path.relative(team, f));
        for (const e of JSON.parse(json[1])) if (own && keys[own] && !new RegExp(`^${keys[own]}-B[1-9][0-9]*$`).test(e.id)) throw new Error(`.team/${posix(path.relative(team, f))}: tracker ID "${e.id}" is not ${keys[own]}-B<n>`);
      }
    } catch (e) {
      fs.rmSync(team, { recursive: true, force: true });
      fs.renameSync(backup, team);
      for (const o of outside) fs.writeFileSync(o.abs, o.text);
      throw new Error(`migration failed, everything restored unchanged: ${e.message}`);
    }
    if (keepBackup) backupKept = true;
    else fs.rmSync(backup, { recursive: true, force: true });
  }
  return { keys, source, changes: changes.map(({ file, ids }) => ({ file, ids })), ambiguous, guessed, backup: backupKept ? backup : null, written: write && changes.length > 0 };
};

const main = (argv) => {
  const args = argv.slice(2);
  const opts = { write: args.includes('--write'), all: args.includes('--all'), keepBackup: args.includes('--keep-backup'), keys: {}, shared: null };
  let root = '.';
  for (let i = 0; i < args.length; i++) {
    if (['--write', '--all', '--keep-backup'].includes(args[i])) continue;
    if (args[i] === '--key') { const [s, k] = String(args[++i] || '').split('='); opts.keys[s] = k; continue; }
    if (args[i] === '--shared') { opts.shared = args[++i]; continue; }
    if (args[i] === '--help' || args[i] === '-h') { console.log('node migrate-ids.mjs [project-dir] [--write] [--all] [--key <slug>=<KEY> ...] [--shared <slug>] [--keep-backup]'); return 0; }
    root = args[i];
  }
  const r = migrate(path.resolve(root), opts);
  console.log('Item keys:');
  for (const [s, k] of Object.entries(r.keys)) console.log(`  ${k.padEnd(6)}  ${s}  (${r.source[s]})`);
  console.log(r.changes.length ? `\n${opts.write ? 'Changed' : 'Would change'}:` : '\nNothing to change: already migrated.');
  for (const c of r.changes) console.log(`  ${c.file}  (${c.ids} ID(s))`);
  if (r.guessed.length) {
    console.log('\nMatched by content (several items have this ID; the line matched one finding best). Check them:');
    for (const g of r.guessed) console.log(`  ${g.file}: ${g.ids.join(', ')}`);
  }
  if (r.ambiguous.length) {
    console.log('\nLeft as they are (more than one item could own them; fix by hand, name the item on the line, or --shared <slug>):');
    for (const a of r.ambiguous) console.log(`  ${a.file}: ${a.ids.join(', ')}`);
  }
  if (r.backup) console.log(`\nBackup kept: ${r.backup}`);
  else if (opts.write && r.written) console.log('\nChecked and written; the temporary backup was removed.');
  else if (!opts.write && r.changes.length) console.log(`\nDry run. Re-run with --write to apply.${opts.all ? '' : ' Add --all to include docs and source outside .team/.'}`);
  return 0;
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { process.exitCode = main(process.argv); } catch (e) { console.error(`migrate-ids: ${e.message}`); process.exitCode = 1; }
}
