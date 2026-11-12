# technical-team

Plugin Claude Code gồm một team kỹ thuật gọn nhẹ:

- **12 agent**: mỗi agent một vai trò, prompt ngắn, chỉ có quyền cần cho việc của nó.
- **8 lệnh workflow**: mỗi lệnh xử lý **một loại vấn đề** và chỉ spawn những agent nó cần, tuần tự hoặc song song.
- **3 skill** nạp khi cần: `business-analysis`, `test-process`, `live-preview`.

Không có tech lead trung gian, không có gate hay file trạng thái. Session chính đọc lệnh và tự gọi agent.

```
/technical-team:fix "login 500"
        │
        ▼
  session chính ──▶ debugger ──▶ developer ──▶ code-reviewer ──▶ qa ──▶ tóm tắt
                                   ▲                │ blocked      │ FAIL
                                   └────────────────┴──────────────┘
```

Plugin không gắn với ngôn ngữ hay framework nào: agent tự đọc stack, convention và lệnh build/test của repo.

## Cài đặt

Repo `https://github.com/Tuan-Quyen/technical-teams` vừa là plugin vừa là marketplace (`technical-team-marketplace`).

| Mục đích | Lệnh |
|---|---|
| Thêm marketplace | `claude plugin marketplace add Tuan-Quyen/technical-teams` |
| Cài cho mọi project | `claude plugin install technical-team@technical-team-marketplace --scope user` |
| Cài cho một repo (cả team) | trong repo: thêm `--scope project` cho cả hai lệnh trên |
| Cập nhật | `claude plugin marketplace update technical-team-marketplace` rồi `claude plugin update technical-team@technical-team-marketplace` |
| Gỡ | `claude plugin uninstall technical-team@technical-team-marketplace` |

Repo private: máy cài cần quyền đọc repo qua git (ví dụ `gh auth login`).

## Lệnh workflow

| Lệnh | Vấn đề | Agent được spawn |
|---|---|---|
| `/technical-team:feature` | làm tính năng (`--small` cho thay đổi nhỏ) | ba → designer (nếu có UI) → architect → developer → code-reviewer ∥ security → qa → writer |
| `/technical-team:fix` | sửa bug | debugger → developer → code-reviewer → qa |
| `/technical-team:review` | review diff, chỉ đọc | code-reviewer ∥ security (∥ dba) |
| `/technical-team:test` | bổ sung và chạy test | qa |
| `/technical-team:docs` | đồng bộ tài liệu (`--adr` ghi quyết định kiến trúc) | writer, hoặc architect |
| `/technical-team:infra` | CI/CD, Docker, deploy | devops → code-reviewer ∥ security → writer |
| `/technical-team:release` | kiểm tra sẵn sàng phát hành, GO/NO-GO | qa ∥ security ∥ devops (∥ dba) → writer |
| `/technical-team:new` | project mới từ ý tưởng/PRD | ba → architect ∥ designer → pm → từng milestone như `feature` → release |

`→` là tuần tự, `∥` là song song. Lệnh chỉ dừng hỏi bạn ở chỗ thật sự cần (câu hỏi yêu cầu, duyệt plan, lựa chọn rủi ro). Không lệnh nào tự commit, push hay deploy.

## Agent

| Agent | Việc | Ghi được |
|---|---|---|
| `team-ba` | yêu cầu → user story + AC Given/When/Then | `.team/` |
| `team-designer` | flow, màn hình, mọi trạng thái, copy | `.team/` |
| `team-architect` | giải pháp + danh sách task, ADR | `.team/` |
| `team-pm` | chia milestone cho việc lớn | `.team/` |
| `team-developer` | viết code, tự chạy build/lint/test | code |
| `team-debugger` | tìm root cause, không sửa code | chỉ đọc |
| `team-code-reviewer` | review diff | chỉ đọc |
| `team-qa` | viết + chạy test, live preview, PASS/FAIL | test, `.team/` |
| `team-security` | audit bảo mật | chỉ đọc |
| `team-dba` | migration không downtime, chỉ DB local/test | migration |
| `team-devops` | CI/CD, Docker, manifest, xác minh local | file infra |
| `team-writer` | README, API docs, CHANGELOG, runbook | docs |

Mọi agent kết thúc bằng một khối `### Handoff` (Status, Files, Evidence, Next) để session chính biết bước tiếp theo.

## Ghi chú chung `.team/`

```
.team/
├── <slug>/          mỗi việc một thư mục, tạo khi cần
│   ├── spec.md      ba
│   ├── ui.md        designer
│   ├── plan.md      architect (+ pm)
│   └── qa.md        qa
└── adr/             architect
```

Nên commit `.team/` nếu muốn cả team dùng chung.

## Phát triển plugin

| Việc | Lệnh |
|---|---|
| Test | `node --test tests/commands.test.mjs` |
| Validate | `claude plugin validate . --strict` |
| Chạy thử bản đang sửa | `claude --plugin-dir .`, sửa xong gõ `/reload-plugins` |

Thêm, đổi tên hoặc xóa command/agent → cập nhật bảng ở trên và danh sách trong `tests/commands.test.mjs`.

```
technical-team/
├── .claude-plugin/     plugin.json, marketplace.json
├── agents/             12 agent
├── commands/           8 lệnh
├── skills/             business-analysis, test-process, live-preview
└── tests/              kiểm tra lệnh/agent/README khớp nhau
```
