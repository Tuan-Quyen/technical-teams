// Runs plugins/team/workflows/build-loop.js for real, with fake agent/parallel/pipeline/phase/log, and checks the QA
// lifecycle: pre-check before the first developer; qa execution after a review PASS that reuses the plan; profiles and
// their report minimum; the item's QA-Fix round (canonical in STATE.md, passed as args.state) and its human approval
// gate; the shared finding tracker (stable bug IDs, duplicate candidates, lifecycle); and that inline text = workflow text.
// Run from the repo root: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), 'plugins/team');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8').replace(/\r\n/g, '\n');
const kitAll = () => ['SKILL.md', 'references/qa-loop.md', 'references/workspace.md', 'references/workflow.md'].map((f) => read(`skills/run-kit/${f}`)).join('\n');
const SRC = read('workflows/build-loop.js');
const BODY = SRC.replace(/^export const meta/m, 'const meta');
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

const constant = (name) => {
  const m = SRC.match(new RegExp(`^const ${name} = ("(?:[^"\\\\]|\\\\.)*"|'(?:[^'\\\\]|\\\\.)*')$`, 'm'));
  assert.ok(m, `build-loop.js defines ${name} as one string literal`);
  return new Function(`return ${m[1]}`)();
};
const LINES = Object.fromEntries(['QA_PRECHECK', 'QA_EXEC_FIRST', 'QA_EXEC_RETEST', 'QA_ROUNDS', 'QA_PROFILE', 'TRACKER_RULE', 'DEV_RTM'].map((n) => [n, constant(n)]));
const { QA_PRECHECK, QA_EXEC_FIRST, QA_EXEC_RETEST, QA_PROFILE, DEV_RTM } = LINES;
const list = (name) => new Function(`return ${SRC.match(new RegExp(`^const ${name} = (\\[.*\\])$`, 'm'))[1]}`)();

// ---- fakes ----
const REPORT_KEYS = ['profileReason', 'plannedScope', 'executedScope', 'deviations', 'changedBehaviour', 'tests', 'smoke', 'acs', 'checklist', 'happyPath', 'negativePaths', 'integration', 'regression', 'testPlan', 'rtm', 'boundaries', 'e2e', 'exploratorySession', 'expandedRegression'];
const fullReport = (o = {}) => ({ ...Object.fromEntries(REPORT_KEYS.map((k) => [k, `ran: ${k}`])), exploratory: 'none', expansion: '', ...o });
const isQa = (label) => label === 'qa' || label === 'qa:pre-check';
const ok = (label, extra = {}) => ({
  status: 'done', verdict: /^(review:|qa$)/.test(label) ? 'PASS' : 'none', findings: [], handoff: `handoff ${label}`,
  ...(isQa(label) ? { profile: 'T1', report: fullReport() } : {}), ...extra,
});
// A qa finding with every blocking field filled; o overrides any of them.
const finding = (id, file, blocking = true, o = {}) => ({
  id, severity: 'major', blocking, file, line: 1, title: `${id} title`, trackerId: '', result: 'new', basis: 'ac-violation',
  steps: '1. open 2. click', expected: 'saved (AC-1)', actual: 'error 500', evidence: 'log line 12', violates: 'AC-1', impact: 'user loses the form', why: 'core flow broken', ...o,
});
const roundIn = (prompt) => Number((prompt.match(/QA-Fix round of this item: (\d+) of/) || [])[1]);
const rowsIn = (prompt) => [...prompt.matchAll(/^(DEMO-B\d+) ([A-Z_]+) (\w+) (\S+):(\d+) (.*)$/gm)].map((m) => ({ id: m[1], status: m[2], file: m[4], line: Number(m[5]), title: m[6] }));

// respond(call, calls) → a result, null (agent died) or undefined (default). Gate results get every pending
// FIXED_PENDING_RETEST row of their brief added as `verified` unless the result sets noAuto; qa gets its round echoed.
const run = async (args, respond = () => undefined) => {
  const calls = [];
  const logs = [];
  const phases = [];
  const agent = async (prompt, opts = {}) => {
    const call = { label: opts.label, phase: opts.phase, agentType: opts.agentType, prompt };
    calls.push(call);
    let r = respond(call, calls);
    if (r === undefined) {
      if (opts.label.startsWith('state-witness')) return WITNESS_NONE;
      if (opts.label.startsWith('verify ')) return { refuted: false, reason: 'real' };
      if (opts.label.startsWith('compare ')) return { same: false, reason: 'different behaviour' };
      r = ok(opts.label);
    }
    if (r && (opts.label === 'qa' || opts.label.startsWith('review:'))) {
      const pending = rowsIn(prompt).filter((e) => e.status === 'FIXED_PENDING_RETEST' && !r.findings.some((f) => f.trackerId === e.id));
      if (!r.noAuto) r = { ...r, findings: [...r.findings, ...pending.map((e) => finding(`V-${e.id}`, e.file, false, { trackerId: e.id, result: 'verified', title: e.title, line: e.line, severity: 'minor' }))] };
    }
    if (r && isQa(opts.label) && r.reportFixRounds === undefined) r = { ...r, reportFixRounds: roundIn(prompt) };
    if (r && isQa(opts.label) && r.previousFixRounds === undefined) r = { ...r, previousFixRounds: -1 };
    return r;
  };
  const parallel = async (fns) => Promise.all(fns.map((f) => f()));
  const pipeline = async (items, ...stages) => Promise.all(items.map(async (item) => {
    let v = await stages[0](item);
    for (const s of stages.slice(1)) v = await s(v, item);
    return v;
  }));
  const fn = new AsyncFunction('agent', 'parallel', 'pipeline', 'phase', 'log', 'args', 'budget', 'workflow', BODY);
  const result = await fn(agent, parallel, pipeline, (p) => phases.push(p), (m) => logs.push(m), args, undefined, undefined);
  // the read-only state witness runs first on every call (asserted below); labels and calls list the other agents
  const work = calls.filter((c) => !c.label.startsWith('state-witness'));
  return { result, calls: work, labels: work.map((c) => c.label), witness: calls.filter((c) => c.label.startsWith('state-witness')), logs, phases };
};

// The read-only state witness, by default: the files show nothing beyond the state passed in.
const WITNESS_NONE = { qaMdRound: -1, findingsMaxRound: -1, findingsLastId: -1, stateRound: -1, gitMaxRound: -1, stateReviewFixes: -1, findingsEntries: [], stateItems: [], notes: '' };
const ticket = (id, file) => ({ ticket: id, role: 'developer', brief: `brief ${id}`, files: [file] });
// approvals and cap are no longer state: the positional slots stay so old call sites read the same, and are dropped.
const state = (fixRounds = 0, _approvals = [], item = 'demo', _cap = 3, o = {}) => ({ item, key: 'DEMO', fixRounds, reviewFixes: 0, ...o });
const maxF = (t) => Math.max(0, ...t.map((e) => Number(String(e.id).split('-B')[1]) || 0));
const base = (o = {}) => {
  const a = {
  slug: 'demo',
    groups: [[ticket('T-1', 'src/a.js')]],
    reviewBriefs: { 'code-reviewer': 'review brief' },
    qaPlanBrief: 'qa plan brief',
    qaBrief: 'qa exec brief',
    state: state(),
    tracker: [],
    ...o,
  };
  // a used round always has a qa finding behind it; lastId mirrors the tracker unless a test sets it
  if (a.state && a.state.fixRounds > 0 && !o.tracker) a.tracker = [{ id: 'DEMO-B1', origin: 'QA', sourceId: 'Q-00', status: 'REOPENED', severity: 'major', title: 'DEMO-B1 title', file: 'src/a.js', line: 1, history: [] }];
  if (a.state && a.state.lastId === undefined && Array.isArray(a.tracker)) a.state = { ...a.state, lastId: maxF(a.tracker) };
  return a;
};
const isDev = (l) => /^(developer|dba|devops):/.test(l);
const count = (labels, l) => labels.filter((x) => x === l).length;
const qaFail = (...fs_) => ok('qa', { verdict: 'FAIL', findings: fs_ });
// qa keeps failing: the known open bug IDs of its brief come back as `failing`, else one new finding.
const qaKeepsFailing = (f = finding('Q-01', 'src/a.js')) => (c) => {
  if (c.label !== 'qa') return undefined;
  const known = rowsIn(c.prompt).filter((e) => e.status !== 'VERIFIED');
  return qaFail(...(known.length ? known.map((e) => ({ ...f, trackerId: e.id, result: 'failing' })) : [f]));
};
const onQa = (fn) => { let n = 0; return (c) => (c.label === 'qa' ? fn(++n, c) : undefined); };
const entry = (id, o = {}) => ({ id, origin: 'QA', sourceId: 'Q-01', status: 'OPEN', severity: 'major', title: `${id} title`, file: 'src/a.js', line: 1, history: [], ...o });
const approval = (round, o = {}) => ({ item: 'demo', round, scope: 'DEMO-B1 in src/a.js', reason: 'checkout still fails', userReply: `approve demo round ${round}`, ...o });

// ---- pipeline order ----

test('qa pre-check runs before the first developer, in the Plan phase, then review, then qa execution', async () => {
  const { result, calls, labels, phases } = await run(base({ groups: [[ticket('T-1', 'src/a.js'), ticket('T-2', 'src/b.js')], [ticket('T-3', 'src/c.js')]] }));
  assert.equal(result.status, 'done');
  assert.equal(labels[0], 'qa:pre-check', 'first spawn is the qa pre-check');
  assert.equal(calls[0].phase, 'Plan');
  assert.equal(calls[0].agentType, 'technical-team:team-qa', 'pre-check reuses team-qa, no new agent');
  assert.ok(calls[0].prompt.startsWith('qa plan brief') && calls[0].prompt.includes(QA_PRECHECK));
  assert.deepEqual(phases.slice(0, 3), ['State', 'Plan', 'Build'], 'the state witness runs before anything else');
  const firstDev = labels.findIndex(isDev);
  assert.ok(firstDev > 0 && labels.indexOf('review:code-reviewer') > firstDev && labels.indexOf('qa') > labels.indexOf('review:code-reviewer'), `order: ${labels.join(' → ')}`);
  for (const c of calls.filter((x) => isDev(x.label))) assert.ok(c.prompt.includes(DEV_RTM.replace('<slug>', 'demo')), `${c.label}: brief carries the RTM line`);
  assert.equal(result.plan.profile, 'T1');
  assert.ok(calls.find((c) => c.label === 'qa').prompt.includes(QA_PROFILE.replace('<profile>', 'T1')));
  assert.deepEqual(result.state, { item: 'demo', key: 'DEMO', fixRounds: 0, lastId: 0, reviewFixes: 0 }, 'every result hands the whole state back');
  assert.match(SRC.match(/^export const meta = \{[\s\S]*?\n\}/m)[0], /phases: \[\n    \{ title: 'State'.*\n    \{ title: 'Plan'/);
});

test('a blocked, needs-input, missing or spec-issue pre-check stops before any developer', async () => {
  const cases = {
    blocked: ok('qa:pre-check', { status: 'blocked' }),
    'needs-input': ok('qa:pre-check', { status: 'needs-input' }),
    missing: null,
    'spec-issues': ok('qa:pre-check', { findings: [finding('Q-01', '.team/requirements/demo.md'), finding('Q-02', 'x', false)] }),
  };
  for (const [status, res] of Object.entries(cases)) {
    const { result, labels } = await run(base(), (c) => (c.label === 'qa:pre-check' ? res : undefined));
    assert.equal(result.status, 'stopped', status);
    assert.deepEqual(result.stoppedAt, { stage: 'Plan', round: 0 }, status);
    assert.deepEqual(labels, ['qa:pre-check'], `${status}: nothing after the pre-check`);
    assert.equal(result.needsUser[0].status, status, status);
  }
  const failed = await run(base(), (c) => (c.label === 'qa:pre-check' ? ok(c.label, { verdict: 'FAIL', findings: [finding('Q-04', 'x', false)] }) : undefined));
  assert.deepEqual(failed.labels, ['qa:pre-check'], 'a FAIL pre-check without blocking findings still stops');
  const { result } = await run(base(), (c) => (c.label === 'qa:pre-check' ? ok(c.label, { findings: [finding('Q-03', 'x', false)] }) : undefined));
  assert.equal(result.status, 'done', 'non-blocking pre-check notes do not stop the build');
});

test('qa execution waits for a review PASS; a review fix keeps the QA-Fix round, a qa fix starts round 1; retest-only after', async () => {
  let reviews = 0;
  let qas = 0;
  const { result, calls, labels } = await run(base(), (c) => {
    if (c.label === 'review:code-reviewer' && ++reviews === 1) return ok(c.label, { verdict: 'FAIL', findings: [{ ...finding('R-01', 'src/a.js'), severity: 'blocking' }] });
    if (c.label === 'qa' && ++qas === 1) return qaFail(finding('Q-05', 'src/a.js'));
    return undefined;
  });
  assert.equal(result.status, 'done');
  // Q-05 shares file and requirement with DEMO-B1 → a duplicate candidate; the comparator says different → its own bug ID.
  assert.deepEqual(labels, ['qa:pre-check', 'developer:T-1', 'review:code-reviewer', 'verify R-01', 'fix:T-1', 'review:code-reviewer', 'qa', 'compare Q-05~DEMO-B1', 'fix:T-1', 'review:code-reviewer', 'qa']);
  assert.equal(result.state.fixRounds, 1, 'only the qa FAIL started a QA-Fix round');
  const qaPrompts = calls.filter((c) => c.label === 'qa').map((c) => c.prompt);
  assert.ok(qaPrompts[0].includes(QA_EXEC_FIRST) && qaPrompts[1].includes(QA_EXEC_RETEST));
  assert.equal(roundIn(qaPrompts[0]), 0, 'the first qa run is round 0');
  assert.equal(roundIn(qaPrompts[1]), 1, 'the retest of the round-1 fix stays in round 1');
  assert.match(qaPrompts[1], /DEMO-B2 FIXED_PENDING_RETEST/, 'the retest names the fixed finding by its bug ID');
  for (const p of qaPrompts) assert.ok(!p.includes(QA_PRECHECK));
  assert.deepEqual(result.tracker.map((e) => [e.id, e.origin, e.sourceId, e.status]), [['DEMO-B1', 'CODE_REVIEW', 'R-01', 'VERIFIED'], ['DEMO-B2', 'QA', 'Q-05', 'VERIFIED']]);
});

test('bug-fix args (as fix.md documents them): qa defines the regression test before the developer fixes', async () => {
  const { result, labels } = await run(base({ groups: [[ticket('fix', 'src/bug.js')]] }));
  assert.equal(result.status, 'done');
  assert.deepEqual(labels, ['qa:pre-check', 'developer:fix', 'review:code-reviewer', 'qa']);
  const fix = read('commands/fix.md');
  assert.match(fix, /qaPlanBrief: <step 3 brief>, qaBrief: <step 6 brief>, state: <STATE\.md row>, tracker: <findings\.md>/);
  assert.ok(fix.indexOf('3. **QA pre-check**') > 0 && fix.indexOf('3. **QA pre-check**') < fix.indexOf('4. **Fix**'));
  assert.match(fix, /define the regression condition/);
});

test('T0 / small change: no pre-check spawn, no RTM line; infra adds no qa', async () => {
  const { result, calls, labels, phases } = await run(base({ qaPlanBrief: undefined, profile: 'T0' }), (c) => (c.label === 'qa' ? ok('qa', { profile: 'T0' }) : undefined));
  assert.equal(result.status, 'done');
  assert.deepEqual(labels, ['developer:T-1', 'review:code-reviewer', 'qa']);
  assert.ok(!phases.includes('Plan'));
  assert.ok(!calls[0].prompt.includes(DEV_RTM.slice(0, 40)));
  assert.ok(calls[2].prompt.includes(QA_PROFILE.replace('<profile>', 'T0')));
  assert.match(read('commands/feature.md'), /With `--small`: skip steps 1–5 \(profile T0, no qa pre-check/);
  assert.match(read('commands/infra.md'), /no `qaPlanBrief`, no `qaBrief`/);
});

test('resume and startAt skip the pre-check but keep the RTM line; bad startAt fails loudly', async () => {
  const two = [[ticket('T-1', 'src/a.js')], [ticket('T-2', 'src/b.js')]];
  const build = await run(base({ groups: two, startAt: 'build', fromGroup: 1 }));
  assert.deepEqual(build.labels, ['developer:T-2', 'review:code-reviewer', 'qa']);
  assert.ok(build.calls[0].prompt.includes(DEV_RTM.replace('<slug>', 'demo')));
  assert.deepEqual((await run(base({ startAt: 'review' }))).labels, ['review:code-reviewer', 'qa']);
  const qa = await run(base({ startAt: 'qa' }));
  assert.deepEqual(qa.labels, ['qa']);
  assert.ok(qa.calls[0].prompt.includes(QA_EXEC_FIRST));
  const again = await run(base({ startAt: 'qa', qaRetest: true }));
  assert.ok(again.calls[0].prompt.includes(QA_EXEC_RETEST) && !again.calls[0].prompt.includes(QA_EXEC_FIRST));
  const devStop = await run(base(), (c) => (c.label === 'developer:T-1' ? ok(c.label, { status: 'blocked' }) : undefined));
  assert.deepEqual(devStop.result.stoppedAt, { stage: 'Build', round: 0 });
  await assert.rejects(run(base({ qaPlanBrief: undefined, startAt: 'plan' })), /startAt "plan" needs a qaPlanBrief/);
  await assert.rejects(run(base({ startAt: 'test' })), /startAt is plan, build, review or qa/);
});

// ---- the QA-Fix round: canonical in STATE.md, passed in, never defaulted ----

test('round state is required on every call; missing, invalid, negative or foreign state is rejected', async () => {
  await assert.rejects(run({ ...base(), state: undefined }), /state of "demo" is required on every call/);
  for (const bad of [-1, 1.5, '2', null, undefined]) await assert.rejects(run(base({ state: { item: 'demo', key: 'DEMO', fixRounds: bad, lastId: 0, reviewFixes: 0 } })), /is not a whole number from 0/, `fixRounds ${bad}`);
  await assert.rejects(run(base({ state: state(0, [], 'other-item') })), /state\.item "other-item" is not the item "demo"/);
  await assert.rejects(run(base({ state: { item: 'demo', key: 'DEMO', fixRounds: 0, lastId: 0 } })), /state\.reviewFixes/);
  for (const key of [undefined, '', 'cart', 'C', 'TOOLONG7', '1CART']) await assert.rejects(run(base({ state: { ...state(), key } })), /is not an item key/, `key ${key}`);
  await assert.rejects(run(base({ tracker: [entry('CART-B1')] })), /expected DEMO-B<n>/, 'a bug ID of another item is refused');
  await assert.rejects(run({ ...base(), tracker: undefined }), /tracker of "demo" is required on every call/);
  await assert.rejects(run(base({ state: state(4) })), /past the cap 3: rounds past 3 never run in a workflow/);
  for (const old of ['fixRounds', 'knownFindings', 'deferred']) {
    await assert.rejects(run(base({ [old]: 1 })), new RegExp(`"${old}" is gone`), `old arg ${old} is refused, not ignored`);
  }
  for (const k of ['cap', 'maxRounds', 'extraRounds', 'approval', 'approvedBy', 'approvals', 'userApproval']) {
    await assert.rejects(run(base({ [k]: 1 })), new RegExp(`"${k}" is not accepted`), `arg ${k} is refused, not ignored`);
  }
});

test('STATE.md and the tracker must agree; qa.md can never override the canonical round', async () => {
  const fixedInRound2 = [entry('DEMO-B1', { history: [{ round: 2, event: 'fix', trigger: 'QA' }] })];
  await assert.rejects(run(base({ state: state(1), tracker: fixedInRound2 })), /tracker of "demo" shows a QA-Fix round 2, but state\.fixRounds is 1/);
  await assert.rejects(run(base({ tracker: [entry('DEMO-B1'), entry('DEMO-B1')] })), /repeated ID "DEMO-B1"/);
  await assert.rejects(run(base({ tracker: [entry('X-1')] })), /malformed/);
  for (const reported of [0, 3, 5]) {
    const r = await run(base({ startAt: 'qa', state: state(1) }), (c) => (c.label === 'qa' ? qaFail(finding('Q-01', 'src/a.js'), { reportFixRounds: reported }) && { ...qaFail(finding('Q-01', 'src/a.js')), reportFixRounds: reported } : undefined));
    assert.equal(r.result.status, 'stopped', `qa.md says ${reported}`);
    assert.deepEqual([r.result.needsUser[0].status, r.result.needsUser[0].canonical, r.result.needsUser[0].reported], ['state-mismatch', 1, reported]);
    assert.equal(r.result.state.fixRounds, 1, 'the canonical round is unchanged');
    assert.ok(!r.labels.some((l) => l.startsWith('fix:')));
  }
});

test('the round survives resume and respawn: it only moves on an actionable qa FAIL, and comes back in every result', async () => {
  const two = await run(base({ startAt: 'review', state: state(2) }), qaKeepsFailing());
  assert.equal(count(two.labels, 'fix:T-1'), 1, 'resumed at round 2 → exactly one round left');
  assert.equal(two.result.state.fixRounds, 3);
  const resumedAtCap = await run(base({ startAt: 'qa', state: state(3), tracker: two.result.tracker }), qaKeepsFailing());
  assert.equal(resumedAtCap.result.status, 'BLOCKED_PENDING_USER_DECISION', 'a respawned run at the cap gets no fix');
  assert.equal(count(resumedAtCap.labels, 'fix:T-1'), 0);
  const stop = await run(base({ state: state(1) }), (c) => (c.label === 'developer:T-1' ? ok(c.label, { status: 'blocked' }) : undefined));
  assert.deepEqual(stop.result.state, { item: 'demo', key: 'DEMO', fixRounds: 1, lastId: 1, reviewFixes: 0 }, 'a stopped result hands the round back unchanged');
  const interrupted = await run(base(), (c) => (c.label === 'fix:T-1' ? null : qaKeepsFailing()(c)));
  assert.equal(interrupted.result.status, 'stopped');
  assert.equal(interrupted.result.state.fixRounds, 1, 'a fix that started and died still counts as the round');
  assert.match(read('templates/core/STATE.md'), /\| Fix rounds \|/);
  assert.match(read('templates/reports/qa.md'), /QA-Fix round <n>\/3 \(as given from STATE\.md\)/);
});

test('round 3 stops automatic continuation with BLOCKED_PENDING_USER_DECISION and the decision to put to the user', async () => {
  const r = await run(base(), qaKeepsFailing());
  assert.equal(r.result.status, 'BLOCKED_PENDING_USER_DECISION');
  assert.equal(count(r.labels, 'fix:T-1'), 3);
  assert.deepEqual([r.result.state.fixRounds, r.result.cap], [3, 3]);
  const d = r.result.decision;
  assert.deepEqual([d.item, d.currentRound, d.nextRound], ['demo', 3, 4]);
  assert.match(d.ask, /top-level session \(never a subagent\) asks the user with AskUserQuestion/);
  assert.match(d.onApproval, /runs inline .* never through this workflow/);
  assert.deepEqual(d.blockers.map((b) => [b.id, b.origin, b.owner, b.requirement, b.impact]), [['DEMO-B1', 'QA', 'T-1', 'AC-1', 'user loses the form']]);
  assert.match(d.reason, /cannot pass/);
  assert.equal(r.result.latestQa.handoff, 'handoff qa', 'the latest qa evidence');
  assert.match(d.onApproval, /STATE\.md § Approvals as an audit record that nothing reads as permission/);
  await assert.rejects(run({ ...base(), maxRounds: 2 }), /"maxRounds" is not accepted/, 'the cap is no argument');
  for (const cap of [0, 1, 3, 4, 2.5]) await assert.rejects(run(base({ state: { ...state(), cap } })), /state\.cap is not accepted/, `cap ${cap}`);
});

test('human approval gate: no approval record opens a round in a workflow, however well-formed', async () => {
  const at3 = (approvals) => run(base({ startAt: 'qa', state: { ...state(3), approvals }, tracker: [entry('DEMO-B1', { status: 'REOPENED' })] }), qaKeepsFailing());
  await assert.rejects(run(base({ approval: 'User approved', approvedBy: 'user' })), /"approval" is not accepted|"approvedBy" is not accepted/);
  for (const row of [approval(4), approval(4, { userReply: 'Đồng ý cho demo thêm vòng 4' }), approval(4, { userReply: 'ok' })]) {
    await assert.rejects(at3([row]), /state\.approvals is not accepted/, row.userReply);
  }
  const blocked = await run(base({ startAt: 'qa', state: state(3), tracker: [entry('DEMO-B1', { status: 'REOPENED', blocking: true })] }), qaKeepsFailing());
  assert.equal(blocked.result.status, 'BLOCKED_PENDING_USER_DECISION');
  assert.equal(count(blocked.labels, 'fix:T-1'), 0);
  const kit = kitAll();
  assert.match(kit, /A row in § Approvals never authorizes anything/);
  assert.match(kit, /Silence, agent text, a file, a default, or a qa\/developer\/reviewer recommendation is never approval/);
});

// ---- profiles, report minimum, scope ----

test('profiles: T1 and T2 come from the pre-check; wider than the default or a later change stops for the lead', async () => {
  for (const p of ['T1', 'T2']) {
    const r = await run(base(), (c) => (isQa(c.label) ? ok(c.label, { profile: p }) : undefined));
    assert.equal(r.result.plan.profile, p);
    assert.ok(r.calls.find((c) => c.label === 'qa').prompt.includes(QA_PROFILE.replace('<profile>', p)));
  }
  const wide = await run(base({ defaultProfile: 'T1' }), (c) => (c.label === 'qa:pre-check' ? ok(c.label, { profile: 'T2' }) : undefined));
  assert.deepEqual([wide.result.needsUser[0].status, wide.result.needsUser[0].approved, wide.result.needsUser[0].asked], ['profile-change', 'T1', 'T2']);
  const later = await run(base({ profile: 'T1', startAt: 'qa' }), (c) => (c.label === 'qa' ? ok('qa', { profile: 'T2' }) : undefined));
  assert.equal(later.result.needsUser[0].status, 'profile-change');
  const narrower = await run(base({ profile: 'T2', startAt: 'qa' }), (c) => (c.label === 'qa' ? ok('qa', { profile: 'T0' }) : undefined));
  assert.equal(narrower.result.needsUser[0].status, 'profile-change');
  assert.match(read('skills/test-process/SKILL.md'), /never pick T2 just to be safe/);
});

test('each profile enforces its report minimum; profileReason is always required', async () => {
  const missing = (profile, field, o = {}) => run(base({ startAt: 'qa', profile, ...o }), (c) => (c.label === 'qa' ? ok('qa', { profile, report: fullReport({ [field]: '' }) }) : undefined));
  for (const [profile, field] of [['T0', 'smoke'], ['T0', 'profileReason'], ['T1', 'negativePaths'], ['T1', 'checklist'], ['T2', 'rtm'], ['T2', 'exploratorySession']]) {
    const r = await missing(profile, field);
    assert.equal(r.result.needsUser[0].status, 'report-incomplete', `${profile} without ${field}`);
    assert.deepEqual(r.result.needsUser[0].missing, [field]);
  }
  const t0 = await run(base({ startAt: 'qa', profile: 'T0' }), (c) => (c.label === 'qa' ? ok('qa', { profile: 'T0', report: { profileReason: 'css only', plannedScope: 'button colour', executedScope: 'button colour', deviations: 'none', changedBehaviour: 'colour ok', tests: 'npm test 12 pass', smoke: 'page loads', exploratory: 'none', expansion: '' } }) : undefined));
  assert.equal(t0.result.status, 'done', 'T0 needs no RTM, no exploratory, no regression suite');
  const pre = await run(base({ defaultProfile: 'T2' }), (c) => (c.label === 'qa:pre-check' ? ok(c.label, { profile: 'T2', report: fullReport({ rtm: '' }) }) : undefined));
  assert.deepEqual(pre.result.needsUser[0].missing, ['rtm'], 'a T2 pre-check needs its RTM');
  const retest = await run(base({ startAt: 'qa', qaRetest: true, profile: 'T1' }), (c) => (c.label === 'qa' ? ok('qa', { report: fullReport({ regression: 'n/a' }) }) : undefined));
  assert.deepEqual(retest.result.needsUser[0].missing, ['regression'], '"n/a" without a reason is not enough');
});

test('retest scope: no exploratory by default; any expansion needs the lead\'s approval first', async () => {
  assert.match(QA_EXEC_RETEST, /No exploratory testing \(exploratory: none\) unless the lead approved an expansion/);
  assert.match(QA_EXEC_RETEST, /Record planned scope, executed scope and deviations/);
  const retest = (report, o = {}) => run(base({ startAt: 'qa', qaRetest: true, ...o }), (c) => (c.label === 'qa' ? ok('qa', { report: fullReport(report) }) : undefined));
  for (const rep of [{ exploratory: 'planned' }, { exploratory: 'expanded' }, { expansion: 'also test the admin area' }]) {
    const r = await retest(rep);
    assert.equal(r.result.needsUser[0].status, 'scope-change', JSON.stringify(rep));
  }
  assert.equal((await retest({ exploratory: 'planned' }, { scopeApproval: 'lead 2026-11-21: admin flow touched, explore it' })).result.status, 'done');
  const first = await run(base({ startAt: 'qa' }), (c) => (c.label === 'qa' ? ok('qa', { report: fullReport({ exploratory: 'planned' }) }) : undefined));
  assert.equal(first.result.status, 'done', 'planned exploratory on the first run is in scope');
  const firstWide = await run(base({ startAt: 'qa' }), (c) => (c.label === 'qa' ? ok('qa', { report: fullReport({ expansion: 'test payments too' }) }) : undefined));
  assert.equal(firstWide.result.needsUser[0].status, 'scope-change');
});

// ---- triage ----

test('severity and basis: only in-scope blocker/critical (or flagged major) with full evidence blocks', async () => {
  const sep = await run(base({ startAt: 'qa' }), onQa(() => ok('qa', { findings: [finding('Q-01', 'src/a.js', true, { basis: 'pre-existing', severity: 'critical' }), finding('Q-02', 'src/b.js', true, { basis: 'enhancement', title: 'other' }), finding('Q-03', 'src/c.js', true, { basis: 'out-of-scope', title: 'third' })] })));
  assert.equal(sep.result.status, 'done');
  assert.equal(sep.result.qa.separate.length, 3);
  const minor = await run(base({ startAt: 'qa' }), onQa((n) => (n === 1 ? qaFail(finding('Q-01', 'src/a.js', true, { severity: 'minor' })) : undefined)));
  assert.equal(minor.result.needsUser[0].status, 'no-valid-blocking', 'a FAIL resting on a minor is the lead\'s call, never a fix or a PASS');
  const bad = await run(base({ startAt: 'qa' }), onQa(() => ok('qa', { findings: [finding('Q-02', 'src/a.js', true, { severity: 'critical', evidence: '' })] })));
  assert.equal(bad.result.needsUser[0].status, 'invalid-findings', 'a critical without evidence never ends in done');
  const sev = await run(base({ startAt: 'qa' }), onQa(() => ok('qa', { findings: [finding('Q-04', 'src/a.js', true, { severity: 'High' })] })));
  assert.match(sev.result.needsUser[0].findings[0].reason, /unknown severity "High"/);
});

// ---- the tracker ----

test('bug IDs are stable: title, file and line may change, the ID does not; a reopened finding keeps its ID', async () => {
  const known = [entry('DEMO-B7', { status: 'FIXED_PENDING_RETEST', history: [{ round: 1, event: 'fix', trigger: 'QA' }] })];
  const moved = await run(base({ startAt: 'qa', qaRetest: true, state: state(1), tracker: known, groups: [[ticket('T-1', 'src')]] }), onQa((n) => (n === 1
    ? qaFail(finding('Q-09', 'src/b.js', true, { trackerId: 'DEMO-B7', result: 'failing', title: 'renamed title', line: 40 }))
    : undefined)));
  const e = moved.result.tracker.find((x) => x.id === 'DEMO-B7');
  assert.deepEqual([e.title, e.file, e.line], ['renamed title', 'src/b.js', 40], 'metadata moved');
  assert.equal(moved.result.tracker.length, 1, 'no new finding for a renamed known defect');
  assert.ok(e.history.some((h) => h.event === 'reopened'), 'reopened, same bug ID');
  assert.match(moved.calls.find((c) => c.label === 'fix:T-1').prompt, /DEMO-B7 \(QA Q-01\) src\/b\.js:40/);
  const verifiedThenFails = await run(base({ startAt: 'qa', state: state(1), tracker: [entry('DEMO-B3', { status: 'VERIFIED', history: [{ round: 1, event: 'fix', trigger: 'QA' }] })] }), onQa((n) => (n === 1 ? qaFail(finding('Q-1', 'src/a.js', true, { trackerId: 'DEMO-B3', result: 'failing' })) : undefined)));
  assert.ok(verifiedThenFails.result.tracker.find((x) => x.id === 'DEMO-B3').history.some((h) => h.event === 'reopened'), 'VERIFIED → REOPENED keeps DEMO-B3');
  assert.equal(verifiedThenFails.result.tracker.length, 1);
});

test('possible duplicates are never merged on metadata: a comparator decides by behaviour and evidence', async () => {
  const known = [entry('DEMO-B1', { requirement: 'AC-1', title: 'save fails with error', status: 'OPEN' })];
  const lookalike = finding('Q-20', 'src/a.js', true, { title: 'save fails with error 500' });
  const apart = await run(base({ startAt: 'qa', tracker: known }), onQa((n) => (n === 1 ? qaFail(lookalike) : undefined)));
  assert.ok(apart.labels.includes('compare Q-20~DEMO-B1'), 'the candidate goes to a comparator');
  assert.equal(apart.calls.find((c) => c.label === 'compare Q-20~DEMO-B1').agentType, undefined, 'read-only, no agent rules inherited');
  const fresh = apart.result.tracker.find((x) => x.sourceId === 'Q-20');
  assert.equal(fresh.id, 'DEMO-B2', 'different behaviour → its own bug ID');
  assert.deepEqual(fresh.relatedTo, ['DEMO-B1'], 'kept apart but linked');
  const once = () => onQa((n) => (n === 1 ? qaFail(lookalike) : undefined));
  const q1 = once();
  const same = await run(base({ startAt: 'qa', tracker: known }), (c) => (c.label.startsWith('compare ') ? { same: true, reason: 'same null deref' } : q1(c)));
  assert.equal(same.result.tracker.length, 1, 'the comparator said same → bound to DEMO-B1');
  const q2 = once();
  const silent = await run(base({ startAt: 'qa', tracker: known }), (c) => (c.label.startsWith('compare ') ? null : q2(c)));
  assert.equal(silent.result.tracker.length, 2, 'no comparator answer → never merged');
  const unrelated = await run(base({ startAt: 'qa', tracker: known }), onQa((n) => (n === 1 ? qaFail(finding('Q-21', 'src/z.js', true, { title: 'totally different crash', violates: 'AC-9' })) : undefined)));
  assert.ok(!unrelated.labels.some((l) => l.startsWith('compare ')), 'one weak signal is not a candidate');
});

test('a fixed finding the retest does not report is never assumed fixed', async () => {
  const pending = [entry('DEMO-B1', { status: 'FIXED_PENDING_RETEST', history: [{ round: 1, event: 'fix', trigger: 'QA' }] })];
  const r = await run(base({ startAt: 'qa', qaRetest: true, state: state(1), tracker: pending }), (c) => (c.label === 'qa' ? ok('qa', { noAuto: true }) : undefined));
  assert.equal(r.result.needsUser[0].status, 'retest-incomplete');
  assert.deepEqual(r.result.needsUser[0].findings, ['DEMO-B1']);
});

test('lead decisions on tracker entries win: DEFERRED, REJECTED, leadBlocking false never block; owner routes the fix', async () => {
  for (const o of [{ status: 'DEFERRED' }, { status: 'REJECTED' }, { leadBlocking: false }]) {
    const r = await run(base({ startAt: 'qa', tracker: [entry('DEMO-B1', o)] }), onQa(() => qaFail(finding('Q-1', 'src/a.js', true, { trackerId: 'DEMO-B1', result: 'failing' }))));
    assert.notEqual(r.result.status, 'done', `${JSON.stringify(o)}: a FAIL resting on it is the lead's call, not a silent PASS`);
    assert.ok(!r.labels.some((l) => l.startsWith('fix:')), `${JSON.stringify(o)}: not fixed`);
    assert.equal(r.result.tracker[0].status, o.status || 'OPEN', 'qa cannot change the lead\'s status');
  }
  for (const status of ['DEFERRED', 'REJECTED']) {
    const v = await run(base({ startAt: 'qa', tracker: [entry('DEMO-B1', { status })] }), onQa(() => ok('qa', { findings: [finding('Q-1', 'src/a.js', false, { trackerId: 'DEMO-B1', result: 'verified' })] })));
    assert.equal(v.result.tracker[0].status, status, `qa "verified" cannot close a ${status} entry: only the lead moves it`);
  }
  const two = [[ticket('T-1', 'src/a.js'), ticket('T-2', 'src/b.js')]];
  const routed = await run(base({ startAt: 'qa', groups: two, tracker: [entry('DEMO-B1', { owner: 'T-2' })] }), onQa((n) => (n === 1 ? qaFail(finding('Q-1', 'src/a.js', true, { trackerId: 'DEMO-B1', result: 'failing' })) : undefined)));
  assert.ok(routed.labels.includes('fix:T-2') && !routed.labels.includes('fix:T-1'), 'the lead\'s owner overrides file routing');
});

test('code review findings join the tracker with their origin and verdict; skeptics still run; no QA-Fix round from review', async () => {
  let n = 0;
  const r = await run(base({ startAt: 'review', reviewBriefs: { 'code-reviewer': 'cr', security: 'sec' } }), (c) => {
    if (c.label === 'review:code-reviewer' && ++n === 1) return ok(c.label, { verdict: 'FAIL', findings: [{ ...finding('R-02', 'src/a.js'), severity: 'blocking' }] });
    if (c.label === 'review:security' && n <= 1) return ok(c.label, { verdict: 'PASS', findings: [{ ...finding('S-01', 'src/a.js', false, { title: 'weak header' }), severity: 'suggestion' }] });
    return undefined;
  });
  assert.equal(r.result.status, 'done');
  assert.ok(r.labels.includes('verify R-02'), 'the skeptic re-checks the blocking review finding');
  const cr = r.result.tracker.find((e) => e.sourceId === 'R-02');
  assert.deepEqual([cr.origin, cr.status], ['CODE_REVIEW', 'VERIFIED']);
  assert.equal(r.result.tracker.find((e) => e.sourceId === 'S-01').origin, 'SECURITY');
  assert.equal(r.result.state.fixRounds, 0, 'a review fix never moves the QA-Fix round');
  assert.ok(r.calls.filter((c) => c.label === 'review:code-reviewer')[1].prompt.includes('DEMO-B1 FIXED_PENDING_RETEST'), 'the reviewer re-checks by bug ID');
  assert.ok(!rowsIn(r.calls.filter((c) => c.label === 'review:security')[1].prompt).some((e) => e.id === 'DEMO-B1'), 'each reviewer gets only the tracker rows of its own origin');
  const refuted = await run(base({ startAt: 'review' }), (c) => (c.label.startsWith('verify ') ? { refuted: true, reason: 'handled upstream' } : c.label === 'review:code-reviewer' ? ok(c.label, { verdict: 'FAIL', findings: [{ ...finding('R-03', 'src/a.js'), severity: 'blocking' }] }) : undefined));
  assert.equal(refuted.result.needsUser[0].status, 'disputed', 'a refuted finding still goes to the user, as before');
  assert.equal(refuted.result.tracker.length, 0, 'a disputed finding is not registered as actionable');
  const loop = await run(base({ startAt: 'review' }), (c) => (c.label === 'review:code-reviewer' ? ok(c.label, { verdict: 'FAIL', noAuto: true, findings: [...rowsIn(c.prompt).map((e) => ({ ...finding('R-x', e.file), trackerId: e.id, result: 'failing', severity: 'blocking' })), ...(rowsIn(c.prompt).length ? [] : [{ ...finding('R-01', 'src/a.js'), severity: 'blocking' }])] }) : undefined));
  assert.equal(loop.result.needsUser.at(-1).status, 'review-limit', 'review-fix cycles are bounded too');
  assert.equal(loop.result.state.fixRounds, 0);
});

// ---- inline and workflow say the same ----

test('inline and workflow use the same QA text, tracker, round and approval rules', () => {
  const kit = kitAll();
  for (const [name, line] of Object.entries(LINES)) assert.ok(kit.includes(`\`${line}\``), `run-kit §3 has ${name} word for word`);
  for (const h of ['qa report minimum (both paths)', 'Reading a qa FAIL (both paths)', 'Finding tracker (both paths)', 'QA-Fix round (both paths)', 'More than 3 rounds — a human decision (both paths)']) assert.ok(read('skills/run-kit/references/qa-loop.md').includes(`\n## ${h}\n`), `run-kit qa-loop.md has ${h}`);
  for (const s of list('STATUSES')) assert.ok(kit.includes(s) && read('skills/test-process/SKILL.md').includes(s) && read('templates/reports/findings.md').includes(s), `docs name status ${s}`);
  for (const b of [...list('BLOCKING_BASES'), ...list('SEPARATE_BASES')]) assert.ok(kit.includes(`\`${b}\``), `run-kit names basis ${b}`);
  for (const f of list('BLOCKING_FIELDS')) assert.ok(kit.includes(f), `run-kit lists blocking field ${f}`);
  for (const k of REPORT_KEYS) assert.ok(kit.includes(k), `run-kit lists report field ${k}`);
  assert.match(SRC, /^const ROUND_CAP = 3$/m);
  const sec = read('skills/run-kit/references/workflow.md');
  for (const st of ['BLOCKED_PENDING_USER_DECISION', 'unresolved-blocking', 'state-mismatch', 'report-incomplete', 'scope-change', 'retest-incomplete', 'review-limit', 'invalid-findings', 'no-valid-blocking', 'profile-change']) assert.match(sec, new RegExp(`\\| \`${st}\` \\|`), `run-kit §6 routes ${st}`);
  const lead = read('agents/team-lead.md');
  assert.match(lead, /At most 3 QA-Fix rounds per item, counted in STATE\.md § QA-Fix state `Fix rounds`/);
  assert.match(read('templates/core/STATE.md'), /^## QA-Fix state$[\s\S]*\| Slug \| Key \| Fix rounds \| Last bug no\. \| Review fixes \|/m, 'one STATE.md row holds the whole QA-Fix state');
  assert.match(lead, /never approve it yourself or on an agent's say/);
  assert.match(lead, /\.team\/reports\/<slug>\/findings\.md/);
  assert.match(read('templates/core/STATE.md'), /^## Approvals \(audit log\)$/m);
  assert.match(read('templates/reports/findings.md'), /\| ID \| Origin · Source \| Status \|/);
  assert.match(read('templates/reports/review.md'), /\| ID \| Tracker \|/);
  for (const c of ['feature', 'fix', 'infra']) assert.match(read(`commands/${c}.md`), /state/, `${c} passes state`);
  const feature = read('commands/feature.md');
  const at = (s) => { const i = feature.indexOf(s); assert.ok(i >= 0, s); return i; };
  assert.ok(at('5. **QA pre-check**') < at('6. **Build**') && at('6. **Build**') < at('7. **Review**') && at('7. **Review**') < at('8. **Test**'));
  assert.match(read('agents/team-qa.md'), /never count, reset or raise it yourself/);
  assert.match(read('agents/team-code-reviewer.md'), /return each one you re-check with its `trackerId`/);
});

test('roles and the qa template stay as agreed', () => {
  const dev = read('agents/team-developer.md');
  for (const re of [/Unit\/component tests are yours/, /`blocked` with the error, never "done"/, /Claim a QA PASS/]) assert.match(dev, re);
  const qa = read('agents/team-qa.md');
  for (const re of [/\*\*Pre-check\*\*/, /\*\*Execution\*\*/, /Write unit\/component tests that belong to developer/, /Scope lock/, /Lower the exit criteria/]) assert.match(qa, re);
  const tpl = read('templates/reports/qa.md');
  for (const h of ['## Profile and approved scope', '## Checks (T0/T1 checklist · T2 RTM)', '## Blocking findings', '## Non-blocking and separate', '## Round detail (latest round only)']) assert.ok(tpl.includes(`\n${h}\n`), h);
  assert.match(tpl, /- Scope: planned <…> · executed <…> · deviations/);
  assert.match(tpl, /steps · expected \(source\) · actual · evidence · violates · impact · why this severity/);
  assert.ok(tpl.split('\n').length <= 60);
});

// ---- regressions from the independent review ----

test('no done while a blocking entry is unresolved: a fix that died, a silent PASS, a downgraded severity', async () => {
  const dying = [entry('DEMO-B1', { status: 'IN_PROGRESS', blocking: true, history: [{ round: 1, event: 'fix', trigger: 'QA' }] })];
  const silent = await run(base({ startAt: 'qa', state: state(1), tracker: dying }), (c) => (c.label === 'qa' ? ok('qa', { noAuto: true }) : undefined));
  assert.equal(silent.result.needsUser[0].status, 'retest-incomplete', 'a fix that never finished must be retested');
  const reviewPass = await run(base({ startAt: 'review', qaBrief: undefined, state: state(1), tracker: [entry('DEMO-B1', { status: 'OPEN', blocking: true, history: [{ round: 1, event: 'fix', trigger: 'QA' }] })] }));
  assert.equal(reviewPass.result.status, 'stopped', 'an OPEN blocking qa entry no gate re-checked never ends in done');
  assert.equal(reviewPass.result.needsUser.at(-1).status, 'qa-pending', 'a call without qa never passes an item qa has tested');
  const downgraded = await run(base({ startAt: 'qa', state: state(1), tracker: [entry('DEMO-B1', { status: 'REOPENED', blocking: true, history: [{ round: 1, event: 'fix', trigger: 'QA' }] })] }), onQa(() => ok('qa', { findings: [finding('Q-1', 'src/a.js', false, { trackerId: 'DEMO-B1', result: 'failing', severity: 'minor' })] })));
  assert.notEqual(downgraded.result.status, 'done', 'renaming a blocker "minor" does not resolve it');
  assert.equal(downgraded.result.needsUser.at(-1).status, 'unresolved-blocking');
  const leadSaysNo = await run(base({ startAt: 'qa', state: state(1), tracker: [entry('DEMO-B1', { status: 'REOPENED', blocking: true, leadBlocking: false })] }), onQa(() => ok('qa', { findings: [finding('Q-1', 'src/a.js', false, { trackerId: 'DEMO-B1', result: 'failing', severity: 'minor' })] })));
  assert.equal(leadSaysNo.result.status, 'done', 'only the lead unblocks it');
});

test('a QA-Fix round is spent only when a fixer actually starts', async () => {
  const unowned = await run(base({ startAt: 'qa' }), onQa(() => qaFail(finding('Q-02', 'other/x.js'))));
  assert.equal(unowned.result.needsUser.at(-1).status, 'unowned');
  assert.equal(unowned.result.state.fixRounds, 0, 'no fixer, no round');
  const unsafe = await run(base({ startAt: 'qa' }), onQa(() => qaFail(finding('Q-03', '../etc/x'))));
  assert.equal(unsafe.result.state.fixRounds, 0);
});

test('a re-run after a used round is a retest even without qaRetest', async () => {
  const r = await run(base({ startAt: 'qa', state: state(1) }));
  assert.ok(r.calls[0].prompt.includes(QA_EXEC_RETEST) && !r.calls[0].prompt.includes(QA_EXEC_FIRST));
  const withFindings = await run(base({ startAt: 'qa', tracker: [entry('DEMO-B1', { status: 'VERIFIED' })] }));
  assert.ok(withFindings.calls[0].prompt.includes(QA_EXEC_RETEST), 'qa findings on record → qa already ran');
});

test('leadBlocking true makes an entry blocking; no reply in state is read as approval', async () => {
  const forced = await run(base({ startAt: 'qa', state: state(0, [], 'demo', 1), tracker: [entry('DEMO-B1', { leadBlocking: true })] }), onQa((n) => ok('qa', { findings: [finding('Q-1', 'src/a.js', false, { trackerId: 'DEMO-B1', result: 'failing', severity: 'minor' })] })));
  assert.ok(forced.labels.includes('fix:T-1'), 'the lead can force a minor to blocking');
  for (const reply of ['I do not approve demo round 4', 'approve demo round 4']) {
    await assert.rejects(run(base({ startAt: 'qa', state: { ...state(3), approvals: [approval(4, { userReply: reply })] }, tracker: [entry('DEMO-B1', { status: 'REOPENED' })] })), /state\.approvals is not accepted/, reply);
  }
});

test('a gate changes only the rows it was shown, and verified needs a fix first', async () => {
  const sec = entry('DEMO-B1', { origin: 'SECURITY', status: 'FIXED_PENDING_RETEST', blocking: true, history: [] });
  const r = await run(base({ startAt: 'review', qaBrief: undefined, tracker: [sec], reviewBriefs: { 'code-reviewer': 'cr', security: 's' } }), (c) => {
    if (c.label === 'review:code-reviewer') return ok(c.label, { findings: [{ ...finding('R-1', 'src/a.js', false, { trackerId: 'DEMO-B1', result: 'verified', title: 'x' }), severity: 'suggestion' }] });
    return undefined;
  });
  const e = r.result.tracker.find((x) => x.id === 'DEMO-B1');
  assert.ok(e.history.some((h) => h.event === 'verified' && /SECURITY/.test(h.note)), 'only the security reviewer verified its own finding');
  assert.ok(r.logs.some((l) => /trackerId "DEMO-B1" is unknown or not in its brief/.test(l)), 'the code reviewer could not touch a security row');
  const openRow = await run(base({ startAt: 'qa', tracker: [entry('DEMO-B2', { status: 'OPEN', blocking: true })] }), onQa(() => ok('qa', { findings: [finding('Q-1', 'src/a.js', false, { trackerId: 'DEMO-B2', result: 'verified' })] })));
  assert.equal(openRow.result.tracker[0].status, 'OPEN', 'OPEN → VERIFIED with no fix is refused');
  assert.equal(openRow.result.needsUser.at(-1).status, 'unresolved-blocking');
});

test('two reviewers reporting the same spot are not merged in the tracker on metadata', async () => {
  let n = 0;
  const same = { ...finding('X-1', 'src/a.js', false, { title: 'unsafe header' }), severity: 'suggestion' };
  const r = await run(base({ startAt: 'review', qaBrief: undefined, reviewBriefs: { 'code-reviewer': 'cr', security: 's' } }), (c) => {
    if (c.label.startsWith('review:') && ++n <= 2) return ok(c.label, { findings: [{ ...same, id: c.label === 'review:security' ? 'S-1' : 'R-1' }] });
    return undefined;
  });
  assert.ok(r.labels.some((l) => l.startsWith('compare ')), 'the second report is a duplicate candidate for the comparator');
  assert.deepEqual(r.result.tracker.map((e) => e.origin).sort(), ['CODE_REVIEW', 'SECURITY'], 'comparator said different → both kept');
});


// ---- fixes from the sandbox run ----

test('a rewound STATE.md is caught: lastId vs tracker, a round with no qa finding, and qa.md showing a higher round', async () => {
  await assert.rejects(run(base({ state: state(0, [], 'demo', 3, { lastId: 0 }), tracker: [entry('DEMO-B1')] })), /DEMO-B1 as its highest bug ID, but state\.lastId is 0/);
  await assert.rejects(run(base({ state: state(0, [], 'demo', 3, { lastId: 4 }), tracker: [entry('DEMO-B1')] })), /lost or gained entries/);
  await assert.rejects(run(base({ state: state(2, [], 'demo', 3, { lastId: 0 }), tracker: [] })), /fixRounds of "demo" is 2 but its tracker has no qa finding/);
  // STATE.md and findings.md both rewound to empty, consistently: the next qa run sees qa.md at round 3
  const rewound = await run(base(), (c) => (isQa(c.label) ? ok(c.label, { previousFixRounds: 3 }) : undefined));
  assert.equal(rewound.result.status, 'stopped');
  assert.deepEqual([rewound.result.needsUser[0].status, rewound.result.needsUser[0].canonical, rewound.result.needsUser[0].qaMdBefore], ['state-regressed', 0, 3]);
  assert.deepEqual(rewound.labels, ['qa:pre-check'], 'caught at the pre-check, nothing built');
  assert.equal(rewound.witness.length, 1, 'the state witness ran before it');
  const fine = await run(base({ state: state(1) }), (c) => (c.label === 'qa' ? ok('qa', { previousFixRounds: 1 }) : undefined));
  assert.equal(fine.result.status, 'done', 'qa.md equal to STATE.md is fine');
  const lower = await run(base({ state: state(2) }), (c) => (c.label === 'qa' ? ok('qa', { previousFixRounds: 1 }) : undefined));
  assert.equal(lower.result.status, 'done', 'qa.md behind STATE.md (qa did not run since) is fine');
  assert.match(LINES.QA_ROUNDS, /First return the round qa\.md line 1 shows now as previousFixRounds/);
  assert.match(LINES.QA_ROUNDS, /If that is higher than the given round, change nothing in qa\.md and stop there/, 'qa keeps the witness instead of overwriting it');
  const halted = await run(base(), (c) => (isQa(c.label) ? ok(c.label, { status: 'needs-input', previousFixRounds: 3 }) : undefined));
  assert.equal(halted.result.needsUser[0].status, 'state-regressed', 'a qa that stops as told is still routed as state-regressed, not as a generic needs-input');
});

test('the cap is code: a re-run can neither drop nor raise it', async () => {
  const r1 = await run(base(), qaKeepsFailing());
  assert.deepEqual([r1.result.status, r1.result.state.fixRounds, r1.result.cap, 'cap' in r1.result.state], ['BLOCKED_PENDING_USER_DECISION', 3, 3, false]);
  const r2 = await run(base({ startAt: 'qa', state: r1.result.state, tracker: r1.result.tracker }), qaKeepsFailing());
  assert.equal(r2.labels.filter((l) => l.startsWith('fix:')).length, 0, 'a re-run with the returned state stays at the cap');
  assert.equal(r2.result.status, 'BLOCKED_PENDING_USER_DECISION');
  assert.deepEqual(r1.result.state.lastId, 1, 'lastId comes back with the state');
});

test('review-fix cycles are persisted per QA-Fix round, so re-runs cannot loop them', async () => {
  const failingReview = (c) => (c.label === 'review:code-reviewer' ? ok(c.label, { verdict: 'FAIL', noAuto: true, findings: rowsIn(c.prompt).length ? rowsIn(c.prompt).map((e) => ({ ...finding('R-x', e.file), trackerId: e.id, result: 'failing', severity: 'blocking' })) : [{ ...finding('R-01', 'src/a.js'), severity: 'blocking' }] }) : undefined);
  const r1 = await run(base({ startAt: 'review' }), failingReview);
  assert.deepEqual([r1.result.needsUser.at(-1).status, r1.result.state.reviewFixes], ['review-limit', 3]);
  const r2 = await run(base({ startAt: 'review', state: r1.result.state, tracker: r1.result.tracker }), failingReview);
  assert.equal(r2.labels.filter((l) => l.startsWith('fix:')).length, 0, 'a re-run gets no more review fixes in the same QA-Fix round');
  assert.equal(r2.result.needsUser.at(-1).status, 'review-limit');
  await assert.rejects(run(base({ state: state(0, [], 'demo', 3, { reviewFixes: 4 }) })), /reviewFixes .* is not a whole number from 0 to 3/);
  // a qa FAIL that starts a new QA-Fix round resets the review-fix count
  let qn = 0;
  const reset = await run(base({ startAt: 'qa', state: state(0, [], 'demo', 3, { reviewFixes: 3 }) }), (c) => (c.label === 'qa' && ++qn === 1 ? qaFail(finding('Q-01', 'src/a.js')) : undefined));
  assert.deepEqual([reset.result.status, reset.result.state.fixRounds, reset.result.state.reviewFixes], ['done', 1, 0]);
});

test('generic evidence wording alone does not make a duplicate candidate', async () => {
  const known = [entry('DEMO-B1', { title: 'Save button returns 500', evidence: 'sandbox log: B1', requirement: 'AC-1' })];
  const other = finding('Q-02', 'src/a.js', true, { title: 'Date picker shows wrong month', violates: 'AC-4', evidence: 'sandbox log: B2' });
  const r = await run(base({ startAt: 'qa', tracker: known }), onQa((n) => (n === 1 ? qaFail(other) : undefined)));
  assert.ok(!r.labels.some((l) => l.startsWith('compare ')), 'same file + stock evidence wording is one signal, not two');
  const real = finding('Q-03', 'src/a.js', true, { title: 'Totally other title', violates: 'AC-9', evidence: 'TypeError cannot read property customerId of undefined in saveHandler' });
  const k2 = [entry('DEMO-B1', { title: 'Save button returns 500', requirement: 'AC-1', evidence: 'saveHandler throws TypeError: cannot read property customerId of undefined' })];
  const r2 = await run(base({ startAt: 'qa', tracker: k2 }), onQa((n) => (n === 1 ? qaFail(real) : undefined)));
  assert.ok(r2.labels.some((l) => l.startsWith('compare Q-03~DEMO-B1')), 'same file + specific shared evidence is a candidate');
});
