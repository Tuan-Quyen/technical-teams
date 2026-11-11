#!/usr/bin/env node
// technical-team guard: PreToolUse hook that enforces the team's permission table.
//
// It only acts on tool calls made by technical-team agents (identified by the
// `agent_type` field Claude Code adds to hook input inside subagents and in
// `--agent` sessions). Calls from your own main session, other plugins' agents
// or built-in agents pass through untouched.
//
// Enforced here (by configuration, not by prompt):
//   - write ownership: every project path has exactly one owner role
//   - Bash policy per role (allowlist / read-only / dangerous-command denylist)
//   - only the tech lead may spawn agents, and only team members or roster specialists
//   - specialist agent files may be written only by hr, only after the hire was
//     recorded as approved in .team/STATE.md
//   - a roster row only grants permissions when that hire is approved in STATE.md
//   - external agents (default: Explore) may be called by the lead and always run
//     read-only, wherever they are started from
//   - skills: an agent may load only `run-kit`, the plugin skills of its role (PLUGIN_SKILLS)
//     and the skills configured for its role in .claude/technical-team.json -> skills.<role>
//   - database/pipeline commands: only dba (or a specialist with Bash level `db-local`)
//     runs them, and only against a target proven to be local/test
//   - hire approval: any Write/Edit that ADDS a new "HIRE-APPROVED: <name>" line to
//     .team/STATE.md (from any session, including your main session) is turned into a
//     permission prompt. Your click on that prompt is the approval; a chat message,
//     relayed or not, only tells the lead to make the write.
//
// Decision: prints {"hookSpecificOutput":{"permissionDecision":"deny"|"ask",...}} and exits 0.
// No output means "no decision" and the normal permission flow continues.

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

export const PLUGIN = 'technical-team';
export const CORE = [
  'lead', 'ba', 'designer', 'architect', 'pm', 'developer', 'debugger',
  'qa', 'code-reviewer', 'security', 'devops', 'writer', 'hr', 'dba',
];
// Skills shipped with the plugin that a role may load on demand (besides run-kit),
// without listing them in .claude/technical-team.json.
export const PLUGIN_SKILLS = {
  qa: ['test-process', 'live-preview'],
  developer: ['live-preview'],
  designer: ['live-preview'],
  ba: ['business-analysis'],
};
const WRITE_TOOLS = new Set(['Write', 'Edit', 'MultiEdit', 'NotebookEdit']);
const AGENT_TOOLS = new Set(['Agent', 'Task']);
const SKILL_TOOLS = new Set(['Skill']);
const SPECIALIST_MARKER = 'technical-team:specialist';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PLUGIN_ROOT = process.env.CLAUDE_PLUGIN_ROOT || path.resolve(HERE, '..');
const BUNDLED = new Set(Object.keys((() => { try { return JSON.parse(fs.readFileSync(path.join(PLUGIN_ROOT, 'config', 'agents.json'), 'utf8')); } catch { return {}; } })()).filter((k) => !k.startsWith('$')));

// ---------------------------------------------------------------- helpers

// Team role for an agent type. Core roles and plugin specialists count only in
// their plugin-scoped form (technical-team:<role>): a bare "developer" from a
// project or user agent file is not the plugin's agent and is not a team member.
export function roleOf(agentType) {
  if (!agentType) return null;
  const t = String(agentType).trim();
  if (t.startsWith(PLUGIN + ':')) return t.slice(PLUGIN.length + 1);
  if (CORE.includes(t) || BUNDLED.has(t)) return '__not_team__:' + t;
  return t;
}

export function globToRegExp(glob) {
  let re = '';
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === '*') {
      if (glob[i + 1] === '*') {
        // "**/" matches zero or more directories; "**" alone matches anything
        if (glob[i + 2] === '/') { re += '(?:.*/)?'; i += 2; } else { re += '.*'; i += 1; }
      } else {
        re += '[^/]*';
      }
    } else if (c === '?') {
      re += '[^/]';
    } else if ('\\^$+.()|{}[]'.includes(c)) {
      re += '\\' + c;
    } else {
      re += c;
    }
  }
  return new RegExp('^' + re + '$', process.platform === 'win32' ? 'i' : '');
}

export function matchAny(rel, globs) {
  return (globs || []).some((g) => globToRegExp(g).test(rel));
}

function readText(p) {
  try { return fs.readFileSync(p, 'utf8'); } catch { return null; }
}

function readJson(p) {
  const t = readText(p);
  if (t == null) return null;
  try { return JSON.parse(t); } catch { return { __invalid: true }; }
}

export function loadMembers() {
  const m = readJson(path.join(PLUGIN_ROOT, 'config', 'agents.json')) || {};
  const out = {};
  for (const [k, v] of Object.entries(m)) if (!k.startsWith('$') && v && typeof v === 'object') out[k] = v;
  return out;
}

// True when the session works on the technical-team plugin repository itself:
// then `hire` adds specialists straight into the plugin (agents/, config/agents.json).
export function isPluginRepo(projectDir) {
  const m = readJson(path.join(projectDir, '.claude-plugin', 'plugin.json'));
  return !!(m && m.name === PLUGIN);
}

export function loadConfig(projectDir) {
  const base = readJson(path.join(PLUGIN_ROOT, 'config', 'ownership.json')) || {};
  const proj = readJson(path.join(projectDir, '.claude', 'technical-team.json')) || {};
  const extra = proj.paths || {};
  const cfg = {
    architecture: [...(base.architecture || []), ...(extra.architecture || [])],
    docs: [...(base.docs || []), ...(extra.docs || [])],
    relocated: base.relocated || {},
    infra: [...(base.infra || []), ...(extra.infra || [])],
    tests: [...(base.tests || []), ...(extra.tests || [])],
    data: [...(base.data || []), ...(extra.data || [])],
    commands: proj.commands || {},
    devopsAllowRemote: proj.devopsAllowRemote === true,
    db: {
      commands: (proj.db && proj.db.commands && proj.db.commands.length) ? proj.db.commands : (base.dbCommands || []),
      allowedHosts: (proj.db && proj.db.allowedHosts) || ['localhost', '127.0.0.1', '::1'],
      allowedDatabases: (proj.db && proj.db.allowedDatabases) || ['*_test', '*_dev', '*_local', 'test', 'dev', 'local'],
      envFile: (proj.db && proj.db.envFile) || null,
    },
    invalidProjectConfig: !!proj.__invalid,
    memberPaths: extra,
    externalAgents: Array.isArray(proj.externalAgents) ? proj.externalAgents : (base.externalAgents || []),
    skills: (proj.skills && typeof proj.skills === 'object') ? proj.skills : {},
    pluginRepo: isPluginRepo(projectDir),
  };
  return cfg;
}

// .team/ROSTER.md: markdown table. Columns are matched by header name.
// Required headers: Name, Write scope, Bash, Status.
export function parseRoster(text) {
  if (!text) return [];
  const rows = [];
  let header = null;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line.startsWith('|')) { header = null; continue; }
    const cells = line.replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
    if (cells.every((c) => /^:?-{2,}:?$/.test(c))) continue;
    const lower = cells.map((c) => c.toLowerCase());
    if (lower.includes('name') && lower.some((c) => c.startsWith('write scope'))) {
      header = lower;
      continue;
    }
    if (!header) continue;
    const get = (prefix) => {
      const i = header.findIndex((h) => h.startsWith(prefix));
      return i >= 0 ? (cells[i] || '') : '';
    };
    const name = get('name').replace(/`/g, '').trim();
    if (!name || name.startsWith('<')) continue;
    const scopeCell = get('write scope');
    const scope = scopeCell
      .split(/[,;]/)
      .map((s) => s.replace(/`/g, '').trim())
      .filter((s) => s && !/^(none|-|—|n\/a|read-only)$/i.test(s));
    rows.push({
      name: roleOf(name),
      scope,
      bash: (get('bash').replace(/`/g, '').trim().toLowerCase() || 'none'),
      status: get('status').replace(/`/g, '').trim().toLowerCase(),
    });
  }
  return rows;
}

// A roster row counts only if it is active AND the lead recorded the user's
// approval ("HIRE-APPROVED: <name>") in this project's .team/STATE.md.
function activeSpecialists(projectDir) {
  return parseRoster(readText(path.join(projectDir, '.team', 'ROSTER.md')))
    .filter((r) => r.status === 'active' && !CORE.includes(r.name) && hireApproved(projectDir, r.name));
}

function isMarkedSpecialist(projectDir, role) {
  const files = [
    path.join(projectDir, '.claude', 'agents', role + '.md'),
    path.join(os.homedir(), '.claude', 'agents', role + '.md'),
    path.join(PLUGIN_ROOT, 'agents', role + '.md'), // specialists bundled with the plugin
  ];
  return files.some((f) => (readText(f) || '').includes(SPECIALIST_MARKER));
}

// Names approved by "HIRE-APPROVED: <name>" lines in a text (lower-cased).
export function approvedNames(text) {
  const re = /^\s*[-*]?\s*HIRE-APPROVED:\s*`?([A-Za-z0-9._-]+)`?/gim;
  const out = [];
  let m;
  while ((m = re.exec(String(text || '')))) out.push(m[1].toLowerCase());
  return out;
}

export function hireApproved(projectDir, name) {
  const state = readText(path.join(projectDir, '.team', 'STATE.md')) || '';
  return approvedNames(state).includes(String(name).toLowerCase());
}

// The hire gate. Returns { ask: reason } when a Write/Edit/MultiEdit on the project's
// .team/STATE.md would add a HIRE-APPROVED line for a name not yet approved there.
// Applies to every session (team agents and your main session alike): approval is
// your click on the permission prompt, never a message that reached the lead.
export function hireApprovalAsk(input, env = process.env) {
  const tool = input && input.tool_name;
  if (!WRITE_TOOLS.has(tool)) return null;
  const ti = input.tool_input || {};
  const filePath = ti.file_path || ti.notebook_path || ti.path;
  if (!filePath) return null;
  const projectDir = env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();
  const rel = toRel(projectDir, path.resolve(input.cwd || projectDir, filePath));
  if (rel == null || !samePath(rel, '.team/STATE.md')) return null;
  const added = tool === 'Write' ? [ti.content]
    : tool === 'Edit' ? [ti.new_string]
    : tool === 'MultiEdit' ? (ti.edits || []).map((e) => e && e.new_string)
    : [ti.new_source];
  const text = added.filter((x) => typeof x === 'string').join('\n');
  const already = approvedNames(readText(path.join(projectDir, '.team', 'STATE.md')) || '');
  const fresh = [...new Set(approvedNames(text))].filter((n) => !already.includes(n));
  if (!fresh.length) return null;
  const lines = text.split(/\r?\n/).filter((l) => /HIRE-APPROVED:/i.test(l) && fresh.some((n) => l.toLowerCase().includes(n)));
  return {
    ask: `HIRE APPROVAL for ${fresh.join(', ')}. This write grants the specialist its roster permissions (write scope, Bash level). `
      + `Allow only if YOU approved this hire as proposed; deny otherwise. Line(s): ${lines.map((l) => l.trim()).join(' | ')}`,
  };
}

function samePath(a, b) {
  return process.platform === 'win32' ? a.toLowerCase() === b.toLowerCase() : a === b;
}

function toRel(projectDir, abs) {
  const rel = path.relative(projectDir, abs);
  if (!rel) return '';
  if (rel.startsWith('..') || path.isAbsolute(rel)) return null;
  return rel.split(path.sep).join('/');
}

// --------------------------------------------------------- write ownership

// Returns { owner, reason?, agentFile? } where owner is a role name,
// '__nobody__' (nobody may write) or 'hr-agent-file'.
export function ownerOf(rel, cfg, specialists, members = {}) {
  const base = rel.split('/').pop();

  // maintaining the technical-team plugin itself: hr adds specialists to the plugin
  if (cfg.pluginRepo) {
    const m = rel.match(/^agents\/([^/]+)\.md$/);
    if (m) return { owner: 'hr-agent-file', agentFile: m[1], scope: 'plugin' };
    if (rel === 'config/agents.json') return { owner: 'hr' };
  }

  // protected areas
  if (rel === '.git' || rel.startsWith('.git/')) return { owner: '__nobody__', reason: '.git/ is never written by the team' };
  const agentFile = rel.match(/^\.claude\/agents\/([^/]+)\.md$/);
  if (agentFile) return { owner: 'hr-agent-file', agentFile: agentFile[1] };
  if (rel === '.claude' || rel.startsWith('.claude/')) return { owner: '__nobody__', reason: '.claude/ (settings, team config, skills) is owned by you, not by the team' };
  if (/^\.env(\..+)?$/.test(base) && !/\.(example|sample|template)$/.test(base)) {
    return { owner: '__nobody__', reason: 'environment files may hold secrets; only *.example/*.sample/*.template variants are writable' };
  }

  // shared workspace
  const team = rel.match(/^\.team\/(?:archive\/)?([A-Z_]+)(?:-[^/]*)?\.md$/);
  if (team) {
    const map = { STATE: 'lead', SPEC: 'ba', PRODUCT: 'ba', DESIGN: 'designer', PLAN: 'architect', TASKS: 'pm', OPS_HANDOFF: 'devops', ROSTER: 'hr', ARCHITECTURE: 'architect' };
    // TASKS.md: pm owns the tickets, qa its `### QA` subsection per work item (sections are not guard-enforced)
    const shared = { TASKS: ['qa'] };
    if (map[team[1]]) return { owner: map[team[1]], also: shared[team[1]] || [] };
  }
  if (rel.startsWith('.team/adr/')) return { owner: 'architect' };
  if (rel.startsWith('.team/docs/')) return { owner: 'writer' };
  if (rel === '.team' || rel.startsWith('.team/')) return { owner: '__nobody__', reason: '.team/ only holds the owned files (STATE, SPEC, PRODUCT, DESIGN, PLAN, TASKS, OPS_HANDOFF, ROSTER, ARCHITECTURE), their archive/<FILE>-<period>.md copies, adr/ and docs/' };

  if (matchAny(rel, cfg.architecture)) return { owner: 'architect' };
  if (matchAny(rel, cfg.docs)) return { owner: 'writer' };
  // Team documents live in .team/; only README.md and CHANGELOG.md stay outside. Checked
  // after the lists above so a project can opt a path back out through paths.docs/architecture.
  for (const [pattern, target] of Object.entries(cfg.relocated)) {
    if (matchAny(rel, [pattern])) return { owner: '__nobody__', reason: `team documents live in .team/; write to ${target} instead (or add this path to paths.docs in .claude/technical-team.json)` };
  }
  if (matchAny(rel, cfg.infra)) return { owner: 'devops' };
  if (matchAny(rel, cfg.tests)) return { owner: 'qa' };
  if (matchAny(rel, cfg.data)) return { owner: 'dba' };
  for (const [name, m] of Object.entries(members)) {
    if (matchAny(rel, [...(m.write || []), ...((cfg.memberPaths || {})[name] || [])])) return { owner: name };
  }
  for (const s of specialists) if (matchAny(rel, s.scope)) return { owner: s.name };
  return { owner: 'developer' };
}

function checkWrite(ctx, filePath) {
  const { role, projectDir, cfg, specialists, toolName, isSpecialist } = ctx;
  if (!filePath) return null;
  const abs = path.resolve(ctx.cwd, filePath);

  // user-scope specialist files: ~/.claude/agents/<name>.md
  const userAgents = path.join(os.homedir(), '.claude', 'agents');
  if (samePath(path.dirname(abs), userAgents) && abs.toLowerCase().endsWith('.md')) {
    return checkAgentFile(ctx, path.basename(abs, '.md'), 'user');
  }

  const rel = toRel(projectDir, abs);
  if (rel === null) return `${role} may not write outside the project (${abs}).`;
  if (rel === '') return `${role} may not write the project root itself.`;

  const own = ownerOf(rel, cfg, specialists, ctx.members);
  if (own.owner === 'hr-agent-file') return checkAgentFile(ctx, own.agentFile, own.scope || 'project');
  if (own.owner === '__nobody__') return `${rel}: ${own.reason}.`;
  if (own.owner === role) return null;
  if (own.also && own.also.includes(role)) return null;

  // developer may repair existing tests broken by an intended behaviour change,
  // with Edit only (no new test files, no full overwrite).
  if (role === 'developer' && own.owner === 'qa') {
    const exists = fs.existsSync(abs);
    if (exists && (toolName === 'Edit' || toolName === 'MultiEdit')) return null;
    return `${rel} is a test file owned by qa. developer may only Edit an existing test that broke because intended behaviour changed; new tests are qa's job.`;
  }
  const who = isSpecialist ? `specialist ${role}` : role;
  return `${rel} is owned by ${own.owner}; ${who} may not write it. Report the needed change in your handoff instead.`;
}

function checkAgentFile(ctx, name, scope) {
  const { role, projectDir } = ctx;
  if (role !== 'hr') return `agent definitions are written only by hr after an approved hire.`;
  if (CORE.includes(name)) return `${name} is a core team agent; plugin agents are never written or replaced by hr.`;
  if (BUNDLED.has(name) && scope !== 'plugin') return `${name} is a plugin specialist; it is never replaced by a project or user agent file.`;
  if (!/^[a-z0-9][a-z0-9-]*$/.test(name)) return `specialist file name must be kebab-case: ${name}.md`;
  if (!hireApproved(projectDir, name)) {
    return `hire of "${name}" is not approved yet. The lead records "HIRE-APPROVED: ${name}" in .team/STATE.md only after the user approves the hire (scope: ${scope}).`;
  }
  return null;
}

// ------------------------------------------------------------- bash policy

function stripQuoted(cmd) {
  return cmd.replace(/'[^']*'/g, "''").replace(/"(?:\\.|[^"\\])*"/g, '""');
}

// split into simple commands on ; && || | & and newlines (quote-aware enough for policy)
export function segments(cmd) {
  const s = stripQuoted(cmd)
    .replace(/\$\(|`|<\(/g, ';')
    .replace(/\d*>&\d+/g, ' ') // 2>&1, >&2: stream merges, not file writes
    .replace(/&>>?/g, '>');     // &>file is a write to file
  return s.split(/\|\||&&|;|\||\n|&/).map((x) => x.trim()).filter(Boolean);
}

function words(seg) {
  const w = seg.split(/\s+/).filter(Boolean);
  while (w.length && /^[A-Za-z_][A-Za-z0-9_]*=/.test(w[0])) w.shift();
  while (w.length && ['command', 'exec', 'time', 'nice', 'nohup', 'env'].includes(w[0])) w.shift();
  return w;
}

function hasWriteRedirect(seg) {
  const s = seg
    .replace(/\d?>&\d/g, '')
    .replace(/&?\d?>>?\s*\/dev\/null/g, '')
    .replace(/\d?>>?\s*NUL\b/gi, '');
  return />/.test(s);
}

export function redirectTargets(cmd) {
  const s = stripQuoted(cmd).replace(/\d?>&\d/g, '');
  const out = [];
  const re = /(?:^|[^<])>>?\s*([^\s;&|<>]+)/g;
  let m;
  while ((m = re.exec(s))) if (m[1] !== '/dev/null' && m[1].toUpperCase() !== 'NUL') out.push(m[1]);
  const tee = /\btee\s+(?:-a\s+)?([^\s;&|<>]+)/g;
  while ((m = tee.exec(s))) out.push(m[1]);
  return out;
}

const GIT_MUTATING = new Set([
  'commit', 'push', 'reset', 'checkout', 'switch', 'merge', 'rebase', 'stash', 'clean',
  'add', 'rm', 'mv', 'restore', 'apply', 'am', 'cherry-pick', 'revert', 'tag', 'branch',
  'pull', 'fetch', 'init', 'clone', 'worktree', 'submodule', 'config', 'gc', 'prune', 'update-ref',
]);
const FILE_MUTATING = new Set([
  'rm', 'rmdir', 'mv', 'cp', 'mkdir', 'touch', 'chmod', 'chown', 'chgrp', 'ln', 'truncate',
  'dd', 'tee', 'install', 'unlink', 'shred', 'rsync', 'scp', 'patch', 'del', 'erase', 'rd',
  'move', 'copy', 'xcopy', 'robocopy', 'ren', 'Remove-Item', 'Set-Content', 'Out-File',
]);
const PKG_INSTALL = /^(npm|pnpm|yarn|bun)\s+(i|install|ci|add|remove|rm|uninstall|update|upgrade|up|link|audit\s+fix|dedupe|prune)\b|^(pip3?|uv\s+pip|pipx)\s+(install|uninstall)\b|^(uv)\s+(add|remove|sync)\b|^poetry\s+(add|remove|install|update)\b|^(apt|apt-get|yum|dnf|apk|brew|choco|winget|scoop)\s+(install|remove|upgrade|update|uninstall)\b|^(cargo|go|gem|composer|dotnet)\s+(install|add|remove|get|require|update)\b/;

const REMOTE_MUTATING = [
  /^docker\s+(push|login|logout)\b/,
  /^docker\s+(image|container|volume|network|system)\s+(rm|prune)\b/,
  /^docker\s+(rm|rmi)\b/,
  /^kubectl\s+(apply|create|delete|replace|patch|scale|rollout|drain|cordon|uncordon|edit|set|label|annotate|expose|run)\b/,
  /^helm\s+(install|upgrade|uninstall|delete|rollback)\b/,
  /^terraform\s+(apply|destroy|import|taint|untaint|state)\b/,
  /^tofu\s+(apply|destroy|import)\b/,
  /^pulumi\s+(up|destroy|import)\b/,
  /^(gcloud|aws|az|fly|flyctl|vercel|netlify|heroku|railway)\b.*\b(deploy|delete|create|update|destroy|apply|put|set)\b/,
];

function universalDenials(w, segRaw, fullCmd) {
  const cmd = w[0] || '';
  if (['sudo', 'su', 'doas', 'runas'].includes(cmd)) return 'privilege escalation is not allowed for team agents';
  if (cmd === 'git' && ['commit', 'push'].includes(w[1])) return 'the team never commits or pushes; the user decides when to commit';
  if (cmd === 'git' && w[1] === 'reset' && w.includes('--hard')) return 'git reset --hard destroys uncommitted work';
  if (cmd === 'git' && w[1] === 'clean') return 'git clean deletes untracked files';
  if (cmd === 'git' && (w[1] === 'checkout' || w[1] === 'restore') && (w.includes('--') || w.includes('.'))) return 'discarding working-tree changes is not allowed';
  if (cmd === 'gh' && ['pr', 'release'].includes(w[1]) && ['create', 'merge', 'edit', 'close', 'delete'].includes(w[2])) return 'opening or changing PRs/releases is the user\'s call';
  if (/\b(curl|wget|iwr|Invoke-WebRequest)\b[^|]*\|\s*(sh|bash|zsh|pwsh|powershell|iex|python3?|node)\b/.test(fullCmd)) return 'piping downloads into a shell is not allowed';
  if (cmd === 'rm' && w.some((a) => /^-\w*[rR]/.test(a)) && w.some((a) => /^(\/|~|\$HOME|\.\.|\.|\*|[A-Za-z]:\\?)$|^\.git\b|^\.team\b|^\.claude\b/.test(a))) return 'recursive delete of root, home, parent, .git, .team or .claude is blocked';
  return null;
}

function readOnlyDenials(w, seg) {
  const cmd = w[0] || '';
  if (hasWriteRedirect(seg)) return 'output redirection writes files; this role is read-only';
  if (FILE_MUTATING.has(cmd)) return `${cmd} modifies files; this role is read-only`;
  if ((cmd === 'sed' || cmd === 'perl') && w.some((a) => /^-[a-zA-Z]*i/.test(a))) return 'in-place edit; this role is read-only';
  if (cmd === 'git' && GIT_MUTATING.has(w[1])) return `git ${w[1]} changes the repository; this role uses git read-only`;
  if (cmd === 'find' && w.some((a) => ['-delete', '-exec', '-execdir', '-ok'].includes(a))) return 'find -delete/-exec is not read-only';
  if (cmd === 'xargs') return 'xargs can run arbitrary mutations; run the command directly';
  if (PKG_INSTALL.test(w.join(' '))) return 'installing or changing dependencies is not read-only; report the need instead';
  if (REMOTE_MUTATING.some((r) => r.test(w.join(' ')))) return 'this command changes remote or runtime infrastructure';
  return null;
}

const SAFE_READ = /^(cd|pushd|popd|ls|dir|cat|type|head|tail|wc|grep|rg|ag|find|fd|pwd|echo|printf|which|where|whoami|date|tree|stat|file|du|df|env|printenv|sort|uniq|cut|tr|awk|jq|yq|diff|cmp|basename|dirname|realpath|readlink|test|true|false|\[)$/;

function startsWithAny(seg, list) {
  const s = seg.trim();
  return (list || []).some((p) => p && (s === p || s.startsWith(p + ' ') || (/[:=/]$/.test(p) && s.startsWith(p))));
}

function gitReadOnly(w, subs) {
  return w[0] === 'git' && subs.includes(w[1]) && !w.some((a) => a.startsWith('--output'));
}

function isInitScript(seg) {
  if (/[|><&;`]|\$\(/.test(seg)) return false;
  const norm = (x) => {
    const v = x.replace(/\\/g, '/').replace(/["']/g, '');
    return process.platform === 'win32' ? v.toLowerCase() : v;
  };
  const script = norm(path.join(PLUGIN_ROOT, 'scripts', 'team-init.mjs'));
  const w = norm(seg).split(/\s+/);
  return w[0] === 'node' && w[1] === script;
}

// ------------------------------------------------------------ database policy

const SQL_CLIENTS = new Set(['psql', 'mysql', 'mariadb', 'sqlite3', 'mongosh', 'mongo', 'sqlcmd', 'cqlsh', 'redis-cli']);
const NON_LOCAL_WORDS = /\b(prod|production|prd|staging|stage|stg|live|uat|preprod)\b/i;
const TUNNEL = /^(ssh|autossh|socat|cloud-sql-proxy|cloud_sql_proxy|flyctl\s+proxy|fly\s+proxy)\b|^kubectl\s+port-forward\b|^gcloud\s+sql\s+connect\b|^aws\s+ssm\s+start-session\b|^az\s+postgres\s+flexible-server\s+connect\b/;
const DB_URL = /\b(?:jdbc:)?(postgres(?:ql)?|mysql|mariadb|mongodb(?:\+srv)?|sqlserver|mssql|redis|rediss|cockroachdb):\/\/[^\s'"`]+/gi;

function isDbCommand(seg, cfg) {
  const w = words(seg);
  return SQL_CLIENTS.has(w[0]) || startsWithAny(w.join(' '), cfg.db.commands);
}

function hostAllowed(host, cfg) {
  const h = String(host || '').replace(/^\[|\]$/g, '').toLowerCase();
  return cfg.db.allowedHosts.some((p) => globToRegExp(String(p).toLowerCase()).test(h));
}

function dbAllowed(name, cfg) {
  const n = String(name || '').toLowerCase();
  return !!n && cfg.db.allowedDatabases.some((p) => globToRegExp(String(p).toLowerCase()).test(n));
}

function checkUrl(raw, cfg) {
  let u;
  try { u = new URL(raw.replace(/^jdbc:/i, '')); } catch { return `cannot parse database URL ${raw.replace(/\/\/[^@/]*@/, '//***@')}`; }
  const db = decodeURIComponent((u.pathname || '').replace(/^\//, '').split('/')[0]);
  if (!hostAllowed(u.hostname, cfg)) return `database host "${u.hostname}" is not in db.allowedHosts (${cfg.db.allowedHosts.join(', ')})`;
  if (!dbAllowed(db, cfg)) return `database "${db || '(none)'}" does not match db.allowedDatabases (${cfg.db.allowedDatabases.join(', ')})`;
  return null;
}

function flagValue(w, names) {
  for (let i = 0; i < w.length; i++) {
    for (const n of names) {
      if (w[i] === n && w[i + 1]) return w[i + 1];
      if (n.startsWith('--') && w[i].startsWith(n + '=')) return w[i].slice(n.length + 1);
      if (!n.startsWith('--') && w[i].startsWith(n) && w[i].length > n.length) return w[i].slice(n.length);
    }
  }
  return null;
}

function envFileUrl(projectDir, cfg) {
  if (!cfg.db.envFile) return null;
  const text = readText(path.join(projectDir, cfg.db.envFile));
  if (!text) return null;
  const m = text.match(/^\s*(?:export\s+)?[A-Z0-9_]*(?:DATABASE_URL|DB_URL|DSN)\s*=\s*["']?([^"'\s#]+)/m);
  return m ? m[1] : null;
}

// Returns a denial reason, or null when the DB command provably targets a local/test database.
export function checkDbTarget(seg, rawCmd, cfg, projectDir) {
  const w = words(seg);
  if (NON_LOCAL_WORDS.test(rawCmd)) return 'the command mentions a non-local environment (prod/staging/live/...)';
  if (/\$\{?[A-Za-z_]|\$\(/.test(rawCmd)) return 'the database target uses a shell variable the guard cannot resolve; write the local URL or host explicitly';

  if (SQL_CLIENTS.has(w[0])) {
    if (/(^|\s)<\s*\S/.test(rawCmd) || flagValue(w, ['-f', '--file'])) return 'running SQL files through a client is not allowed; use the migration tool';
    const sql = (rawCmd.match(/(?:\s-c|\s--command|\s-e|\s--execute|\s--eval)\s*=?\s*(['"])([\s\S]*?)\1/) || [])[2];
    if (sql == null) return `${w[0]} must be used non-interactively with -c/-e and a read-only statement`;
    for (const stmt of sql.split(';').map((x) => x.trim()).filter(Boolean)) {
      if (/^explain\b/i.test(stmt) && /\banaly[sz]e\b/i.test(stmt) && /\b(insert|update|delete|merge|truncate|alter|drop|create)\b/i.test(stmt)) {
        return 'EXPLAIN ANALYZE executes the statement; not allowed for writes';
      }
      if (!/^(explain|show|describe|desc)\b|^\\d|^select\b[\s\S]*\bfrom\s+(information_schema|pg_catalog|sys|mysql)\./i.test(stmt)) {
        return `only EXPLAIN / SHOW / DESCRIBE / \\d and catalog SELECTs are allowed through ${w[0]} (got: ${stmt.slice(0, 60)})`;
      }
    }
  }

  const urls = rawCmd.match(DB_URL) || [];
  for (const u of urls) { const r = checkUrl(u, cfg); if (r) return r; }
  if (urls.length) return null;

  const host = flagValue(w, ['-h', '--host', '--hostname', '-H', '-S', '--server']);
  if (host) {
    if (!hostAllowed(host.split(':')[0].split(',')[0], cfg)) return `database host "${host}" is not in db.allowedHosts (${cfg.db.allowedHosts.join(', ')})`;
    const db = flagValue(w, ['-d', '--dbname', '--database', '-D']) || (SQL_CLIENTS.has(w[0]) ? null : 'n/a');
    if (db !== 'n/a' && !dbAllowed(db, cfg)) return `name a local/test database explicitly (-d/--database) matching db.allowedDatabases`;
    return null;
  }

  const fromEnv = envFileUrl(projectDir, cfg);
  if (fromEnv) return checkUrl(fromEnv, cfg);
  return 'the database target is not visible to the guard. Put the local URL in the command (DATABASE_URL=postgres://...@localhost/app_test ...), pass --host/-d, or set db.envFile in .claude/technical-team.json to the env file your tool reads';
}

function checkBash(ctx, command) {
  const { role, cfg, projectDir, specialist, member } = ctx;
  const cmd = String(command || '');
  if (!cmd.trim()) return null;
  // the original command (quotes intact) is used for the init-script check
  const rawSegs = cmd.split(/\|\||&&|;|\n/).map((x) => x.trim()).filter(Boolean);
  if (rawSegs.length === 1 && isInitScript(rawSegs[0]) && ['lead'].includes(role)) return null;

  const segs = segments(cmd);
  const FILTERS = /^(head|tail|wc|grep|sort|uniq|cut)$/;

  const bashLevel = (() => {
    if (member) return member.bash || 'none';
    if (specialist) return specialist.bash; // none | readonly | developer | db-local
    return {
      lead: 'lead', 'code-reviewer': 'code-reviewer', debugger: 'readonly', security: 'security',
      qa: 'qa', developer: 'developer', devops: 'devops', dba: 'db-local',
    }[role] || 'none';
  })();

  if (bashLevel === 'none') return `${role} has no shell access.`;
  const dbOwnerActive = specialistsWithDb(ctx).length > 0;
  const rawSegs2 = cmd.split(/\|\||&&|;|\n/).map((x) => x.trim()).filter(Boolean);

  for (const seg of segs) {
    const w = words(seg);
    if (!w.length) continue;
    const u = universalDenials(w, seg, cmd);
    if (u) return u + '.';

    if (bashLevel === 'db-local') {
      if (TUNNEL.test(w.join(' '))) return 'tunnels and port-forwards to databases are not allowed.';
      if (isDbCommand(seg, cfg)) {
        const raw = rawSegs2.find((r) => r.includes(w[0])) || cmd;
        const r = checkDbTarget(seg, raw, cfg, projectDir);
        if (r) return `DB command blocked: ${r}.`;
        continue;
      }
      const r = readOnlyDenials(w, seg);
      if (r) return r + '.';
      continue;
    }
    if (dbOwnerActive && isDbCommand(seg, cfg)) {
      return `database, migration and pipeline commands are run only by dba (and db-local specialists) in this project (${specialistsWithDb(ctx).map((s) => s.name).join(', ')}). Hand the migration or DB check over instead.`;
    }

    switch (bashLevel) {
      case 'lead':
        if (hasWriteRedirect(seg)) return 'lead may only inspect git state (no redirection).';
        if (gitReadOnly(w, ['status', 'diff']) || FILTERS.test(w[0])) break;
        return 'lead may only run `git status` and `git diff` (plus read-only filters like head/grep). Delegate everything else.';
      case 'code-reviewer':
        if (hasWriteRedirect(seg)) return 'code-reviewer is read-only (no redirection).';
        if (gitReadOnly(w, ['diff', 'log']) || FILTERS.test(w[0])) break;
        return 'code-reviewer may only run `git diff` and `git log`. Use Read/Grep/Glob for everything else.';
      case 'security': {
        const r = readOnlyDenials(w, seg);
        if (r) return r + '.';
        break;
      }
      case 'readonly': {
        const r = readOnlyDenials(w, seg);
        if (r) return r + '.';
        break;
      }
      case 'qa': {
        // commands.run lets qa start the app for the live preview (skill live-preview)
        const tests = [...(cfg.commands.test || []), ...(cfg.commands.run || [])];
        if (tests.length) {
          if (startsWithAny(seg, tests) || SAFE_READ.test(w[0]) || gitReadOnly(w, ['status', 'diff', 'log', 'show'])) {
            if (hasWriteRedirect(seg)) return 'qa: write test output through the test runner, not shell redirection.';
            break;
          }
          return `qa may only run the project's test and run commands (${tests.join(', ')}) and read-only inspection commands.`;
        }
        const r = readOnlyDenials(w, seg);
        if (r) return `qa (no test allowlist configured): ${r}.`;
        break;
      }
      case 'developer': {
        if (REMOTE_MUTATING.some((r) => r.test(w.join(' ')))) return 'remote/infrastructure changes belong to devops and to you, not the developer.';
        const allow = [...(cfg.commands.build || []), ...(cfg.commands.lint || []), ...(cfg.commands.test || []), ...(cfg.commands.run || [])];
        if (allow.length && !(startsWithAny(seg, allow) || SAFE_READ.test(w[0]) || gitReadOnly(w, ['status', 'diff', 'log', 'show', 'blame']))) {
          return `developer may only run the project's build/lint/test/run commands (${allow.join(', ')}) and read-only inspection commands.`;
        }
        break;
      }
      case 'devops': {
        if (!cfg.devopsAllowRemote && REMOTE_MUTATING.some((r) => r.test(w.join(' ')))) {
          return 'devops prepares and verifies infrastructure locally; pushing images, applying manifests and deploying are run by you (or enable devopsAllowRemote in .claude/technical-team.json).';
        }
        const allow = cfg.commands.infra || [];
        if (allow.length && !(startsWithAny(seg, allow) || SAFE_READ.test(w[0]) || gitReadOnly(w, ['status', 'diff', 'log', 'show']))) {
          return `devops may only run the configured infra commands (${allow.join(', ')}) and read-only inspection commands.`;
        }
        break;
      }
      default:
        return `${role} has no shell access.`;
    }
  }

  // writers through the shell: check redirect / tee targets against ownership
  for (const t of redirectTargets(cmd)) {
    const reason = checkWrite({ ...ctx, toolName: 'Write' }, t.replace(/^["']|["']$/g, ''));
    if (reason) return `shell write blocked: ${reason}`;
  }
  return null;
}

function specialistsWithDb(ctx) {
  const members = Object.entries(ctx.members || {}).filter(([, m]) => m.bash === 'db-local').map(([name]) => ({ name }));
  return [{ name: 'dba' }, ...members, ...ctx.specialists.filter((s) => s.bash === 'db-local')];
}

// ------------------------------------------------------------ agent spawn

function checkAgentSpawn(ctx, input) {
  const { role, specialists } = ctx;
  if (role !== 'lead') return `${role} cannot delegate; only the tech lead assigns work.`;
  const target = roleOf(input && input.subagent_type);
  if (!target) return 'lead must name a team member (subagent_type) when delegating.';
  if (target === 'lead') return 'lead does not spawn another lead.';
  if (target.startsWith('__not_team__:')) return `"${input.subagent_type}" is not the plugin's agent. Core roles and plugin specialists are called only as technical-team:<name>; plugin agents are never replaced by project or user agent files.`;
  if (CORE.includes(target)) return null;
  if (ctx.members && ctx.members[target]) return null;
  if ((ctx.cfg.externalAgents || []).includes(target)) return null;
  if (specialists.some((s) => s.name === target)) return null;
  return `"${input.subagent_type}" is not on the team. Delegate to a core member or an active specialist from .team/ROSTER.md; if the skill is missing, propose a hire through hr.`;
}

// ------------------------------------------------------------------ skills

export function skillName(input) {
  const raw = input && (input.skill || input.skill_name || input.skillName || input.name || input.command);
  return String(raw || '').trim().replace(/^\//, '').split(/\s+/)[0];
}

function checkSkill(ctx, input) {
  const { role, cfg } = ctx;
  const name = skillName(input);
  if (!name) return 'the guard could not read which skill is being loaded; name it explicitly.';
  if (name === 'run-kit' || name === `${PLUGIN}:run-kit`) return null;
  for (const s of PLUGIN_SKILLS[role] || []) if (name === s || name === `${PLUGIN}:${s}`) return null;
  const list = Array.isArray(cfg.skills[role]) ? cfg.skills[role] : [];
  if (list.includes(name)) return null;
  return `${role} may load only run-kit and the skills listed for it in .claude/technical-team.json -> skills.${role} (${list.length ? list.join(', ') : 'none configured'}). "${name}" is not on that list.`;
}

// ------------------------------------------------------------------ main

// Which kind of technical-team agent produced this hook input, if any:
// 'lead' | 'member' (core role or permanent member) | 'specialist' | null.
export function teamAgentKind(input, env = process.env) {
  const role = roleOf(input && input.agent_type);
  if (!role) return null;
  if (role === 'lead') return 'lead';
  if (CORE.includes(role) || loadMembers()[role]) return 'member';
  const projectDir = env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();
  if (activeSpecialists(projectDir).some((s) => s.name === role) || isMarkedSpecialist(projectDir, role)) return 'specialist';
  return null;
}

// Returns null (no decision), a deny reason (string) or { ask: reason }.
export function decide(input, env = process.env) {
  const deny = decideDeny(input, env);
  if (deny) return deny;
  return hireApprovalAsk(input, env);
}

function decideDeny(input, env = process.env) {
  const role = roleOf(input.agent_type);
  if (!role) return null; // your own main session: not restricted by the team guard
  if (role.startsWith('__not_team__:')) return null; // not the plugin's agent
  const projectDir = env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();
  const isCore = CORE.includes(role);
  const members = loadMembers();
  const member = isCore ? null : (members[role] || null);
  const specialists = activeSpecialists(projectDir).filter((s) => !members[s.name]);
  const specialist = (isCore || member) ? null : (specialists.find((s) => s.name === role)
    || (isMarkedSpecialist(projectDir, role) ? { name: role, scope: [], bash: 'none', status: 'unlisted' } : null));
  const cfg = loadConfig(projectDir);
  const external = !isCore && !member && !specialist && cfg.externalAgents.includes(role);
  if (!isCore && !member && !specialist && !external) return null; // not a technical-team agent
  const ctx = {
    role, projectDir, cfg, specialists, members, member,
    // external agents run with the read-only specialist policy
    specialist: external ? { name: role, scope: [], bash: 'readonly', status: 'external' } : specialist,
    external,
    isSpecialist: !!specialist || external,
    cwd: input.cwd || projectDir,
    toolName: input.tool_name,
  };
  const tool = input.tool_name;
  const ti = input.tool_input || {};

  if (cfg.invalidProjectConfig && (WRITE_TOOLS.has(tool) || tool === 'Bash')) {
    return '.claude/technical-team.json is not valid JSON; fix it before the team writes or runs commands.';
  }
  if (WRITE_TOOLS.has(tool)) return checkWrite(ctx, ti.file_path || ti.notebook_path || ti.path);
  if (tool === 'Bash') return checkBash(ctx, ti.command);
  if (AGENT_TOOLS.has(tool)) return checkAgentSpawn(ctx, ti);
  if (SKILL_TOOLS.has(tool)) return external ? null : checkSkill(ctx, ti);
  return null;
}

async function main() {
  let raw = '';
  for await (const chunk of process.stdin) raw += chunk;
  let input;
  try { input = JSON.parse(raw); } catch { return; }
  let reason;
  try {
    reason = decide(input);
  } catch (err) {
    // A guard bug must not silently open the gate for team agents.
    if (roleOf(input.agent_type)) reason = `technical-team guard error: ${err && err.message}. Blocking to stay safe.`;
  }
  if (reason) {
    const ask = typeof reason === 'object' && reason.ask;
    process.stdout.write(JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: ask ? 'ask' : 'deny',
        permissionDecisionReason: `[technical-team guard] ${ask || reason}`,
      },
    }));
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
