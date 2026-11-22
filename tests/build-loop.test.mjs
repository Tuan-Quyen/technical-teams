// Runs plugins/team/workflows/build-loop.js for real, with fake agent/parallel/pipeline/phase/log, and checks the
// QA-Fix loop: finding = failing test, one batch per round, one round counter for review and qa, stall stop, the cap,
// the item JSON as the only state, and that the brief lines are the text inline runs use (run-kit qa-loop.md).
// Run from the repo root: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateItem, ROUND_CAP } from '../plugins/team/tools/team-state.mjs';

const ROOT = path.join(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), 'plugins/team');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8').replace(/\r\n/g, '\n');
const SRC = read('workflows/build-loop.js');
const BODY = SRC.replace(/^export const meta/m, 'const meta');
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const constant = (name) => {
  const m = SRC.match(new RegExp(`^const ${name} = ('(?:[^'\\\\]|\\\\.)*')$`, 'm'));
  assert.ok(m, `build-loop.js defines ${name} as one string literal`);
  return new Function(`return ${m[1]}`)();
};

const baseItem = (o = {}) => ({ v: 1, slug: 'fix-discount', key: 'CART', title: 'Fix full discount total', pipeline: 'fix', tier: 'T1', step: 'build', status: 'running', next: 'Run the build loop', round: 0, findings: [], verdicts: {}, ...o });
const ticket = (id, files) => ({ ticket: id, role: 'developer', brief: `Item: fix-discount · Ticket: ${id}\nGoal: fix it`, files });
const baseArgs = (o = {}) => ({ item: baseItem(), groups: [[ticket('CART-T1', ['src/cart.js'])]], reviewBriefs: { 'code-reviewer': 'Review brief' }, qaBrief: 'QA brief', ...o });
const ok = (label) => ({ status: 'done', verdict: /^(review:|qa)/.test(label) ? 'PASS' : 'none', findings: [], notRun: [], handoff: `handoff ${label}` });
const bug = (o = {}) => ({ id: '', result: 'new', title: 'Full discount adds one cent', severity: 'major', blocking: true, test: 'test/cart.test.js::100% off is 0', ac: 'AC1', file: 'src/cart.js', detail: '', ...o });
const shown = (prompt) => [...prompt.matchAll(/^(F\d+) (\w+) /gm)].map((m) => ({ id: m[1], status: m[2] }));
// Default: every gate re-checks what it is shown as fixed/reopened and reports it verified.
const verifyShown = (prompt) => shown(prompt).filter((r) => r.status === 'fixed' || r.status === 'reopened').map((r) => bug({ id: r.id, result: 'verified', blocking: false }));

const run = async (args, respond = () => undefined) => {
  const calls = [];
  const logs = [];
  const agent = async (prompt, opts = {}) => {
    const call = { label: opts.label, agentType: opts.agentType, prompt };
    calls.push(call);
    let r = respond(call, calls);
    if (r === undefined) {
      r = ok(opts.label);
      if (/^(review:|qa$)/.test(opts.label)) r.findings = verifyShown(prompt);
    }
    return r;
  };
  const parallel = async (fns) => Promise.all(fns.map((f) => f()));
  const fn = new AsyncFunction('agent', 'parallel', 'pipeline', 'phase', 'log', 'args', 'budget', 'workflow', BODY);
  const result = await fn(agent, parallel, null, () => {}, (m) => logs.push(m), args, undefined, undefined);
  return { result, calls, labels: calls.map((c) => c.label), logs };
};

test('happy path: build → review → qa → done, round 0, verdicts on the item, item stays schema-valid', async () => {
  const { result, labels } = await run(baseArgs({ writerBrief: 'Docs brief' }));
  assert.equal(result.status, 'done');
  assert.deepEqual(labels, ['developer:CART-T1', 'review:code-reviewer', 'qa', 'writer']);
  assert.equal(result.item.round, 0);
  assert.equal(result.item.verdicts.qa, 'PASS · r0');
  assert.equal(result.item.status, 'done');
  assert.deepEqual(validateItem(result.item), []);
});

test('a qa blocker with a test: one fix batch, review and qa retest, verified; round 1', async () => {
  let qaRuns = 0;
  const { result, labels, calls } = await run(baseArgs(), (c) => {
    if (c.label === 'qa' && ++qaRuns === 1) return { ...ok('qa'), verdict: 'FAIL', findings: [bug()] };
    return undefined;
  });
  assert.equal(result.status, 'done');
  assert.deepEqual(labels, ['developer:CART-T1', 'review:code-reviewer', 'qa', 'fix:CART-T1:r1', 'review:code-reviewer', 'qa']);
  assert.equal(result.item.round, 1);
  assert.deepEqual(result.item.findings.map((f) => [f.id, f.status, f.by]), [['F1', 'verified', 'qa']]);
  const fix = calls.find((c) => c.label.startsWith('fix:')).prompt;
  assert.match(fix, /F1 major src\/cart\.js test: test\/cart\.test\.js::100% off is 0/);
  const retest = calls.filter((c) => c.label === 'qa')[1].prompt;
  assert.ok(retest.includes(constant('QA_RETEST')), 'second qa run is a retest');
  assert.match(retest, /^F1 fixed major blocking/m);
  assert.deepEqual(validateItem(result.item), []);
});

test('finding = failing test: a blocking claim without a test is non-blocking, and a FAIL resting on it stops for the lead', async () => {
  const { result, labels, logs } = await run(baseArgs(), (c) => (c.label === 'qa' ? { ...ok('qa'), verdict: 'FAIL', findings: [bug({ test: '' })] } : undefined));
  assert.equal(result.status, 'stopped');
  assert.equal(result.needsUser[0].status, 'fail-without-blocker');
  assert.ok(!labels.some((l) => l.startsWith('fix:')), 'nothing is fixed');
  assert.equal(result.item.findings[0].blocking, false);
  assert.ok(logs.some((l) => /without a test/.test(l)));
});

test('every blocker of a round goes to one developer per ticket in one batch', async () => {
  let qaRuns = 0;
  const args = baseArgs({ groups: [[ticket('CART-T1', ['src/cart.js']), ticket('CART-T2', ['src/money.js'])]] });
  const { result, labels } = await run(args, (c) => {
    if (c.label === 'qa' && ++qaRuns === 1) return { ...ok('qa'), verdict: 'FAIL', findings: [bug(), bug({ title: 'Rounding drops cents', test: 'test/cart.test.js::rounding' }), bug({ title: 'Format negative cents', file: 'src/money.js', test: 'test/money.test.js::neg' })] };
    return undefined;
  });
  assert.equal(result.status, 'done');
  const fixes = labels.filter((l) => l.startsWith('fix:'));
  assert.deepEqual(fixes.sort(), ['fix:CART-T1:r1', 'fix:CART-T2:r1']);
  assert.ok(labels.includes('integrate:r1'), 'parallel fixes get one group check');
  assert.equal(result.item.round, 1);
});

test('review fixes and qa fixes share one round counter', async () => {
  let reviews = 0;
  let qaRuns = 0;
  const { result } = await run(baseArgs(), (c) => {
    if (c.label === 'review:code-reviewer' && ++reviews === 1) return { ...ok(c.label), verdict: 'FAIL', findings: [bug({ title: 'Unchecked negative percent', test: 'node -e "applyDiscount(-5)"' })] };
    if (c.label === 'qa' && ++qaRuns === 1) return { ...ok('qa'), verdict: 'FAIL', findings: [bug()] };
    return undefined;
  });
  assert.equal(result.status, 'done');
  assert.equal(result.item.round, 2, 'one review fix + one qa fix = round 2');
  assert.deepEqual(result.item.findings.map((f) => [f.id, f.by, f.status]), [['F1', 'code-reviewer', 'verified'], ['F2', 'qa', 'verified']]);
});

test('a finding reopened twice stalls the loop for the user before the cap', async () => {
  const { result, labels } = await run(baseArgs(), (c) => {
    if (c.label === 'qa') {
      const known = shown(c.prompt).filter((r) => r.status === 'fixed' || r.status === 'reopened');
      return { ...ok('qa'), verdict: 'FAIL', findings: known.length ? known.map((r) => bug({ id: r.id, result: 'failing' })) : [bug()] };
    }
    return undefined;
  });
  assert.equal(result.status, 'stopped');
  assert.equal(result.needsUser[0].status, 'stalled');
  assert.equal(result.item.findings[0].reopened, 2);
  assert.equal(labels.filter((l) => l.startsWith('fix:')).length, 2);
  assert.equal(result.item.status, 'waiting-for-user');
  assert.deepEqual(validateItem(result.item), []);
});

test('the cap: new blockers every round stop blocked after round 3, never a 4th fix', async () => {
  let n = 0;
  const { result, labels } = await run(baseArgs(), (c) => {
    if (c.label === 'qa') return { ...ok('qa'), verdict: 'FAIL', findings: [...verifyShown(c.prompt), bug({ title: `New defect number ${++n}`, test: `t::${n}` })] };
    return undefined;
  });
  assert.equal(result.status, 'blocked');
  assert.equal(result.item.round, ROUND_CAP);
  assert.equal(labels.filter((l) => l.startsWith('fix:')).length, ROUND_CAP);
  assert.equal(result.needsUser.at(-1).status, 'BLOCKED_PENDING_USER_DECISION');
  assert.match(result.item.next, /^Ask the user/);
});

test('an item at the cap with open blockers runs nothing; one with only fixed blockers is retested', async () => {
  const blocked = baseItem({ round: 3, findings: [{ id: 'F1', title: 'Still broken', by: 'qa', severity: 'major', blocking: true, status: 'reopened', test: 't::1', reopened: 1 }] });
  const a = await run(baseArgs({ item: blocked, startAt: 'qa' }));
  assert.equal(a.result.status, 'blocked');
  assert.deepEqual(a.labels, []);
  const pending = baseItem({ round: 3, findings: [{ ...blocked.findings[0], status: 'fixed' }] });
  const b = await run(baseArgs({ item: pending, startAt: 'review' }));
  assert.equal(b.result.status, 'done');
  assert.deepEqual(b.labels, ['review:code-reviewer', 'qa']);
  assert.equal(b.result.item.findings[0].status, 'verified');
});

test('no approval, cap or history rides in args or the item; a round past the cap is refused', async () => {
  for (const k of ['cap', 'approvals', 'maxRounds', 'extraRounds', 'history']) {
    await assert.rejects(run({ ...baseArgs(), [k]: 9 }), new RegExp(`"${k}" is not accepted`));
    await assert.rejects(run(baseArgs({ item: baseItem({ [k]: 9 }) })), new RegExp(`"${k}" is not accepted`));
  }
  await assert.rejects(run(baseArgs({ item: baseItem({ round: 4 }) })), /past the cap 3/);
  await assert.rejects(run(baseArgs({ item: undefined })), /args\.item is required/);
  await assert.rejects(run('{"item": '), /args arrived as a string that is not valid JSON/);
});

test('pre-check: a spec issue stops before any developer', async () => {
  const { result, labels } = await run(baseArgs({ qaPlanBrief: 'Plan brief' }), (c) => (c.label === 'qa:pre-check' ? { ...ok(c.label), verdict: 'FAIL', findings: [bug({ title: 'AC2 contradicts AC3', test: 'spec: AC2 vs AC3' })] } : undefined));
  assert.equal(result.status, 'stopped');
  assert.equal(result.needsUser[0].status, 'spec-issues');
  assert.deepEqual(labels, ['qa:pre-check']);
});

test('a review blocker is fixed before qa runs at all', async () => {
  let reviews = 0;
  const { labels } = await run(baseArgs(), (c) => (c.label === 'review:code-reviewer' && ++reviews === 1 ? { ...ok(c.label), verdict: 'FAIL', findings: [bug({ title: 'Negative percent accepted' })] } : undefined));
  assert.deepEqual(labels, ['developer:CART-T1', 'review:code-reviewer', 'fix:CART-T1:r1', 'review:code-reviewer', 'qa']);
});

test('a fixed blocker the retest skips is never assumed fixed', async () => {
  let qaRuns = 0;
  const { result } = await run(baseArgs(), (c) => {
    if (c.label === 'qa') return ++qaRuns === 1 ? { ...ok('qa'), verdict: 'FAIL', findings: [bug()] } : ok('qa');
    return undefined;
  });
  assert.equal(result.status, 'stopped');
  assert.equal(result.needsUser[0].status, 'retest-incomplete');
  assert.deepEqual(result.needsUser[0].findings, ['F1']);
});

test('a finding no ticket owns stops for the lead instead of guessing a fixer', async () => {
  const args = baseArgs({ groups: [[ticket('CART-T1', ['src/cart.js']), ticket('CART-T2', ['src/money.js'])]] });
  const { result, labels } = await run(args, (c) => (c.label === 'qa' ? { ...ok('qa'), verdict: 'FAIL', findings: [bug({ file: 'src/other.js' })] } : undefined));
  assert.equal(result.status, 'stopped');
  assert.equal(result.needsUser[0].status, 'unowned');
  assert.equal(result.item.round, 0, 'an unowned stop spends no round');
  assert.ok(!labels.some((l) => l.startsWith('fix:')));
});

test('a known finding keeps its ID; a deferred one stays deferred whatever a gate says', async () => {
  const item = baseItem({ findings: [{ id: 'F4', title: 'Old cosmetic issue', by: 'qa', severity: 'minor', blocking: false, status: 'deferred', test: '' }] });
  const { result } = await run(baseArgs({ item }), (c) => (c.label === 'qa' ? { ...ok('qa'), findings: [bug({ id: 'F4', result: 'failing', blocking: false })] } : undefined));
  assert.equal(result.status, 'done');
  assert.deepEqual(result.item.findings.map((f) => [f.id, f.status]), [['F4', 'deferred']]);
});

test('reviewers and qa write no report file below T2; titles are capped at 8 words', async () => {
  const { calls, result } = await run(baseArgs(), (c) => (c.label === 'qa' && !shown(c.prompt).length ? { ...ok('qa'), verdict: 'FAIL', findings: [bug({ title: 'one two three four five six seven eight nine ten' })] } : undefined));
  for (const c of calls.filter((x) => /^(review:|qa)/.test(x.label))) assert.ok(c.prompt.includes(constant('NO_REPORT')), `${c.label}: no report file at T1`);
  assert.equal(result.item.findings[0].title.split(' ').length, 8);
  const t2 = await run(baseArgs({ item: baseItem({ tier: 'T2' }) }));
  for (const c of t2.calls.filter((x) => /^(review:|qa)/.test(x.label))) assert.ok(!c.prompt.includes(constant('NO_REPORT')), `${c.label}: T2 writes its report`);
});

test('inline runs use the same brief lines: each is verbatim in run-kit qa-lines.md', () => {
  const doc = read('skills/run-kit/references/qa-lines.md');
  for (const n of ['FINDING_RULE', 'QA_PRECHECK', 'QA_FIRST', 'QA_RETEST', 'NO_REPORT', 'FIX_RULE', 'CHALLENGE_REPLY']) assert.ok(doc.includes(constant(n)), `qa-lines.md carries ${n} verbatim`);
  assert.match(SRC, /^const ROUND_CAP = 3$/m);
  assert.equal(ROUND_CAP, 3, 'team-state.mjs and build-loop.js share the cap');
});

// ---- challenges: the fixer disputes a finding with evidence; the finder concedes, or one arbiter rules ----
const EVIDENCE = 'AC2 says discount applies before tax; the test asserts after tax';
const challengeF1 = (c) => (c.label.startsWith('fix:') ? { ...ok(c.label), findings: [bug({ id: 'F1', result: 'challenged', detail: EVIDENCE })] } : undefined);
const qaFirstFails = (c, n) => (c.label === 'qa' && n === 1 ? { ...ok('qa'), verdict: 'FAIL', findings: [bug()] } : undefined);

test('challenge conceded: the finder rejects its own finding, no arbiter, no extra round, a decision line', async () => {
  let qaRuns = 0;
  const { result, labels, calls } = await run(baseArgs(), (c) => {
    if (c.label === 'qa') qaRuns++;
    if (c.label === 'qa' && qaRuns === 2) return { ...ok('qa'), verdict: 'FAIL', findings: [bug({ id: 'F1', result: 'conceded', blocking: false })] };
    return qaFirstFails(c, qaRuns) || challengeF1(c);
  });
  assert.equal(result.status, 'done');
  assert.deepEqual(labels, ['developer:CART-T1', 'review:code-reviewer', 'qa', 'fix:CART-T1:r1', 'review:code-reviewer', 'qa']);
  assert.equal(result.item.round, 1);
  const f = result.item.findings[0];
  assert.deepEqual([f.status, f.challenge], ['rejected', EVIDENCE]);
  assert.match(result.item.decisions[0].text, /^F1 rejected: qa conceded/);
  assert.match(result.item.verdicts.qa, /^PASS/, 'a FAIL resting only on the conceded finding passes');
  const fix = calls.find((c) => c.label.startsWith('fix:')).prompt;
  assert.ok(fix.includes(constant('FIX_RULE')));
  const retest = calls.filter((c) => c.label === 'qa')[1].prompt;
  assert.ok(retest.includes(constant('CHALLENGE_REPLY')));
  assert.match(retest, /^F1 challenged major blocking .* · challenge: AC2 says/m);
  assert.ok(!calls[2].prompt.includes(constant('CHALLENGE_REPLY')), 'no reply line without a challenge');
  assert.deepEqual(validateItem(result.item), []);
});

test('challenge maintained: one read-only arbiter; refuted → rejected', async () => {
  let qaRuns = 0;
  const { result, labels, calls } = await run(baseArgs(), (c) => {
    if (c.label === 'qa') qaRuns++;
    if (c.label === 'qa' && qaRuns === 2) return { ...ok('qa'), verdict: 'FAIL', findings: [bug({ id: 'F1', result: 'maintained', detail: 'AC5 overrides AC2 for coupons' })] };
    if (c.label === 'arbiter:F1') return { ruling: 'refuted', reason: 'AC5 is about vouchers, not coupons' };
    return qaFirstFails(c, qaRuns) || challengeF1(c);
  });
  assert.equal(result.status, 'done');
  assert.deepEqual(labels.slice(-2), ['qa', 'arbiter:F1']);
  const arb = calls.find((c) => c.label === 'arbiter:F1');
  assert.equal(arb.agentType, undefined, 'the arbiter inherits no role');
  assert.match(arb.prompt, /counter: AC5 overrides AC2/);
  assert.equal(result.item.findings[0].status, 'rejected');
  assert.equal(result.item.decisions.at(-1).by, 'arbiter');
  assert.deepEqual(validateItem(result.item), []);
});

test('challenge upheld: back to open, fixed next round, a second challenge is ignored', async () => {
  let qaRuns = 0;
  let fixes = 0;
  const { result, labels, calls, logs } = await run(baseArgs(), (c) => {
    if (c.label.startsWith('fix:')) return { ...ok(c.label), findings: [bug({ id: 'F1', result: 'challenged', detail: `${EVIDENCE} ${++fixes}` })] };
    if (c.label === 'arbiter:F1') return { ruling: 'upheld', reason: 'AC2 is about vouchers' };
    if (c.label === 'qa') qaRuns++;
    if (c.label === 'qa' && qaRuns === 2) return { ...ok('qa'), verdict: 'FAIL', findings: [bug({ id: 'F1', result: 'maintained', detail: '' })] };
    return qaFirstFails(c, qaRuns);
  });
  assert.equal(result.status, 'done');
  assert.equal(labels.filter((l) => l.startsWith('fix:')).length, 2);
  assert.equal(result.item.round, 2);
  assert.match(calls.filter((c) => c.label.startsWith('fix:'))[1].prompt, /· challenged before/);
  assert.ok(logs.some((l) => /challenge on F1 ignored \(challenged before\)/.test(l)));
  assert.equal(result.item.findings[0].status, 'verified');
  assert.match(result.item.decisions[0].text, /^F1 upheld/);
});

test('a challenge without evidence counts as fixed and is retested', async () => {
  let qaRuns = 0;
  const { result, logs } = await run(baseArgs(), (c) => {
    if (c.label.startsWith('fix:')) return { ...ok(c.label), findings: [bug({ id: 'F1', result: 'challenged', detail: 'wrong' })] };
    if (c.label === 'qa') qaRuns++;
    return qaFirstFails(c, qaRuns);
  });
  assert.equal(result.status, 'done');
  assert.equal(result.item.findings[0].status, 'verified');
  assert.equal(result.item.findings[0].challenge, undefined);
  assert.ok(logs.some((l) => /ignored \(no evidence\)/.test(l)));
});

test('a reviewer finding is settled in review: the reviewer concedes and its FAIL passes; qa cannot concede it', async () => {
  let reviews = 0;
  const { result, labels } = await run(baseArgs(), (c) => {
    if (c.label === 'review:code-reviewer' && ++reviews === 1) return { ...ok(c.label), verdict: 'FAIL', findings: [bug({ title: 'Discount after tax', test: 'node -e x' })] };
    if (c.label === 'review:code-reviewer') return { ...ok(c.label), verdict: 'FAIL', findings: [bug({ id: 'F1', result: 'conceded', blocking: false })] };
    return challengeF1(c);
  });
  assert.equal(result.status, 'done');
  assert.ok(!labels.some((l) => l.startsWith('arbiter')));
  assert.equal(result.item.findings[0].status, 'rejected');
  assert.match(result.item.verdicts.review, /^PASS/);
  const item = baseItem({ round: 1, findings: [{ id: 'F1', title: 'Discount after tax', by: 'code-reviewer', severity: 'major', blocking: true, status: 'challenged', test: 't::1', challenge: EVIDENCE }] });
  const b = await run(baseArgs({ item, startAt: 'qa' }), (c) => {
    if (c.label === 'qa') return { ...ok('qa'), findings: [bug({ id: 'F1', result: 'conceded', blocking: false })] };
    if (c.label === 'arbiter:F1') return { ruling: 'upheld', reason: 'the AC is clear' };
    return undefined;
  });
  assert.deepEqual(b.labels.slice(0, 2), ['qa', 'arbiter:F1']);
  assert.notEqual(b.result.item.findings[0].status, 'rejected');
});

test('an arbiter spec ruling stops for the spec owner, the finding left challenged', async () => {
  let qaRuns = 0;
  const { result } = await run(baseArgs(), (c) => {
    if (c.label === 'qa') qaRuns++;
    if (c.label === 'qa' && qaRuns === 2) return { ...ok('qa'), verdict: 'FAIL', findings: [bug({ id: 'F1', result: 'maintained', detail: 'AC2 is ambiguous' })] };
    if (c.label === 'arbiter:F1') return { ruling: 'spec', reason: 'AC2 and AC5 conflict' };
    return qaFirstFails(c, qaRuns) || challengeF1(c);
  });
  assert.equal(result.status, 'stopped');
  assert.deepEqual([result.needsUser[0].status, result.needsUser[0].findings], ['spec-issue', ['F1']]);
  assert.equal(result.item.findings[0].status, 'challenged');
  assert.match(result.item.next, /spec owner/);
  assert.deepEqual(validateItem(result.item), []);
});

test('not run is never PASS: a qa PASS listing unrun checks stops for the user instead of closing', async () => {
  const { result, labels } = await run(baseArgs({ writerBrief: 'Docs brief' }), (c) => (c.label === 'qa' ? { ...ok('qa'), notRun: ['AC3 live check'] } : undefined));
  assert.equal(result.status, 'stopped');
  assert.deepEqual([result.needsUser[0].status, result.needsUser[0].checks], ['not-run', ['AC3 live check']]);
  assert.ok(!labels.includes('writer'), 'no docs before the user decides');
  assert.match(result.item.verdicts.qa, /^PASS · r0 · not-run: AC3 live check$/);
  assert.match(result.item.next, /^Ask the user/);
});
