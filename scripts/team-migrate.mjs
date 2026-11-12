#!/usr/bin/env node
// Migrates a project's .team/ from the old single-file layout to the per-item layout.
//
//   node team-migrate.mjs            -> dry run: prints the plan, writes nothing
//   node team-migrate.mjs --apply    -> carries the plan out
//   (project = $CLAUDE_PROJECT_DIR, or --dir <path>, or the current directory)
//
// Old layout (one file per role, one `## W-NNN — <title> · status: …` section per work item):
//   SPEC.md          -> requirements/<slug>.md
//   PLAN.md          -> system-design/<slug>.md
//   DESIGN.md        -> frontend-design/<slug>.md; its `## Design system` section -> frontend-design/_system.md
//   TASKS.md         -> the `### QA — W-NNN` subsection of each item -> qa/<slug>.md
//   OPS_HANDOFF.md, archive/<FILE>-<YYYY-MM>.md -> moved unchanged into archive/legacy/
//
// <slug> = W-NNN-<kebab-title>, the same in every folder. The split sources
// (SPEC.md, PLAN.md, DESIGN.md, TASKS.md) are never deleted or edited, and an
// existing destination is never overwritten, so the script can be re-run.
// STATE.md is not touched: the lead reshapes it.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Old file -> where its work-item sections go. `promote` = heading levels to lift,
// because a section (`##`) becomes a whole file (`#`).
export const SPLIT = [
  { file: 'SPEC.md', dir: 'requirements', kind: 'requirements', owner: 'team-ba' },
  { file: 'PLAN.md', dir: 'system-design', kind: 'system design', owner: 'team-architect' },
  { file: 'DESIGN.md', dir: 'frontend-design', kind: 'frontend design', owner: 'team-designer' },
];
export const LEGACY_WHOLE = ['OPS_HANDOFF.md'];
const ITEM_HEADING = /^##\s+(W-\d+)\b\s*(?:[—–-]\s*(.*?))?\s*(?:·\s*status:\s*(.+?))?\s*$/;
const STATE_HEADING = /^###\s+(W-\d+)\b\s*(?:[—–-]\s*(.*?))?\s*$/;
const QA_HEADING = /^###\s+QA\b[^\n]*?(?:·\s*status:\s*(\S+))?\s*$/;
const DESIGN_SYSTEM_HEADING = /^##\s+Design system\s*$/i;
const OLD_ARCHIVE_FILE = /^[A-Z_]+-\d{4}-\d{2}\.md$/;

/** Lines of `text` with a flag telling whether each one is inside a ``` fence. */
function scan(text) {
  let fenced = false;
  return text.split(/\r?\n/).map((line) => {
    const isFence = /^\s*(```|~~~)/.test(line);
    const inside = fenced || isFence;
    if (isFence) fenced = !fenced;
    return { line, code: inside };
  });
}

/** Splits into sections that start at a heading of exactly `level` hashes (outside fences). */
function sections(text, level) {
  const re = new RegExp(`^#{${level}}\\s`);
  const out = [];
  let cur = null;
  for (const { line, code } of scan(text)) {
    if (!code && re.test(line)) {
      cur = { heading: line, body: [] };
      out.push(cur);
    } else if (cur) {
      cur.body.push(line);
    }
  }
  return out;
}

/** Lifts every heading by `by` levels (never above `#`), leaving fenced code alone. */
function promote(lines, by) {
  let fenced = false;
  return lines.map((line) => {
    const isFence = /^\s*(```|~~~)/.test(line);
    const code = fenced || isFence;
    if (isFence) fenced = !fenced;
    if (code) return line;
    const m = line.match(/^(#+)(\s.*)$/);
    return m ? '#'.repeat(Math.max(1, m[1].length - by)) + m[2] : line;
  });
}

const trimBlank = (lines) => {
  const a = [...lines];
  while (a.length && !a[0].trim()) a.shift();
  while (a.length && !a[a.length - 1].trim()) a.pop();
  return a;
};

// Old defect statuses -> the vocabulary the closing procedure reads (`open` → `fixed` → `verified`, or `dropped`).
// Without this a defect the old layout had `closed` would look unresolved and become a follow-up ticket.
// `moved`, `deferred` and `design_question` have no equivalent and are left for a person to settle.
export const DEFECT_STATUS = { closed: 'verified', rejected: 'dropped', new: 'open', reopened: 'open', retest: 'fixed' };

/** Rewrites the Status cell of every table that has both an `ID` and a `Status` column. */
function translateDefectStatuses(lines) {
  let col = -1;
  let fenced = false;
  return lines.map((line) => {
    if (/^\s*(```|~~~)/.test(line)) { fenced = !fenced; return line; }
    if (fenced || !line.trimStart().startsWith('|')) { col = -1; return line; }
    const cells = line.split('|');
    if (col < 0) {
      const names = cells.map((c) => c.trim().toLowerCase());
      col = names.includes('id') ? names.indexOf('status') : -1;
      if (col < 0) col = -2; // a table without those columns: skip its rows
      return line;
    }
    if (col === -2 || col >= cells.length) return line;
    const to = DEFECT_STATUS[cells[col].trim().toLowerCase()];
    if (!to) return line;
    cells[col] = cells[col].replace(cells[col].trim(), to);
    return cells.join('|');
  });
}

export function kebab(title) {
  const s = (title || '')
    .replace(/[<>`*_]/g, ' ')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return s.split('-').filter(Boolean).slice(0, 6).join('-').slice(0, 48).replace(/-+$/, '');
}

/** Builds the migration plan for one .team/ directory without touching it. */
export function plan(teamDir) {
  const read = (rel) => {
    try { return fs.readFileSync(path.join(teamDir, rel), 'utf8'); } catch { return null; }
  };
  const exists = (rel) => fs.existsSync(path.join(teamDir, rel));
  const actions = [];
  const notes = [];

  // 1. One slug per work item, taken from a per-item file that already exists, else from the first title found.
  const titles = new Map();
  const noteTitle = (id, title) => { if (title && !titles.has(id)) titles.set(id, title.trim()); };
  const texts = Object.fromEntries([...SPLIT.map((s) => s.file), 'TASKS.md', 'STATE.md'].map((f) => [f, read(f)]));
  for (const f of ['SPEC.md', 'PLAN.md', 'DESIGN.md', 'TASKS.md']) {
    if (texts[f] === null) continue;
    for (const s of sections(texts[f], 2)) {
      const m = s.heading.match(ITEM_HEADING);
      if (m) noteTitle(m[1], m[2]);
    }
  }
  if (texts['STATE.md'] !== null) {
    for (const s of sections(texts['STATE.md'], 3)) {
      const m = s.heading.match(STATE_HEADING);
      if (m) noteTitle(m[1], m[2]);
    }
  }
  const existingSlugs = new Map();
  for (const dir of ['requirements', 'system-design', 'frontend-design', 'qa', 'reports', 'archive']) {
    let names = [];
    try { names = fs.readdirSync(path.join(teamDir, dir)); } catch { /* folder not there yet */ }
    for (const n of names) {
      const m = n.replace(/\.md$/, '').match(/^(W-\d+)-[a-z0-9-]+$/);
      if (m && !existingSlugs.has(m[1])) existingSlugs.set(m[1], m[0]);
    }
  }
  const slugs = new Map();
  const slugOf = (id) => {
    if (!slugs.has(id)) slugs.set(id, existingSlugs.get(id) || `${id}-${kebab(titles.get(id)) || 'untitled'}`);
    return slugs.get(id);
  };
  const write = (dest, content, from) => actions.push(exists(dest)
    ? { op: 'keep', dest, from, why: 'destination exists' }
    : { op: 'write', dest, from, content });

  // 2. SPEC / PLAN / DESIGN: one file per work-item section.
  for (const spec of SPLIT) {
    const text = texts[spec.file];
    if (text === null) continue;
    let found = 0;
    for (const s of sections(text, 2)) {
      if (spec.file === 'DESIGN.md' && DESIGN_SYSTEM_HEADING.test(s.heading)) {
        const body = trimBlank(promote(s.body, 1));
        write('frontend-design/_system.md', [
          '# Design system', '',
          '> Owner: **team-designer**. Migrated from the "Design system" section of the old `.team/DESIGN.md`.', '',
          ...body, '',
        ].join('\n'), `${spec.file} § Design system`);
        continue;
      }
      const m = s.heading.match(ITEM_HEADING);
      if (!m) { notes.push(`${spec.file}: section "${s.heading.replace(/^#+\s*/, '')}" is not a work item and was left where it is`); continue; }
      found++;
      const [, id, title, status] = m;
      const slug = slugOf(id);
      write(`${spec.dir}/${slug}.md`, [
        `# ${id} — ${title || titles.get(id) || '<title>'} · ${spec.kind}`, '',
        `> Owner: **${spec.owner}**. Migrated from the ${id} section of the old \`.team/${spec.file}\`; the content is unchanged, headings were lifted one level.`, '',
        `**Status:** ${status || 'draft'}`, '',
        ...trimBlank(promote(s.body, 1)), '',
      ].join('\n'), `${spec.file} § ${id}`);
    }
    if (!found) notes.push(`${spec.file}: no work-item section found`);
  }

  // 3. TASKS: the QA subsection of each work item.
  if (texts['TASKS.md'] !== null) {
    for (const s of sections(texts['TASKS.md'], 2)) {
      const m = s.heading.match(ITEM_HEADING);
      if (!m) continue;
      const id = m[1];
      const subs = sections(['## x', ...s.body].join('\n'), 3);
      for (const q of subs) {
        const qm = q.heading.match(QA_HEADING);
        if (!qm) continue;
        const status = (qm[1] || '').toLowerCase();
        const verdict = status === 'passed' ? 'PASS' : status === 'failed' ? 'FAIL' : 'PENDING';
        const rounds = [...q.body.join('\n').matchAll(/\*\*R(\d+)\*\*/g)].map((r) => Number(r[1]));
        const round = rounds.length ? Math.max(...rounds) : 0;
        write(`qa/${slugOf(id)}.md`, [
          `Verdict: ${verdict} · Round ${round}`, '',
          `# ${id} — ${m[2] || titles.get(id) || '<title>'} · QA`, '',
          `> Owner: **team-qa**. Migrated from the QA subsection of ${id} in the old \`.team/TASKS.md\` (status there: ${status || 'none'}); headings were lifted two levels and defect statuses were translated (closed → verified, rejected → dropped, new/reopened → open, retest → fixed).`,
          '> The old defect IDs and the per-round execution log are kept as they were; a defect still `moved`, `deferred` or `design_question` needs a person to set it to `verified`, `dropped` or `open`. New findings continue as `Q-01`, `Q-02`… in a "Findings" table, and "Round detail" holds the latest round only.', '',
          ...translateDefectStatuses(trimBlank(promote(q.body, 2))), '',
        ].join('\n'), `TASKS.md § ${id} › QA`);
      }
    }
  }

  // 4. Whole files that have no place in the new layout: moved unchanged.
  const move = (from, dest) => actions.push(exists(dest)
    ? { op: 'keep', dest, from, why: 'destination exists' }
    : { op: 'move', dest, from });
  for (const f of LEGACY_WHOLE) if (exists(f)) move(f, `archive/legacy/${f}`);
  let archived = [];
  try { archived = fs.readdirSync(path.join(teamDir, 'archive'), { withFileTypes: true }); } catch { /* no archive */ }
  for (const e of archived) if (e.isFile() && OLD_ARCHIVE_FILE.test(e.name)) move(`archive/${e.name}`, `archive/legacy/${e.name}`);

  // 5. What the script leaves to people.
  const leftovers = SPLIT.map((s) => s.file).filter((f) => texts[f] !== null);
  if (leftovers.length) notes.push(`after checking the new files, delete the old ones yourself: ${leftovers.map((f) => '.team/' + f).join(', ')}`);
  if (actions.some((a) => a.dest.startsWith('qa/'))) notes.push('.team/TASKS.md still holds the QA subsections: remove them (pm) once qa/<slug>.md is checked');
  if (texts['STATE.md'] !== null && slugs.size) notes.push('.team/STATE.md is unchanged: the lead adds the slug of each open item — ' + [...slugs].map(([id, s]) => `${id} → ${s}`).join(', '));
  return { actions, notes, slugs: Object.fromEntries(slugs) };
}

/** Carries out a plan. Refuses to overwrite: `wx` for writes, an existence check for moves. */
export function apply(teamDir, actions) {
  for (const a of actions) {
    if (a.op === 'keep') continue;
    const dest = path.join(teamDir, a.dest);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    if (a.op === 'write') fs.writeFileSync(dest, a.content, { flag: 'wx' });
    if (a.op === 'move') {
      if (fs.existsSync(dest)) throw new Error(`refusing to overwrite ${a.dest}`);
      fs.renameSync(path.join(teamDir, a.from), dest);
    }
  }
}

function main() {
  const args = process.argv.slice(2);
  const doApply = args.includes('--apply');
  const dirAt = args.indexOf('--dir');
  const project = dirAt >= 0 ? path.resolve(args[dirAt + 1] || '.') : (process.env.CLAUDE_PROJECT_DIR || process.cwd());
  const teamDir = path.join(project, '.team');
  if (!fs.existsSync(teamDir)) {
    console.error(`no .team/ in ${project}: nothing to migrate`);
    process.exit(2);
  }
  const { actions, notes } = plan(teamDir);
  console.log(`team-migrate ${doApply ? '(apply)' : '(dry run)'} — ${teamDir}`);
  if (!actions.length) console.log('  nothing to migrate: no old-layout file found');
  for (const a of actions) {
    if (a.op === 'write') console.log(`  write  ${a.dest}   ← ${a.from}`);
    if (a.op === 'move') console.log(`  move   ${a.from} → ${a.dest}`);
    if (a.op === 'keep') console.log(`  keep   ${a.dest}   (${a.why}; ${a.from} not migrated again)`);
  }
  for (const n of notes) console.log(`  note   ${n}`);
  if (doApply) {
    apply(teamDir, actions);
    console.log(`done: ${actions.filter((a) => a.op === 'write').length} written, ${actions.filter((a) => a.op === 'move').length} moved, ${actions.filter((a) => a.op === 'keep').length} kept`);
  } else if (actions.some((a) => a.op !== 'keep')) {
    console.log('nothing was written. Re-run with --apply to carry this out.');
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) main();
