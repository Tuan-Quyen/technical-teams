# technical-team

Plugin Claude Code gồm một team kỹ thuật gọn nhẹ:

- **Tech lead (`team-lead`)**: orchestrator — phân loại yêu cầu, chọn pipeline, spawn agent tuần tự hoặc song song, giữ `.team/STATE.md` để làm tiếp được khi session bị limit hoặc mở session mới.
- **12 agent chuyên môn**: mỗi agent một vai trò, prompt ngắn, ghi đúng file của mình theo template.
- **9 lệnh**: `run` (giao cho lead tự phân loại) + `crew` (tùy biến team) + 7 pipeline, mỗi pipeline xử lý một loại vấn đề.
- **Crew có cá tính**: mỗi agent có màu, emoji và vibe (giọng điệu) riêng; đổi emoji, biệt danh, vibe, màu badge theo từng project trong `.team/CREW.md`.
- **14 template** trong `plugins/team/templates/`, chia folder theo loại (`core/`, `requirements/`, `design/`, `adr/`, `reports/`).
- **`run-kit`**: tài liệu tra cứu khi chạy team — roster, các lệnh pipeline, cách viết brief, workspace `.team/`, handoff. Lead nạp khi cần; không tự spawn ai.
- **3 skill** nạp khi cần: `business-analysis`, `test-process`, `live-preview`.

```
bạn ──▶ /technical-team:run "login trả 500"
            │
            ▼
        team-lead ── phân loại: bug ──▶ pipeline fix
            │   ghi STATE.md trước/sau mỗi bước
            ▼
        debugger ──▶ developer ──▶ code-reviewer ──▶ qa ──▶ đóng item
                        ▲               │ FAIL         │ FAIL
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

## Hai cách chạy lead

| Cách | Lệnh | Khi nào |
|---|---|---|
| Lead là session chính | `claude --agent technical-team:team-lead` | làm việc cả ngày với team; mọi yêu cầu đi qua lead |
| Gọi từng lần | `/technical-team:run <yêu cầu>` hoặc một pipeline cụ thể | session bình thường, chỉ thỉnh thoảng cần team |

Lead phải chạy ở session chính: subagent không spawn được subagent khác.

**Tiếp tục sau khi bị limit hoặc mở session mới:** gõ `/technical-team:run` (không tham số). Lead đọc `.team/STATE.md` và làm tiếp từ cột **Next step**.

## Lệnh

| Lệnh | Vấn đề | Agent được spawn |
|---|---|---|
| `/technical-team:run` | bất kỳ; lead tự phân loại (trống = resume) | theo pipeline lead chọn |
| `/technical-team:feature` | làm tính năng (`--small` cho thay đổi nhỏ) | ba → designer (nếu có UI) → architect (+dba) → pm → developer → code-reviewer ∥ security → qa → writer |
| `/technical-team:fix` | sửa bug | debugger → developer → code-reviewer → qa |
| `/technical-team:review` | review diff, không sửa code | code-reviewer ∥ security (∥ dba) |
| `/technical-team:test` | bổ sung và chạy test | qa |
| `/technical-team:infra` | CI/CD, Docker, deploy | devops → code-reviewer ∥ security → writer |
| `/technical-team:release` | kiểm tra sẵn sàng phát hành, GO/NO-GO | qa ∥ security ∥ devops (∥ dba) → writer |
| `/technical-team:new` | project mới từ ý tưởng/PRD | ba → architect ∥ designer → pm → từng milestone như `feature` → release |
| `/technical-team:crew` | xem hoặc đổi emoji, biệt danh, vibe, màu badge | không spawn ai; lead ghi `.team/CREW.md` |

`→` là tuần tự, `∥` là song song. Ghi ADR: nói với lead "ghi quyết định …", lead giao thẳng cho architect. Không lệnh nào tự commit, push hay deploy.

## Agent

| Agent | Việc | Ghi | Badge |
|---|---|---|---|
| `team-lead` | phân loại, điều phối, theo dõi | `STATE.md`, chuyển vào `archive/` | 🟪 🧭 |
| `team-ba` | yêu cầu → story + AC Given/When/Then | `requirements/<slug>.md`, `PRODUCT.md` | 🩵 🔍 |
| `team-designer` | flow, màn hình, mọi trạng thái, copy | `frontend-design/DESIGN.md`, `frontend-design/<slug>.md` | 🩷 🎨 |
| `team-architect` | thiết kế + kế hoạch triển khai, ADR | `system-design/<slug>.md`, `ARCHITECTURE.md`, `adr/` | 🟦 📐 |
| `team-pm` | ticket, phụ thuộc, nhóm song song, milestone, trạng thái ticket | `TASKS.md` | 🟨 📋 |
| `team-developer` | viết code, tự chạy build/lint/test | code | 🟩 🛠️ |
| `team-debugger` | tìm root cause, không sửa code | `reports/<slug>/debug.md` | 🟧 🐞 |
| `team-code-reviewer` | review diff | `reports/<slug>/review.md` | 🟥 👓 |
| `team-qa` | test plan, RTM, test, live preview, PASS/FAIL | test, `reports/<slug>/qa.md` | 🟨 🧪 |
| `team-security` | audit bảo mật | `reports/<slug>/security.md` | 🟥 🛡️ |
| `team-dba` | migration không downtime, chỉ DB local/test | migration, mục "Data and migrations" của `system-design/<slug>.md` | 🟦 🗄️ |
| `team-devops` | CI/CD, Docker, manifest, xác minh local | file infra | 🟩 🚢 |
| `team-writer` | README, API docs, CHANGELOG, runbook | docs sản phẩm, `.team/docs/**` | 🩵 ✍️ |

Mỗi agent chuyên môn có khối `## Rules` (quy tắc chung + `### Handoff`) giống hệt nhau ở cuối file, để agent tự đủ; test fail nếu 12 bản lệch nhau, nên sửa một chỗ thì sửa cả 12.

## Crew: màu, emoji, vibe

Mỗi agent có sẵn một **Persona** trong file của nó: `color:` trong frontmatter (màu nhãn agent trong Claude Code), emoji và vibe. Agent mở đầu câu trả lời bằng `<emoji> <tên>:`, ký tên vào handoff (`### Handoff · 🧪 Quinn`), còn lead báo trước mỗi lần spawn bằng một badge:

```
🟨 🧪 Quinn (qa) — retest Q-02
🟥 👓 code-reviewer — review vòng 2
```

Đổi theo project bằng `/technical-team:crew`:

```
/technical-team:crew                                   xem cả team: default hay override
/technical-team:crew qa name=Quinn vibe=cheerful       đặt biệt danh + vibe cho qa
/technical-team:crew developer emoji=🦊 color=orange   đổi emoji và màu badge
/technical-team:crew * vibe=terse                      cả team nói ngắn
/technical-team:crew reset qa                          qa về mặc định
```

| Vibe có sẵn | Giọng |
|---|---|
| `calm` | điềm tĩnh, không dấu chấm than |
| `cheerful` | vui vẻ, ít emoji, mừng ngắn khi xong việc |
| `blunt` | thẳng, không rào đón |
| `formal` | lịch sự, chính xác, không emoji trong văn |
| `mentor` | giải thích lý do, gợi ý điều nên học |
| `terse` | ít chữ nhất có thể |

Hoặc viết vibe tự do ("nói như hướng dẫn viên du lịch"). Vibe chỉ đổi giọng: không bao giờ đổi sự thật, phạm vi, verdict hay các trường handoff; vibe kiểu "luôn PASS" bị từ chối. Màu trong `CREW.md` chỉ đổi badge của lead; màu nhãn agent trong UI lấy từ `color:` của plugin, không đổi được theo project.

## MCP và skill của project

Agent không khai báo allowlist `tools`, nên kế thừa mọi MCP tool (Prisma, Vercel, Jira, Figma…) và skill mà session của project có; `disallowedTools` chỉ chặn những gì vai trò không được làm.

| Agent | Chặn | Nhận MCP + skill của project |
|---|---|---|
| `team-developer` · `team-dba` · `team-devops` · `team-qa` | không | ✅ |
| `team-debugger` | `Edit` (chỉ chẩn đoán) | ✅ |
| `team-code-reviewer` · `team-security` | `NotebookEdit` (vẫn ghi report của mình) | ✅ |
| `team-ba` · `team-pm` · `team-architect` · `team-designer` · `team-writer` | `Bash` | ✅ |

- Lead ghi trong brief những MCP/skill bước đó cần và việc nào bên ngoài repo người dùng đã cho phép.
- Đọc qua MCP thì tự do; thay đổi bên ngoài repo (deploy, migrate DB dùng chung, tạo issue, gửi tin) chỉ khi người dùng yêu cầu. Mỗi lần gọi MCP được ghi vào **Evidence** của handoff.
- `disallowedTools` chặn cả một tool, không chặn theo tham số. Muốn chặn cứng một hành động (vd `mcp__vercel__deploy_to_vercel`), thêm vào `permissions.deny` trong `.claude/settings.json` của project.
- Plugin không nạp trong cloud session (claude.ai/code); điều trên chỉ áp dụng khi chạy trên máy.

### Skill hay agent riêng của project?

| Cần | Viết | Team dùng thế nào |
|---|---|---|
| agent team biết **cách** dùng một tool trong repo (convention, lệnh, checklist) | skill: `.claude/skills/<ten>/SKILL.md` | agent nào cần thì tự gọi qua `Skill` |
| một vai trò riêng, hoặc cần `mcpServers` / `hooks` / `permissionMode` (agent của plugin không có) | agent: `.claude/agents/<ten>.md` | lead tự tìm và giao bước phù hợp |

Lead đọc `.claude/agents/*.md` khi bắt đầu, so `description` của từng agent với bước đang làm rồi chọn:

- **replace**: agent của project làm cả bước thay agent của team (vd `prisma-expert` thay `team-dba` cho migration).
- **consult**: agent của project góp ý trước (`Write: none`), lead chuyển nguyên văn vào brief của agent team.

Gate không đổi: code của agent project vẫn qua code-reviewer, qa, security. Lead báo bạn đã chọn agent nào; nói "không dùng X" là lead bỏ X cho item đó. Viết `description` rõ lĩnh vực (vd "Prisma schema và migration của repo này") để lead chọn đúng.

## Workspace `.team/`

```
.team/
├── STATE.md                    lead: ai đang làm task nào, file đang dùng, bước tiếp (điểm resume)
├── CREW.md                     lead (theo lệnh bạn): emoji, biệt danh, vibe, màu badge — tùy chọn
├── TASKS.md                    pm: ticket và trạng thái
├── PRODUCT.md                  ba: sự thật hiện hành của sản phẩm
├── ARCHITECTURE.md             architect: tổng quan, trần ~200 dòng, trỏ sang ADR
├── requirements/<slug>.md      ba
├── system-design/<slug>.md     architect: thiết kế + kế hoạch triển khai
├── frontend-design/DESIGN.md   designer: design system
├── frontend-design/<slug>.md   designer
├── adr/NNNN-<quyet-dinh>.md    architect; số NNNN do lead cấp trong brief
├── reports/<slug>/qa.md        qa: test plan → RTM → finding → chi tiết vòng mới nhất → verdict
├── reports/<slug>/review.md    code-reviewer
├── reports/<slug>/security.md  security
├── reports/<slug>/debug.md     debugger
├── docs/**                     writer
└── archive/<slug>/             mọi file của item đã đóng
```

Mỗi file (trừ `docs/**`) được viết theo template trong `plugins/team/templates/`:

```
templates/
├── core/          STATE.md · TASKS.md · PRODUCT.md · ARCHITECTURE.md · CREW.md
├── requirements/  requirements.md
├── design/        system-design.md · DESIGN.md · frontend-design.md
├── adr/           adr.md
└── reports/       qa.md · review.md · security.md · debug.md
```

 agent đọc template trước rồi điền, không tự đặt cấu trúc. Report giữ bảng finding cộng dồn với ID cố định (`Q-01`, `R-01`, `S-01`) và chỉ chi tiết vòng mới nhất. Khi đóng item, lead chuyển các file của item vào `archive/<slug>/` và xóa dòng của nó khỏi `STATE.md`.

Nên commit `.team/` nếu muốn cả team dùng chung.

## Phát triển plugin

Test và validate nằm ngoài plugin, ở `tests/` của repo (Node ≥ 21):

| Việc | Lệnh |
|---|---|
| Test (gồm cả validate nếu có `claude` CLI) | `npm test` |
| Chỉ validate | `npm run validate` |
| Chạy thử bản đang sửa | `claude --plugin-dir plugins/team`, sửa xong gõ `/reload-plugins` |

`tests/commands.test.mjs` kiểm tra: bộ lệnh/agent/skill, lead định tuyến đủ pipeline, 12 agent có khối Rules giống hệt nhau, `run-kit` đủ 5 phần (roster, pipeline, brief, workspace, handoff), mọi agent/skill/file được nhắc tới đều tồn tại, template chia đúng folder và đều được dùng, mọi đường dẫn `.team/` khớp layout, README liệt kê đủ lệnh, manifest có homepage/repository/license, và `claude plugin validate --strict` cho plugin lẫn marketplace.

Thêm, đổi tên hoặc xóa command/agent/skill/template → cập nhật bảng ở trên và danh sách trong `tests/commands.test.mjs`.

```
technical-team/
├── .claude-plugin/marketplace.json
├── package.json         npm test · npm run validate
├── tests/               test + validate cho plugin
├── LICENSE
├── README.md
└── plugins/team/        plugin technical-team
    ├── .claude-plugin/plugin.json
    ├── agents/          team-lead + 12 agent
    ├── commands/        run + crew + 7 pipeline
    ├── templates/       core · requirements · design · adr · reports
    └── skills/          run-kit · business-analysis · test-process · live-preview
```

## Liên kết và giấy phép

| | |
|---|---|
| Repo | https://github.com/Tuan-Quyen/technical-teams |
| Trang | https://github.com/Tuan-Quyen/technical-teams#readme |
| Giấy phép | [MIT](LICENSE) |
