# technical-team

Plugin Claude Code gồm một team kỹ thuật gọn nhẹ:

- **Orchestrator (`team-orchestrator`)**: điều phối — phân loại yêu cầu, chọn pipeline, spawn agent tuần tự hoặc song song, giữ trạng thái từng item trong `.team/items/<slug>.json` (`.team/STATE.md` được sinh ra từ đó) để làm tiếp được khi session bị limit hoặc mở session mới.
- **13 agent chuyên môn**: mỗi agent một vai trò, prompt ngắn, ghi đúng file của mình theo template.
- **11 lệnh**: `run` (giao cho orchestrator tự phân loại) + `triage` (xếp hạng issue) + `standup` (báo cáo tiến độ sprint) + `retrospect` (nhìn lại các phiên đã chạy, đề xuất sửa team) + 7 pipeline, mỗi pipeline xử lý một loại vấn đề.
- **Màu phân loại agent**: mỗi agent có một `color:` trong frontmatter (nhãn trong UI + badge khi orchestrator spawn).
- **14 template** trong `plugins/team/templates/`, chia folder theo loại (`core/`, `requirements/`, `design/`, `adr/`, `reports/`).
- **`run-kit`**: tài liệu tra cứu khi chạy team — roster, các lệnh pipeline, cách viết brief, workspace `.team/`, handoff. Orchestrator nạp khi cần; không tự spawn ai.
- **5 skill** nạp khi cần: `business-analysis` (spec), `plan` (thiết kế + ticket + lập sprint: ai tham gia bước nào, xếp theo priority, vừa capacity, board), `development-process` (code + unit test + evidence), `test-process` (QA), `retrospect` (playbook audit team: nguồn, ngưỡng tín hiệu, luật evidence, report, tự phản biện; kèm script `retro-miner.mjs` đọc transcript).

```
bạn ──▶ /technical-team:run "login trả 500"
            │
            ▼
        team-orchestrator ── phân loại: bug ──▶ pipeline fix
            │   ghi items/<slug>.json trước/sau mỗi bước
            ▼
        debugger ──▶ qa pre-check ──▶ developer ──▶ code-reviewer ──▶ qa ──▶ đóng item
                     (regression test)    ▲               │ FAIL         │ FAIL
                                          └───────────────┴──────────────┘
```

Plugin không gắn với ngôn ngữ hay framework nào: agent tự đọc stack, convention và lệnh build/test của repo.

## Cài đặt

Repo `https://github.com/Tuan-Quyen/technical-teams` là một marketplace (`technical-team-marketplace`); plugin nằm ở `plugins/team/`.

| Mục đích | Lệnh |
|---|---|
| Thêm marketplace | `claude plugin marketplace add Tuan-Quyen/technical-teams` |
| Cài cho mọi project | `claude plugin install technical-team@technical-team-marketplace --scope user` |
| Cài cho một repo (cả team) | trong repo: thêm `--scope project` cho cả hai lệnh trên |
| Cập nhật | `claude plugin marketplace update technical-team-marketplace` rồi `claude plugin update technical-team@technical-team-marketplace` |
| Gỡ | `claude plugin uninstall technical-team@technical-team-marketplace` |

Repo private: máy cài cần quyền đọc repo qua git (ví dụ `gh auth login`).

## Hai cách chạy orchestrator

| Cách | Lệnh | Khi nào |
|---|---|---|
| Orchestrator là session chính | `claude --agent technical-team:team-orchestrator` | làm việc cả ngày với team; mọi yêu cầu đi qua orchestrator |
| Gọi từng lần | `/technical-team:run <yêu cầu>` hoặc một pipeline cụ thể | session bình thường, chỉ thỉnh thoảng cần team |

Orchestrator phải chạy ở session chính: subagent không spawn được subagent khác.

**Tiếp tục sau khi bị limit hoặc mở session mới:** gõ `/technical-team:run` (không tham số). Orchestrator đọc `.team/STATE.md` (sinh từ `.team/items/`) và làm tiếp từ cột **Next**.

## Lệnh

| Lệnh | Vấn đề | Agent được spawn |
|---|---|---|
| `/technical-team:run` | bất kỳ; orchestrator tự phân loại (trống = resume) | theo pipeline orchestrator chọn |
| `/technical-team:feature` | làm tính năng (`--small` = T0, `--tier T0\|T1\|T2`) | theo tier, bảng dưới |
| `/technical-team:fix` | sửa bug | T1: debugger → developer (regression test trước, rồi sửa) → code-reviewer (∥ security) → qa · T2 thêm qa pre-check |
| `/technical-team:review` | review diff, không sửa code; finding không thuộc item nào → đề xuất `triage` để qa nhập vào `ISSUES.md` | code-reviewer ∥ security (∥ dba) |
| `/technical-team:test` | bổ sung và chạy test | qa |
| `/technical-team:infra` | CI/CD, Docker, deploy | devops → code-reviewer ∥ security → writer |
| `/technical-team:release` | kiểm tra sẵn sàng phát hành, GO/NO-GO; issue mở blocker/critical/P1 → NO-GO trừ khi bạn chấp nhận; release notes có Known issues | qa ∥ security ∥ devops (∥ dba) → writer |
| `/technical-team:new` | project mới từ ý tưởng/PRD | ba → architect ∥ designer → pm → từng milestone như `feature` (qa pre-check trước) → release |
| `/technical-team:triage` | xếp hạng danh sách issue trong `.team/ISSUES.md` (nhận thêm file/list rời), gộp trùng, bạn chọn cái để fix. `/run` tự dùng khi: bạn đưa nhiều bug/issue một lúc, `/run` trống mà không có item mở, hoặc đóng item còn ≥5 dòng `new` | qa |
| `/technical-team:retrospect` | nhìn lại 7–30 ngày (mặc định 14) các phiên Claude Code dùng **phiên bản plugin hiện tại** (bản cũ bị bỏ qua): `team-retrospector` đọc transcript local, đối chiếu với file của plugin, so metric với lần retro trước (Δ theo version) rồi đề xuất thêm/bớt/sửa agent, skill, command, hook, workflow kèm evidence; bạn chọn cái để áp dụng. Report ngắn (≤ 600 từ, paste được vào prompt) `.team/retrospect/<ngày>/retrospect.md`: đề xuất new / update / delete chia theo Agents · Skills · Commands, mỗi đề xuất có Why · Improves which part · Workflow · Committed improvement (metric hiện tại → mục tiêu); draft đầy đủ ở `drafts/`, diff ở `changes.md`; không sửa plugin | retrospector |
| `/technical-team:standup` | báo cáo trạng thái trên Task board `.team/TASKS.md`: việc xong / đang làm, blocker, rủi ro, burn của sprint. `close` = đóng sprint (review ngày cam kết vs xong, carry-over), `plan [<tuần> <ngày>] [<mục tiêu/epic>]` = lập sprint theo skill `plan` (ba spec + Must/Should/Could → architect → pm chia ticket, xếp theo priority vừa capacity, critical path) và chỉ mở sprint khi bạn OK. Chỉ chạy khi bạn yêu cầu | pm (`plan`: + ba, designer, architect) |

`→` là tuần tự, `∥` là song song.

**Làn theo tier** — orchestrator ghi `tier` vào item; bạn ép bằng `--tier`; orchestrator được nâng tier, hạ thì ghi lý do.

| Tier | Khi nào | `feature` spawn |
|---|---|---|
| T0 | chỉ khi bạn gõ `--small`: text, CSS, một hàm theo pattern có sẵn | developer → code-reviewer (orchestrator tự chạy lại test) |
| T1 | mặc định: hợp kiến trúc hiện có | ba (≤5 AC) → developer → code-reviewer (∥ security/dba khi diff chạm tới) → qa — tối đa 4, không pm |
| T2 | screen flow/contract/module mới, auth, xử lý thanh toán, migration, xoá/ghi đè dữ liệu | ba → (designer) → architect (+dba) → pm → qa pre-check → developer → code-reviewer ∥ security → qa → writer |

**Vòng QA-Fix:** finding = một test fail hoặc lệnh repro, tiêu đề ≤8 từ, ID `F1`, `F2`… trong `.team/items/<slug>.json` (ngoài item: `CART#F3`); chỉ chặn PASS khi vi phạm AC, regression hoặc rủi ro nghiêm trọng *và* có test. Mọi blocker của một vòng sửa một lô; một bộ đếm `round` cho cả review lẫn qa, tối đa 3; finding mở lại hai lần thì dừng hỏi bạn; hết vòng thì item `blocked`, chờ chính bạn trả lời — không bao giờ tự PASS. **Phản biện:** developer có thể `challenged` một finding sai (kèm bằng chứng: dòng AC/spec, lệnh + output), mỗi finding một lần; bên tìm ra concede → `rejected`, giữ ý → một trọng tài read-only phân xử (upheld / refuted / spec → hỏi owner). Mọi role khác phản biện input sai bằng `needs-input` + dòng `Challenge:`. Dưới T2 không gate nào ghi file report. **Chất lượng chia ba lớp:** developer viết và chạy unit test; code-reviewer review diff; qa kiểm chứng độc lập (integration/E2E, live preview) và ra verdict. Ghi ADR: nói với orchestrator "ghi quyết định …". Không lệnh nào tự commit, push hay deploy.

`review`, `release` và vòng (qa pre-check →) build → review → qa của `feature`/`fix`/`infra`/`new` (`workflows/build-loop.js`, có vòng sửa tối đa 3 lượt) và bước tạo ticket của `feature`/`new` (`workflows/plan-tickets.js`, code kiểm tra ticket rồi trả lỗi cho pm) chạy bằng Workflow tool, gọi theo tên (`technical-team:team-review`, `team-release`, `team-build-loop`, `team-plan-tickets`; không tìm thấy tên thì đọc file và truyền làm `script`) của Claude Code (script trong `plugins/team/workflows/`, chạy nền, một thẻ tiến độ); không có Workflow tool thì chạy inline như cũ.

## Agent

| Agent | Việc | Ghi | Badge |
|---|---|---|---|
| `team-orchestrator` | phân loại, điều phối, ghi nhận verdict — không tự quyết đóng ticket/item | `items/<slug>.json`, chuyển vào `archive/` | 🟪 🧭 |
| `team-ba` | yêu cầu → story + AC Given/When/Then | `requirements/<slug>.md`, `PRODUCT.md` | 🩵 🔍 |
| `team-designer` | flow, màn hình, mọi trạng thái, copy | `frontend-design/DESIGN.md`, `frontend-design/<slug>.md` | 🩷 🎨 |
| `team-architect` | thiết kế + kế hoạch triển khai, ADR | `system-design/<slug>.md`, `ARCHITECTURE.md`, `adr/` | 🟦 📐 |
| `team-pm` | PM / Scrum Master: chia item (epic) thành ticket kèm ước tính ngày công thực tế, phụ thuộc, người phụ trách; sprint theo thời gian, tiến độ, rủi ro, blocker, status report | `TASKS.md` (Task board) | 🟨 📋 |
| `team-developer` | viết code + unit/component test, tự chạy build/lint/test, nộp evidence | code, unit/component test | 🟩 🛠️ |
| `team-debugger` | tìm root cause, không sửa code | `reports/<slug>/debug.md` (T2) | 🟧 🐞 |
| `team-code-reviewer` | review diff | `reports/<slug>/review.md` (T2) | 🟥 👓 |
| `team-qa` | pre-check trước build (test plan, RTM, lỗi spec); sau review: integration/E2E, live preview, UX, regression, PASS/FAIL | integration/E2E test, `reports/<slug>/qa.md` (T2) | 🟨 🧪 |
| `team-security` | audit bảo mật | `reports/<slug>/security.md` (T2) | 🟥 🛡️ |
| `team-dba` | migration không downtime, chỉ DB local/test | migration, mục "Data and migrations" của `system-design/<slug>.md` | 🟦 🗄️ |
| `team-devops` | CI/CD, Docker, manifest, xác minh local | file infra | 🟩 🚢 |
| `team-writer` | README, API docs, CHANGELOG, runbook | docs sản phẩm, `.team/docs/**` | 🩵 ✍️ |
| `team-retrospector` | retro + audit chính team: theo skill `retrospect`: transcript local (`retro-miner.mjs`), `.team/`, git, định nghĩa agent; đối chiếu từng tín hiệu với file của plugin, đề xuất sửa kèm evidence; không sửa plugin | `retrospect/<YYYY-MM-DD>/` | 🟪 🔭 |

Quy tắc chung + mẫu `### Handoff` của 13 agent chuyên môn nằm ở **một chỗ**: skill `specialist-rules`, mỗi agent preload qua `skills:` trong frontmatter. Hai quy tắc được **hook** cưỡng chế (`hooks/hooks.json`, chỉ áp cho subagent `technical-team:team-*`, không chạm session của bạn hay orchestrator): specialist không được `git commit`/`git push`, và báo cáo thiếu `### Handoff` (Status + Evidence) bị trả lại. Lưu `.team/items/*.json` thì hook sinh lại `STATE.md`. Luật chung của mọi pipeline (tier, opt-in workflow, task list, không commit/push) nằm **một chỗ**: run-kit §2.

## Màu agent

Màu lấy từ `color:` trong frontmatter của agent (nhãn agent trong Claude Code); orchestrator báo trước mỗi lần spawn bằng badge `🟨 qa — retest F2`. Claude Code chỉ có 8 màu cho 14 agent nên màu nhóm theo vai trò:

| Màu | Nhóm | Agent |
|---|---|---|
| 🟥 red | gate | code-reviewer, security |
| 🟩 green | builder | developer, devops |
| 🟦 blue | design/data | architect, dba |
| 🟨 yellow | lập kế hoạch/kiểm tra | pm, qa |
| 🩵 cyan | ngôn từ/nhu cầu | ba, writer |
| 🟪 purple | chính team | orchestrator, retrospector |
| 🟧 orange · 🩷 pink | riêng | debugger · designer |

## MCP và skill của project

Agent không khai báo allowlist `tools`, nên kế thừa mọi MCP tool (Prisma, Vercel, Jira, Figma…) và skill mà session của project có; `disallowedTools` chỉ chặn những gì vai trò không được làm.

| Agent | Chặn | Nhận MCP + skill của project |
|---|---|---|
| `team-developer` · `team-dba` · `team-devops` · `team-qa` | không | ✅ |
| `team-debugger` | `Edit`, `NotebookEdit` (chỉ chẩn đoán) | ✅ |
| `team-retrospector` | `Edit`, `NotebookEdit` (chỉ ghi report mới, không sửa plugin) | ✅ |
| `team-code-reviewer` · `team-security` · `team-writer` | `NotebookEdit` (vẫn ghi report/docs của mình) | ✅ |
| `team-ba` · `team-pm` · `team-architect` · `team-designer` | `Bash`, `NotebookEdit` | ✅ |

- Orchestrator ghi trong brief những MCP/skill bước đó cần và việc nào bên ngoài repo người dùng đã cho phép.
- Mỗi bước, orchestrator tự suy luận từ mục tiêu bước và stack để chọn skill/MCP agent cần (Figma MCP cho designer, database MCP cho dba, docs MCP cho architect/developer, issue tracker cho ba/pm, hosting/CI cho devops, browser/emulator MCP hoặc skill run/preview của project cho qa/developer/debugger…) rồi giao qua dòng `Tools:` trong brief. Agent dùng đúng tool đó; brief không ghi hoặc thiếu → tự chọn và ghi vào **Evidence**. Thiếu tool cần thiết → báo người dùng; bước kiểm tra không chạy được ghi là chưa chạy, không tính PASS.
- Đọc qua MCP thì tự do; thay đổi bên ngoài repo (deploy, migrate DB dùng chung, tạo issue, gửi tin) chỉ khi người dùng yêu cầu. Mỗi lần gọi MCP được ghi vào **Evidence** của handoff.
- `disallowedTools` chặn cả một tool, không chặn theo tham số. Muốn chặn cứng một hành động (vd `mcp__vercel__deploy_to_vercel`), thêm vào `permissions.deny` trong `.claude/settings.json` của project.
- Plugin không nạp trong cloud session (claude.ai/code); điều trên chỉ áp dụng khi chạy trên máy.

### Skill hay agent riêng của project?

| Cần | Viết | Team dùng thế nào |
|---|---|---|
| agent team biết **cách** dùng một tool trong repo (convention, lệnh, checklist) | skill: `.claude/skills/<ten>/SKILL.md` | agent nào cần thì tự gọi qua `Skill` |
| một vai trò riêng, hoặc cần `mcpServers` / `hooks` / `permissionMode` (agent của plugin không có) | agent: `.claude/agents/<ten>.md` | orchestrator tự tìm và giao bước phù hợp |

Orchestrator đọc `.claude/agents/*.md` khi bắt đầu, so `description` của từng agent với bước đang làm rồi chọn:

- **replace**: agent của project làm cả bước thay agent của team (vd `prisma-expert` thay `team-dba` cho migration).
- **consult**: agent của project góp ý trước (`Write: none`), orchestrator chuyển nguyên văn vào brief của agent team.

Gate không đổi: code của agent project vẫn qua code-reviewer, qa, security. Orchestrator báo bạn đã chọn agent nào; nói "không dùng X" là orchestrator bỏ X cho item đó. Viết `description` rõ lĩnh vực (vd "Prisma schema và migration của repo này") để orchestrator chọn đúng.

## Workspace `.team/`

```
.team/
├── items/<slug>.json           session điều phối (orchestrator, hoặc session tự gọi agent): bước, việc tiếp, round, finding, verdict, câu hỏi
├── STATE.md                    sinh tự động từ items/ (điểm resume), không ai ghi tay
├── TASKS.md                    pm: Task board — sprint, ticket (ước tính ngày công, thời gian agent chạy), rủi ro, status report
├── ISSUES.md                   qa (`triage`): issue đã xếp hạng; orchestrator thêm dòng mới, đặt status/item khi đóng item
├── retrospect/<YYYY-MM-DD>/    retrospector (`retrospect`): `retrospect.md` (≤ 600 từ, ngôn ngữ của bạn), `changes.md` (diff), `drafts/<agents|skills|commands>/` (file đầy đủ), `evidence/` (digest, gitignore), `drafts/`
├── PRODUCT.md                  ba: sự thật hiện hành của sản phẩm
├── ARCHITECTURE.md             architect: tổng quan, trần ~200 dòng, trỏ sang ADR
├── requirements/<slug>.md      ba
├── system-design/<slug>.md     architect: thiết kế + kế hoạch triển khai
├── frontend-design/DESIGN.md   designer: design system
├── frontend-design/<slug>.md   designer
├── adr/NNNN-<quyet-dinh>.md    architect; số NNNN do orchestrator cấp trong brief
├── reports/<slug>/qa.md        qa, chỉ T2: test plan + RTM (một cột trạng thái) → verdict
├── reports/<slug>/review.md    code-reviewer, chỉ T2
├── reports/<slug>/security.md  security, chỉ T2
├── reports/<slug>/debug.md     debugger, chỉ T2
├── docs/**                     writer
└── archive/<slug>/             mọi file của item đã đóng
```

Mỗi file (trừ `docs/**`) được viết theo template trong `plugins/team/templates/`:

```
templates/
├── core/          TASKS.md · PRODUCT.md · ARCHITECTURE.md · ISSUES.md · RETROSPECT.md
├── requirements/  requirements.md
├── design/        system-design.md · DESIGN.md · frontend-design.md
├── adr/           adr.md
└── reports/       qa.md · review.md · security.md · debug.md
```

 agent đọc template trước rồi điền, không tự đặt cấu trúc. Spec chỉ ghi sự thật hiện hành: đổi gì thì viết lại mục đó, quyết định ghi một dòng dưới `## Decision log`. Report T2 chỉ tham chiếu finding theo ID của item. Khi đóng item, orchestrator chuyển các file của item vào `archive/<slug>/` và xóa JSON của nó. Hết mỗi milestone (`new`), workflow `team-compact` viết gọn spec, một agent độc lập kiểm không mất gì.

**ID dễ đọc:** mỗi item có một *key* ngắn lấy từ slug (`cart-checkout` → `CART`), ghi trong item JSON và tiêu đề của item trong `TASKS.md`. Người đọc thấy item qua **nhãn** `[AREA] [FEATURE]` (`[CART] [CHECKOUT]`, `[STORE] [BANNER]`) trong `STATE.md`, tiêu đề `TASKS.md` và báo cáo; `area` mặc định là chữ đầu của slug, đặt riêng khi slug không bắt đầu bằng module. Key không bao giờ thêm số (`CART2`): trùng thì lấy thêm chữ của slug (`cart-charges` → `CARTCH`), hết cách thì hỏi bạn. ID gắn key: `CART-T1` ticket · `CART-AC1` acceptance criterion · `CART-E1` edge case · `CART-M1` milestone; finding là `F1` trong item (`CART#F1` khi nhắc từ nơi khác). `BR-1`, `G-1` là quy tắc/mục tiêu của cả sản phẩm (`PRODUCT.md`), không cần key. Báo cáo gửi bạn luôn kèm tiêu đề ngắn bên cạnh ID, ví dụ `CART#F3 (lưu form lỗi lần 2)`.

Dự án cũ còn `T-1`, `F-001`, `AC1` thì chuyển bằng script đi kèm plugin:

```bash
node <plugin>/skills/run-kit/scripts/migrate-ids.mjs <thư-mục-dự-án>           # chạy thử, chỉ in ra những gì sẽ đổi
node <plugin>/skills/run-kit/scripts/migrate-ids.mjs <thư-mục-dự-án> --write   # ghi, tự kiểm tra, không để lại file .bak (lỗi thì khôi phục)
node <plugin>/skills/run-kit/scripts/migrate-ids.mjs <thư-mục-dự-án> --all     # thêm cả docs và comment/tên test trong source ngoài .team/
```

- Script tự đặt key cho từng item; muốn tự chọn thì thêm `--key <slug>=<KEY>`.
- Chạy lại nhiều lần cũng không đổi thêm gì.
- Mỗi ID cũ nhận key của item định nghĩa ra nó; không rõ thì để nguyên và in số dòng để bạn sửa tay.

Nên commit `.team/` nếu muốn cả team dùng chung.

## Phát triển plugin

Test và validate nằm ngoài plugin, ở `tests/` của repo (Node ≥ 21):

| Việc | Lệnh |
|---|---|
| Test (gồm cả validate nếu có `claude` CLI) | `npm test` |
| Chỉ validate | `npm run validate` |
| Eval hành vi thật, nhanh (Claude chạy plugin, mỗi case 1 lần; cần `ANTHROPIC_API_KEY` hoặc đã login, ~$0.8, không chạy trên CI) | `npm run eval` (`-- --case <tên>` cho một case) |
| Eval đầy đủ trước release (mỗi case 3 lần + nhánh không plugin để đo Δ) | `npm run eval:full` |
| Chạy thử bản đang sửa | `claude --plugin-dir plugins/team`, sửa xong gõ `/reload-plugins` |

| Test | Kiểm |
|---|---|
| `tests/build-loop.test.mjs` | chạy thật `build-loop.js` với agent giả: lô sửa, một bộ đếm, stall, cap, challenge (concede / trọng tài), câu brief giống hệt `run-kit` `qa-lines.md` |
| `tests/team-state.test.mjs` | schema item JSON, view `STATE.md`, luật spec, `migrate` từ 0.32 |
| `tests/hooks.test.mjs` | chặn commit/push của specialist, Handoff bắt buộc, sinh lại `STATE.md` |
| `tests/retrospect.test.mjs` | `skills/retrospect/scripts/retro-miner.mjs` trên transcript giả: lọc phiên plugin/probe, cửa sổ ngày, usage, work inventory, correction, health (Status/Next, StructuredOutput), guard, evidence ref đúng dòng, `--show`, che secret |
| `tests/structure.test.mjs` | khung section của từng loại file: agent, command, skill, reference (CLAUDE.md § Document format) |
| `tests/contract.test.mjs` | tên lệnh, agent, đường dẫn `.team/` công khai (`tests/contract.json`) |
| `tests/commands.test.mjs` | bộ lệnh/agent/skill, file được nhắc tới tồn tại, layout `.team/`, README, manifest, `claude plugin validate --strict` |

Eval (`plugins/team/evals/<case>/case.yaml`, fixture `evals/_fixtures/tiny-node.sh`; grader tất định, LLM judge chỉ cho chất lượng):

| Nhóm | Case | Kiểm |
|---|---|---|
| Phân loại | `route-feature-t2`, `route-feature-t1-tax`, `route-fix-t1` | `/technical-team:run` chọn đúng pipeline + tier theo run-kit |
| Tự kích hoạt | `nl-feature-plan`, `nl-bug-plan` | câu tự nhiên, không slash command → đúng lane, đúng thứ tự agent |
| Phủ định | `neg-question-no-pipeline`, `neg-auth-typo-not-t2` | câu hỏi → trả lời, không spawn/không item; sửa chữ ở trang login → không lên T2 |
| Làm thật | `ba-writes-gwt`, `specialist-handoff`, `state-md-generated` | ba viết spec GWT có biên 100; debugger tìm đúng lỗi + Handoff; hook sinh lại `STATE.md` | Trên Windows eval không cấp được Bash/PowerShell (không có sandbox) nên chặn `git commit` chỉ được kiểm ở `tests/hooks.test.mjs`. Báo cáo HTML ở `plugins/team/evals/results/` (gitignored).

Thêm, đổi tên hoặc xóa command/agent/skill/template → cập nhật bảng ở trên và danh sách trong `tests/commands.test.mjs`.

```
technical-team/
├── .claude-plugin/marketplace.json
├── package.json         npm test · npm run validate · npm run eval[:full]
├── CHANGELOG.md
├── tests/               test + validate cho plugin
├── LICENSE
├── README.md
└── plugins/team/        plugin technical-team
    ├── .claude-plugin/plugin.json
    ├── agents/          team-orchestrator + 13 agent
    ├── commands/        run + triage + standup + retrospect + 7 pipeline
    ├── hooks/           guard.mjs: commit/push, Handoff, STATE.md
    ├── tools/           team-state.mjs (item JSON, view, migrate) — dùng chung (hook, orchestrator, tests)
    ├── workflows/       build-loop · review · release · plan-tickets · compact
    ├── templates/       core · requirements · design · adr · reports
    └── skills/          run-kit (+ scripts/migrate-ids.mjs) · specialist-rules · business-analysis · plan · development-process · test-process · retrospect
```

## Liên kết và giấy phép

| | |
|---|---|
| Repo | https://github.com/Tuan-Quyen/technical-teams |
| Trang | https://github.com/Tuan-Quyen/technical-teams#readme |
| Giấy phép | [MIT](LICENSE) |
