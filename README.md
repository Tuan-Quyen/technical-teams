# technical-team

Plugin Claude Code dựng một team kỹ thuật cho nhiều dự án sản phẩm cùng lúc:

- **14 agent**: 14 vai trò do một tech lead điều phối, có UI/UX designer.
- **12 lệnh workflow**: mỗi lệnh chứa luôn pipeline của nó, có `argument-hint`; biến thể chọn bằng cờ; `new` chạy trọn một project mới.
- **3 skill**: `run-kit` (tài liệu sử dụng, quy tắc chung, phiếu bàn giao), `test-process` (toàn bộ quy trình kiểm thử của QA theo ISTQB/STLC) và `live-preview` (chạy sản phẩm thật để kiểm thử: web, mobile, desktop, CLI, API/service, worker/bot; kèm danh mục lỗi hay lọt theo nền tảng).
- **2 hook**: guard thực thi phân quyền, và kiểm tra phiếu bàn giao.
- **Không gian làm việc chung `.team/`** trong repo của từng project.

Plugin không gắn với ngôn ngữ hay framework nào: agent tự đọc stack, convention và lệnh build/test của repo.

```mermaid
flowchart LR
  U[Bạn] -->|/technical-team:lệnh + ngữ cảnh| M[Session chính]
  M -->|brief| L[lead]
  L -->|brief| T[analyst · designer · architect · pm · developer · debugger · qa · code-reviewer · security · devops · writer · hr · dba]
  T -->|Phiếu bàn giao| L
  L -->|Báo cáo / Chờ duyệt| M --> U
```

## Mục lục

| # | Mục |
|---|---|
| 1 | [Yêu cầu](#1-yêu-cầu) |
| 2 | [Cài đặt, chạy thử, gỡ](#2-cài-đặt-chạy-thử-gỡ) |
| 3 | [Hai cách làm việc với lead](#3-hai-cách-làm-việc-với-lead) |
| 4 | [Đội hình và ranh giới](#4-đội-hình-và-ranh-giới) |
| 5 | [Tầng, cổng, vòng lặp giao hàng](#5-tầng-cổng-vòng-lặp-giao-hàng) |
| 6 | [Lệnh workflow](#6-lệnh-workflow) |
| 7 | [Phân quyền và mức bảo vệ thực tế](#7-phân-quyền-và-mức-bảo-vệ-thực-tế) |
| 8 | [Run kit và phiếu bàn giao](#8-run-kit-và-phiếu-bàn-giao) |
| 9 | [Specialist và tuyển dụng](#9-specialist-và-tuyển-dụng) |
| 10 | [Không gian làm việc `.team/`](#10-không-gian-làm-việc-team) |
| 11 | [Cấu hình theo project](#11-cấu-hình-theo-project) |
| 12 | [Giới hạn đã biết](#12-giới-hạn-đã-biết) |
| 13 | [Phát triển plugin](#13-phát-triển-plugin) |

---

## 1. Yêu cầu

| Thành phần | Phiên bản | Vì sao |
|---|---|---|
| Claude Code | **≥ 2.1.246**, khuyến nghị bản mới nhất; đã validate với **2.1.318** | subagent gọi subagent (sâu 3 tầng mặc định), tool `Agent`, tên skill plugin có tiền tố, `agent_type` trong input của hook |
| Node.js | **≥ 18**, có trên `PATH` | cả hai hook và script `init` chạy bằng Node |

> ⚠️ Không có `node` thì hook không chạy được, và Claude Code **vẫn cho tool chạy tiếp**. Khi đó mọi giới hạn chỉ còn dựa vào chỉ dẫn trong prompt. Kiểm tra bằng `node --version`.

Đừng đặt `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH=1`: khi chạy qua lệnh, chuỗi gọi là *session chính → lead → agent của team* (2 tầng).

---

## 2. Cài đặt, chạy thử, gỡ

Repo `https://github.com/Tuan-Quyen/technical-teams` vừa là plugin (`.claude-plugin/plugin.json`) vừa là marketplace (`.claude-plugin/marketplace.json`, tên `technical-team-marketplace`). Mọi cách cài đều đi qua git, không trỏ tới thư mục trên máy.

| Mục đích | Lệnh |
|---|---|
| Thêm marketplace | `claude plugin marketplace add Tuan-Quyen/technical-teams` (hoặc URL đầy đủ `https://github.com/Tuan-Quyen/technical-teams.git`) |
| Cài cho mọi project của bạn | `claude plugin install technical-team@technical-team-marketplace --scope user` |
| Cài cho một repo (cả team) | chạy trong repo đó: `claude plugin marketplace add Tuan-Quyen/technical-teams --scope project` rồi `claude plugin install technical-team@technical-team-marketplace --scope project` |
| Cập nhật bản mới | `claude plugin marketplace update technical-team-marketplace` rồi `claude plugin update technical-team@technical-team-marketplace` |
| Gỡ | `claude plugin uninstall technical-team@technical-team-marketplace --scope user` (hoặc `--scope project`); bỏ marketplace: `claude plugin marketplace remove technical-team-marketplace` |
| Kiểm tra | `claude plugin details technical-team` → 14 agent, 15 skill (12 lệnh + `run-kit` + `test-process` + `live-preview`), 2 hook |

**Repo private:** máy cài phải có quyền đọc repo qua git, ví dụ `gh auth login` hoặc credential helper của git. Việc tự cập nhật nền cần thêm biến môi trường `GITHUB_TOKEN`. Không có quyền thì lệnh `marketplace add` báo lỗi xác thực.

Với project scope, lệnh cài ghi vào `.claude/settings.json` của repo; commit file đó để đồng đội mở repo là được nhắc cài. Nội dung tương đương nếu muốn tự khai:

```json
{
  "extraKnownMarketplaces": {
    "technical-team-marketplace": { "source": { "source": "github", "repo": "Tuan-Quyen/technical-teams" } }
  },
  "enabledPlugins": { "technical-team@technical-team-marketplace": true }
}
```

Gỡ plugin **không** xóa `.team/`, `README.md`, `CHANGELOG.md` hay specialist của project.

**Bắt đầu ở một project:** gõ `/technical-team:init`.
- Không bắt buộc. Lệnh chỉ tạo `.team/STATE.md` và `.claude/technical-team.json`, không bao giờ ghi đè file đã có.
- Các file `.team/` khác (`SPEC`, `PLAN`, `TASKS`, `OPS_HANDOFF`, `ROSTER`, `archive/`) chỉ được tạo khi pipeline cần tới lần đầu; `.claude/agents/` chỉ có khi tuyển specialist đầu tiên. Muốn tạo hết từ đầu như trước: `/technical-team:init --all`.
- Nên commit `.team/` để cả team dùng chung.

---

## 3. Hai cách làm việc với lead

| Cách | Khởi động | Tại cổng cần duyệt |
|---|---|---|
| **Qua lệnh** (mặc định) | gõ `/technical-team:<lệnh>`; session chính giao cho `technical-team:lead` chạy như subagent | lead ghi trạng thái vào `.team/STATE.md`, trả về `Chờ duyệt …` rồi dừng; bạn trả lời ở session chính, session chính gọi lại lead |
| **Lead là session chính** | `claude --agent technical-team:lead`, hoặc `"agent": "technical-team:lead"` trong `.claude/settings.json` của project | lead hỏi thẳng bạn (có `AskUserQuestion`) |

| Ghi chú | |
|---|---|
| Lệnh dùng được ở cả hai cách | khi session *là* lead, lead chạy thẳng phần `## Pipeline` của lệnh |
| Plugin không đặt `agent` mặc định | nếu đặt, mọi session ở mọi project bật plugin sẽ thành lead |
| Lead làm session chính | guard áp quyền của lead lên chính session đó; muốn tự sửa file thì mở một session thường |
| Ngữ cảnh của bạn | cài skill ngoài và tự gọi ở session chính; khi giao việc, session chính tóm tắt trung thực những gì bạn đưa vào mục **User-provided context** của prompt gửi lead |

---

## 4. Đội hình và ranh giới

Tên đầy đủ có tiền tố plugin: `technical-team:<tên>`. Model dùng alias nên luôn theo bản mới nhất.

| Tên | Vai trò | Model | Trách nhiệm |
|---|---|---|---|
| `lead` | Tech lead | `inherit` (theo session) | người duy nhất phân việc: xếp tầng, chạy pipeline, giữ cổng, báo cáo |
| `analyst` | Business analyst | sonnet | user story, acceptance criteria kiểm chứng được, trường hợp biên |
| `designer` | UI/UX designer | opus | user flow, màn hình, đủ trạng thái (rỗng/đang tải/lỗi/không có quyền), design system, microcopy trong `.team/DESIGN.md`; quyết định các điểm UI/UX mà qa chuyển lên |
| `architect` | Architect | opus | thiết kế kỹ thuật, plan triển khai, `.team/ARCHITECTURE.md`, ADR |
| `pm` | Project manager | sonnet | ticket, ước lượng, phụ thuộc, tập file độc quyền, trạng thái |
| `developer` | Developer fullstack | sonnet | viết/sửa code theo plan, giữ hợp đồng backend–frontend khớp nhau |
| `debugger` | Debugger | opus | tái hiện, chứng minh nguyên nhân gốc, đề xuất hướng sửa; không sửa code |
| `qa` | QA, người giữ cổng chất lượng sản phẩm | sonnet | quy trình kiểm thử đầy đủ: test plan + review tĩnh spec/design trước khi code (P3a), thiết kế test case bằng kỹ thuật, test tự động, **live preview** trên sản phẩm đang chạy (web, mobile, desktop, CLI, API), **xác minh UI/UX** (khớp `DESIGN.md`, heuristic usability, accessibility), exploratory, báo lỗi có severity/priority, retest + regression, test summary, kết luận PASS/FAIL; ghi section `### QA` của từng work item trong `.team/TASKS.md` |
| `code-reviewer` | Code reviewer | sonnet | review **code** (diff), không review project; phân mức chặn merge / nên sửa / gợi ý |
| `security` | Security | opus | audit code, dependency, secrets, phân quyền, cấu hình |
| `devops` | DevOps | sonnet | CI/CD, Docker, deploy, hạ tầng; ghi `.team/OPS_HANDOFF.md` |
| `writer` | Technical writer | sonnet | README, API docs, CHANGELOG, runbook, hướng dẫn |
| `hr` | HR | opus | tuyển specialist khi thiếu chuyên môn domain |
| `dba` | DBA + data engineer | opus | migration không downtime, review schema/query, pipeline ETL/ELT/dbt/DAG/warehouse |

Lead dùng `inherit`, nên session chạy sonnet thì lead cũng là sonnet và điều phối sẽ kém hơn opus.

| Cặp | Ranh giới |
|---|---|
| pm ↔ analyst | analyst quyết định *cái gì / vì sao*; pm quyết định ticket, thứ tự, ước lượng |
| designer ↔ analyst | analyst giữ AC và phạm vi; designer quyết định người dùng đi qua chúng thế nào. Tính năng còn thiếu mà designer phát hiện thì trả về analyst quyết định |
| designer ↔ architect | designer giữ màn hình, flow, trạng thái, design system; architect giữ cấu trúc code đằng sau. Ở `new` N2 hai bên cùng chọn thư viện UI, architect ghi ADR |
| designer ↔ developer / qa | developer dựng đúng `DESIGN.md`; qa xác minh sản phẩm có khớp thiết kế và dùng được không, và là người ra kết luận; designer chỉ quyết định các điểm qa chuyển lên (thiết kế chưa có câu trả lời, hoặc chỗ lệch có thể chấp nhận) |
| pm ↔ architect | architect quyết định *làm thế nào*; pm chia plan đã duyệt, không đổi thiết kế |
| pm ↔ lead | pm đề xuất thứ tự, theo dõi trạng thái; chỉ lead giao việc và cho qua cổng |
| debugger ↔ developer | debugger chẩn đoán có bằng chứng, không viết patch; developer sửa theo chẩn đoán |
| developer ↔ qa | qa viết test mới và kết luận; developer chỉ **Edit** test cũ bị gãy do hành vi được chủ đích thay đổi |
| devops ↔ writer | devops ghi dữ kiện thô vào `OPS_HANDOFF.md`; writer viết runbook, không sửa hạ tầng |
| hr ↔ lead | lead đề xuất nhu cầu, ghi phê duyệt của bạn; hr đánh giá, tra cứu, soạn, tạo agent; bạn quyết định |
| dba ↔ developer | developer giữ model/ORM và `schema.prisma`; dba giữ migration, seed, schema dump, code pipeline và mọi lệnh DB/migrate/pipeline |
| dba ↔ architect | architect quyết định mô hình dữ liệu; dba quyết định cách đưa thay đổi lên DB an toàn |
| dba ↔ devops | devops giữ CI/deploy và hạ tầng orchestrator; dba đưa thứ tự chạy và rollback |

---

## 5. Tầng, cổng, vòng lặp giao hàng

### Tầng (khi dùng `run` hoặc không chỉ định pipeline)

| Tầng | Khi nào | Lệnh |
|---|---|---|
| **T0** việc lẻ | câu hỏi, sửa một chỗ, cập nhật tài liệu | giao thẳng 1 agent |
| **T1** thay đổi nhỏ | phạm vi rõ, không đổi thiết kế | `feature --small` |
| **T2** tính năng | tính năng mới hoặc chạm thiết kế | `feature` (`--plan` nếu chỉ cần kế hoạch) |
| **TB** lỗi | bug, test fail, hành vi sai | `fix` (`--hotfix` nếu khẩn, `--diagnose` nếu chỉ cần nguyên nhân) |
| **Project mới** | làm sản phẩm từ đầu, repo chưa có code ứng dụng | `new` (mục 6.1) |

| Tham gia bắt buộc (mọi tầng) | Khi |
|---|---|
| designer | có giao diện người dùng: màn hình mới, đổi flow, layout, giao diện (thiết kế ở P1a; sau qa chỉ khi qa chuyển điểm cần quyết định) |
| qa live preview | mọi thay đổi người dùng hay client quan sát được (UI web/mobile/desktop, CLI, response API, output của worker/bot, đóng gói): qa bắt buộc chạy sản phẩm thật; không có G2 chỉ dựa trên unit test |
| security | chạm auth, input người dùng, truy cập dữ liệu, secrets, thanh toán, dữ liệu cá nhân |
| devops | chạm hạ tầng, build, deploy |
| writer | ảnh hưởng cách dùng, API, vận hành |
| dba | chạm schema, migration, seed, dữ liệu hiện có, query bảng lớn, pipeline dữ liệu |
| specialist | điều kiện kích hoạt trong danh bạ khớp |

Lead luôn nói đã chọn tầng nào và vì sao; bạn có thể yêu cầu đổi.

### Cổng

| Cổng | Điều kiện qua |
|---|---|
| **G1** duyệt hướng làm | bạn duyệt spec + plan (hoặc hướng sửa rủi ro cao của debugger) |
| **G2** chất lượng | qa PASS trên bản code cuối, nghĩa là đạt exit criteria: test có output thật, live preview sạch (nếu thay đổi quan sát được), UI/UX đã xác minh, không còn lỗi blocker/critical/major; các điểm thiết kế qa chuyển lên đã được designer quyết định |
| **G3** review | không còn phát hiện "chặn merge" từ code-reviewer / security / specialist, trên đúng bản code đã qua G2 |
| **G4** hoàn tất | tài liệu cập nhật (nếu cần), `.team/` cập nhật, báo cáo đã gửi |

### Vòng lặp giao hàng (thứ tự cố định, không giới hạn số vòng)

```mermaid
flowchart LR
  D[developer] --> CR[code-reviewer ∥ security lượt đầu]
  CR -- chặn merge --> D
  CR -- sạch --> Q[qa: test + live preview + UI/UX + exploratory]
  Q -- FAIL --> D
  Q -- PASS = G2 --> S{cần security?}
  Q -- chuyển điểm thiết kế --> DR[designer quyết định]
  DR -- sửa --> D
  DR -- chấp nhận = G2 --> S
  S -- có --> SEC[security: chỉ phần đổi từ lượt đầu]
  SEC -- chặn merge --> D
  SEC -- sạch --> X[G2 + G3 trên cùng bản code]
  S -- không --> X
```

| Quy tắc | |
|---|---|
| Mọi lần sửa code đi lại từ code-reviewer | không code nào tới qa khi chưa review sạch; bước security cuối chỉ chạy sau G2 |
| Review song song | cần security thì lượt review đầu tiên của work item chạy code-reviewer ∥ security trên cùng diff (cả hai chỉ đọc). Các vòng sau chỉ code-reviewer. Sau G2, security chỉ review **phần đổi** kể từ lượt đầu, không đổi gì thì khỏi gọi. Lỗi bảo mật lộ ra trước qa, nên không phải chạy lại qa vì bản sửa bảo mật, và số lần gọi security tối đa là 2 |
| Micro (chỉ small mode) | ≤ 3 file, ≤ 40 dòng, không chạm test/hạ tầng/dữ liệu/dependency/build config, không thuộc diện security, không đổi API/contract/component dùng chung, không có màn hình hay flow mới. Đủ cả → một lượt qa *micro verify* thay cho code-reviewer + qa. qa thấy không đủ điều kiện thì trả "not micro" và chạy luồng thường. Báo cáo cuối ghi rõ đã đi micro |
| Không giới hạn số vòng | không cổng nào mở sớm, không work item nào đóng khi còn lỗi |
| Leo thang khi **cùng một lỗi còn nguyên qua 2 vòng**, hoặc **3 vòng liền không tiến triển** | debugger → architect (+ analyst nếu dính AC) → tạm dừng hỏi bạn |
| Leo thang thiết kế | developer nghi lỗi do thiết kế (thư viện không làm được theo docs, contract không giữ được cả hai phía, data model không biểu diễn được AC, cùng một lỗi cứ quay lại) → dừng sau tối đa 2 lần thử, bàn giao `cần quyết định` kèm khối **Nghi lỗi thiết kế** có bằng chứng. Lead gọi thẳng architect, không chờ đủ vòng. Architect tra tài liệu (WebSearch/WebFetch: docs đúng phiên bản, release notes, issue tracker), kết luận *thiết kế vẫn đúng* (kèm cách làm và nguồn) hoặc *sửa thiết kế* (Revision trong PLAN, ADR thay thế nếu cần, ticket/test/màn hình bị ảnh hưởng). Sửa thiết kế mà ảnh hưởng tới những gì bạn đã duyệt (AC, UX, stack/ADR, contract ngoài, chi phí) thì quay lại G1 cho phần đổi; đổi nội bộ thì lead ghi lại và chạy tiếp |
| Tiến triển | số lỗi blocker/critical/major **trong phạm vi** còn mở (cộng phát hiện chặn của review/security) phải **giảm**; tập lỗi chỉ đổi mà không giảm thì không tính |
| Hiệu chỉnh gate của qa | ngưỡng không hạ (lỗi blocker/critical/major trong phạm vi luôn là FAIL), nhưng áp lên **đích cố định**: chỉ lỗi do thay đổi gây ra hoặc phạm AC/DESIGN của work item mới chặn; lỗi có sẵn từ trước thành work item mới. Exit criteria khóa ở G1. Độ sâu theo tầng (T2 đầy đủ, T1 nhẹ hơn, fix, hotfix). Major trở lên phải có nguồn + tác động lên người dùng, lead được trả lại lỗi xếp hạng không có căn cứ |
| Chống "làm cho test xanh" | test bị skip, xóa, nới assertion, mock mất phần đang kiểm tra = chặn merge (code-reviewer) và FAIL (qa) |
| Nhật ký | `STATE.md` → `Loop log` |

`infra` không có qa: devops → code-reviewer → security. `review` (cả `--audit`), `release` chỉ kiểm tra rồi kết luận nên chạy song song.

> PASS QA nghĩa là đạt exit criteria trong test plan: AC và trạng thái thiết kế đã kiểm, sản phẩm chạy thật không lỗi trên các nền tảng trong phạm vi, UI/UX dùng được, không còn lỗi blocker/critical/major. Nó vẫn không chứng minh được là hết lỗi. Vì vậy qa review tĩnh AC và DESIGN ngay từ P3a, trước G1, và test summary ghi rõ phần nào được kiểm ít hơn và vì sao.

---

## 6. Lệnh workflow

Mọi lệnh có tiền tố `/technical-team:`. Mỗi file lệnh gồm hai phần:
- **Running this command**: session chính giao cho lead, chuyển báo cáo chờ duyệt cho bạn, rồi gọi lại lead với câu trả lời.
- **Pipeline**: sơ đồ và bảng các bước mà lead thực thi.

Biến thể của cùng một pipeline là **cờ** (nói bằng lời cũng được: "chỉ lên kế hoạch", "gấp", "chỉ chẩn đoán", "audit", "ghi ADR"); lead ghi chế độ vào `STATE.md`. `run` và `new` không chép lại bước nào: chúng gọi đúng các bước (theo mã bước) trong `feature`, `fix`, `infra`, `docs`, `release`. Thiếu tham số bắt buộc thì lệnh hỏi lại, không đoán.

| Lệnh | Tham số | Pipeline | Cổng |
|---|---|---|---|
| `run` | `<yêu cầu>` | lead xếp T0/T1/T2/TB/project mới rồi chạy đúng lệnh và chế độ | theo tầng |
| `new` | `<ý tưởng \| đường dẫn PRD>` (trống = chạy tiếp) | trọn một project mới (mục 6.1) | REQ, STACK, G1, cuối mỗi milestone, RELEASE |
| `init` | `[--all]` | tạo `.team/STATE.md` + `.claude/technical-team.json`; `--all` tạo hết từ đầu | – |
| `status` | – | tóm tắt `.team/`, không gọi agent | – |
| `feature` | `<mô tả>` | plan → G1 → vòng lặp giao hàng (luôn có security) → writer ∥ pm | G1–G4 |
| | `<mục tiêu> --plan` | analyst → architect → pm, dừng ở G1, không viết code | G1 |
| | `<mô tả> --small` | thay đổi nhỏ (T1): vòng lặp giao hàng (security nếu bị kích hoạt) | G2–G4 |
| `fix` | `<lỗi>` | debugger → vòng lặp giao hàng với regression test | G1 nếu rủi ro, G2–G4 |
| | `<lỗi> --hotfix` | khẩn/production: bản sửa nhỏ nhất, security luôn chạy, tài liệu rút gọn | G2–G4 |
| | `<triệu chứng> --diagnose` | chỉ debugger chẩn đoán, không sửa code | – |
| `review` | `[phạm vi diff]` | code-reviewer ∥ security, gộp một kết luận | G3 |
| | `--audit [phạm vi]` | security quét toàn diện, chỉ-đọc | – |
| `test` | `[phạm vi]` | qa bổ sung test còn thiếu | G2 |
| `infra` | `<yêu cầu>` | devops đề xuất → G1 → làm → code-reviewer → security → runbook | G1, G3, G4 |
| `release` | `[version]` | devops ∥ security ∥ qa → CHANGELOG → GO/NO-GO | G2–G4 |
| `docs` | `[phạm vi]` | writer đồng bộ tài liệu với code | G4 |
| | `--adr <quyết định>` | architect ghi ADR + cập nhật `.team/ARCHITECTURE.md` | – |
| `hire` | `<domain/nhu cầu> [lý do]` | tuyển specialist (mục 9) | cổng tuyển dụng |
| | `--roster` | danh bạ + đề xuất rà soát của hr | duyệt cho nghỉ |

**Đổi từ bản 18 lệnh:** `plan` → `feature --plan` · `change` → `feature --small` · `hotfix` → `fix --hotfix` · `investigate` → `fix --diagnose` · `audit` → `review --audit` · `adr` → `docs --adr` · `roster` → `hire --roster`. Không mất bước, cổng hay bước security nào. Lệnh giữ riêng vì có cổng/quyền/rủi ro khác: `infra` (G1 bắt buộc, không có qa, chạm secrets/hạ tầng), `release` (GO/NO-GO, không deploy), `test` (qa ghi test, không sửa code), `hire` (cổng tuyển dụng đổi quyền của team), `init`/`status` (tiện ích), `run` (cửa vào chung), `new` (chạy dài nhiều pha).

| Ví dụ | Kết quả |
|---|---|
| `/technical-team:run Thêm "Quên mật khẩu" ở trang đăng nhập` | lead chọn T2 (chạm auth), nói lý do, chạy `feature` |
| `/technical-team:new docs/prd-booking.md` | chạy từ yêu cầu tới release, dừng ở 5 cổng; gọi lại `new` không tham số để chạy tiếp |
| `/technical-team:feature Xuất báo cáo doanh thu ra CSV theo khoảng ngày --plan` | dừng ở G1 với tóm tắt AC, thiết kế, ticket |
| `/technical-team:feature --small Đổi thông báo lỗi email thành "Email không hợp lệ"` | lead ghi hành vi mong đợi thay cho AC, chạy vòng lặp giao hàng |
| `/technical-team:fix Tổng tiền sai khi áp 2 mã giảm giá` | debugger chứng minh nguyên nhân gốc rồi mới sửa |
| `/technical-team:fix --hotfix API /orders trả 500 trên production` | sửa nhỏ nhất; hướng sửa rủi ro cao thì vẫn dừng hỏi bạn |
| `/technical-team:fix --diagnose Worker thỉnh thoảng treo sau vài giờ` | chỉ báo nguyên nhân gốc, bằng chứng, hướng sửa |
| `/technical-team:review main...HEAD` | không có tham số: working tree so với `HEAD`, hoặc commit cuối nếu sạch |
| `/technical-team:review --audit src/payments/` | audit bảo mật chỉ-đọc, gợi ý work item tiếp theo |
| `/technical-team:infra Thêm GitHub Actions chạy lint + test cho PR` | devops đề xuất trước, bạn duyệt, rồi mới làm |
| `/technical-team:release 1.4.0` | GO/NO-GO; team không tag, không deploy |
| `/technical-team:docs --adr Chuyển từ REST polling sang WebSocket` | ADR mới + cập nhật `.team/ARCHITECTURE.md` |
| `/technical-team:hire IoT: firmware ESP32, MQTT, OTA` | hồ sơ domain, hồ sơ specialist, chỗ đặt, rồi chờ bạn duyệt |

### 6.1 `new`: chạy trọn một project mới

Gọi một lần với ý tưởng ngắn hoặc đường dẫn PRD. Team chỉ dừng hỏi ở 5 cổng; G2/G3/G4 vẫn áp dụng nội bộ. Các điểm dừng bắt buộc sẵn có vẫn giữ: cổng tuyển dụng, leo thang khi cùng một lỗi lặp 2 vòng, đổi hướng sau G1, guard từ chối mà chỉ bạn sửa được.

```mermaid
flowchart TD
  N0[N0 init .team/ + mở W-NNN] --> N1[N1 analyst: spec MVP + câu hỏi]
  N1 --> REQ{{1 REQ: chốt yêu cầu}}
  REQ --> N2[N2 architect + designer: stack, thư viện UI, design system, .team/ARCHITECTURE.md, ADR]
  N2 --> STACK{{2 STACK: chốt stack + kiến trúc}}
  STACK --> N3[N3 designer: flow + màn hình MVP → plan MVP: milestone + ticket, M1 = scaffold → qa: test plan MVP]
  N3 --> G1{{3 G1: duyệt cả MVP}}
  G1 --> N4[N4 milestone Mk: delivery loop của feature]
  N4 --> MK{{4 Mk: báo cáo milestone}}
  MK -- milestone tiếp --> N4
  MK -- xong milestone cuối --> N5[N5 hạ tầng còn thiếu: infra]
  N5 --> N6[N6 docs → G4]
  N6 --> N7[N7 release: GO/NO-GO]
  N7 --> REL{{5 RELEASE: GO/NO-GO}}
  REL -- NO-GO, sửa --> FX[fix từng mục chặn] --> N7
  REL -- chấp nhận --> END[Báo cáo cuối + lệnh commit/tag/deploy/rollback để bạn tự chạy]
```

| Cổng | Bạn nhận được | Bạn trả lời |
|---|---|---|
| REQ | phạm vi MVP (trong/ngoài), story chính, câu hỏi đánh số kèm đáp án mặc định, giả định | trả lời, hoặc "OK" = nhận hết mặc định |
| STACK | 2–3 phương án stack, phương án đề xuất, thư viện UI + định hướng thiết kế, tóm tắt kiến trúc, ADR, máy bạn cần cài gì | duyệt / chọn phương án khác / chỉnh |
| G1 | bảng milestone, số ticket mỗi milestone, rủi ro, ước lượng số lượt agent | duyệt một lần cho cả MVP |
| Mk | đã xong gì, bằng chứng test, screenshot live preview, review/security, lỗi theo severity từ phần QA trong `TASKS.md`, chỗ lệch kế hoạch, lệnh chạy thử local, lệnh commit gợi ý | đi tiếp / chỉnh / dừng |
| RELEASE | GO/NO-GO kèm lý do, version (mặc định `0.1.0`), lệnh commit/tag/push/deploy/rollback | chấp nhận / sửa các mục NO-GO / đóng ở NO-GO |

| Lưu ý | |
|---|---|
| Bị ngắt giữa chừng | lead ghi `Phase`, `Next step`, `Milestones`, cổng đang chờ vào `.team/STATE.md` sau mỗi bước; gọi lại `new` không tham số là chạy tiếp; `status` hiện pha và bước kế tiếp |
| Git | repo chưa `git init` thì lead hỏi ở REQ; code mới là file untracked nên review dùng thêm `git status --porcelain`; commit sau mỗi milestone (lệnh có trong báo cáo) cho milestone sau diff sạch |
| Repo đã có code | `new` dừng và đề xuất `feature`/`run` (hoặc chạy trong thư mục con bạn chỉ định) |
| Sau khi chốt stack | nên điền `commands.*` và `skills.*` trong `.claude/technical-team.json` (chỉ bạn sửa được) |

---

## 7. Phân quyền và mức bảo vệ thực tế

### 7.1 Các lớp bảo vệ

| Lớp | Cơ chế | Chặn được |
|---|---|---|
| **A** frontmatter `tools` | agent chỉ có tool được liệt kê | loại tool (không có Bash thì không chạy shell, không có Write/Edit thì không ghi bằng tool); chỉ lead có `Agent` |
| **B** guard (`hooks/guard.mjs`, `PreToolUse`) | đọc `agent_type` để biết lệnh gọi đến từ agent nào | đường dẫn ghi theo chủ sở hữu, nội dung lệnh Bash theo vai trò, ai được gọi agent nào, cổng tuyển dụng, skill nào được nạp, lệnh DB |
| **B2** kiểm tra phiếu (`hooks/handoff-check.mjs`, `SubagentStop`) | đọc tin nhắn cuối của agent khi nó kết thúc | thiếu phiếu, thiếu nhãn, `Kết quả` sai, `xong` không có bằng chứng → trả agent lại (tối đa 2 lần) |
| **C** chỉ dẫn | prompt agent + `run-kit` | thứ tự pipeline, cổng G1–G4, vòng lặp, "không nới lỏng test", chất lượng bằng chứng |

Tài liệu Claude Code xác nhận ba điều sau, và cả ba ảnh hưởng tới thiết kế:
- Agent trong plugin bị **bỏ qua** các trường `hooks`, `mcpServers`, `permissionMode`. Vì vậy mọi kiểm tra theo vai trò nằm trong một hook cấp plugin.
- Cú pháp `Bash(<pattern>)` không được tài liệu hóa cho trường `tools`. Agent khai `Bash` trơn, guard giới hạn nội dung lệnh.
- Subagent không có `AskUserQuestion`. Vì vậy lead chạy dưới dạng subagent phải dừng lại ở mỗi cổng cần bạn duyệt.

### 7.2 Bảng quyền

| Vai trò | Tools | Ghi | Bash |
|---|---|---|---|
| lead | không khai → nhận toàn bộ tool của session | chỉ `.team/STATE.md` | chỉ `git status`, `git diff` (+ `head`/`tail`/`grep`/`wc`/`sort`/`uniq`/`cut`), script `init` |
| analyst | Read, Write, Edit, Glob, Grep, Skill | chỉ `.team/SPEC.md` | không có |
| designer | Read, Write, Edit, Glob, Grep, Skill, WebSearch, WebFetch | chỉ `.team/DESIGN.md` | không có (xem screenshot bằng Read) |
| architect | Read, Write, Edit, Glob, Grep, Skill, WebSearch, WebFetch | `.team/PLAN.md`, `.team/ARCHITECTURE.md`, `.team/adr/**` | không có |
| pm | Read, Write, Edit, Glob, Grep, Skill | chỉ `.team/TASKS.md` | không có |
| developer | Read, Write, Edit, Glob, Grep, Bash, Skill, WebSearch, WebFetch | mọi đường dẫn **không** thuộc ai khác; test cũ chỉ bằng Edit | build, lint, test, chạy local; không lệnh DB/migrate/pipeline |
| debugger | Read, Glob, Grep, Bash, Skill, WebSearch, WebFetch | không | chỉ-đọc |
| qa | Read, Write, Edit, Glob, Grep, Bash, Skill | file/thư mục test + section `### QA` trong `.team/TASKS.md` | chỉ-đọc + chạy app, hoặc chỉ lệnh `commands.test` + `commands.run` đã cấu hình |
| code-reviewer | Read, Glob, Grep, Bash, Skill | không | chỉ `git diff`, `git log` (+ bộ lọc) |
| security | Read, Glob, Grep, Bash, Skill, WebSearch, WebFetch | không | chỉ-đọc (chặn `audit fix`) |
| devops | Read, Write, Edit, Glob, Grep, Bash, Skill, WebSearch, WebFetch | file hạ tầng + `.team/OPS_HANDOFF.md` | Docker/IaC/kiểm tra config; không thay đổi môi trường từ xa trừ khi bật |
| writer | Read, Write, Edit, Glob, Grep, Skill | `README.md`, `CHANGELOG.md` (mọi cấp), `.team/docs/**` | không có |
| hr | Read, Write, Edit, Glob, Grep, WebSearch, WebFetch, Skill | file agent đã duyệt, `.team/ROSTER.md` (+ `agents/`, `config/agents.json` trong repo plugin) | không có |
| dba | Read, Write, Edit, Glob, Grep, Bash, Skill, WebSearch, WebFetch | migration, seed, schema dump, code pipeline | `db-local` (7.5) |
| specialist | do bạn duyệt; không bao giờ có `Agent` | cột `Write scope` của dòng đã duyệt | cột `Bash`: `none` / `readonly` / `developer` / `db-local` |
| Explore (agent ngoài) | của Claude Code | không | chỉ-đọc |

Mọi agent có `Skill` nhưng chỉ nạp được `run-kit`, `test-process` (qa), `live-preview` (qa, developer, designer) và danh sách bạn khai cho vai trò đó (mục 11). Không ai trong team được commit, push, mở PR, hay ghi vào `.claude/`, `.git/`, `.env`.

### 7.3 Mỗi đường dẫn có đúng một chủ

Guard đi qua các bước dưới đây theo thứ tự, gặp bước khớp đầu tiên thì dừng:

| # | Đường dẫn | Chủ |
|---|---|---|
| 1 | `.git/**`, `.claude/**` (trừ file agent đã duyệt cho hr), `.env`, `.env.*` (trừ `*.example`/`*.sample`/`*.template`), file lạ trong `.team/` | không ai |
| 2 | `.team/STATE.md` · `SPEC.md` · `DESIGN.md` · `PLAN.md` · `TASKS.md` · `OPS_HANDOFF.md` · `ROSTER.md` (kể cả `archive/<FILE>-<YYYY-MM>.md`) | lead · analyst · designer · architect · pm (+ qa ghi section `### QA` của `TASKS.md`) · devops · hr |
| 3 | `.team/ARCHITECTURE.md`, `.team/adr/**` | architect |
| 4 | `README.md`, `CHANGELOG.md` (mọi cấp), `.team/docs/**` | writer |
| 5 | hạ tầng: Dockerfile, compose, `.github/workflows/**`, `.gitlab-ci.yml`, `Jenkinsfile`, `infra/`, `deploy/`, `k8s/`, `helm/`, `terraform/`, `ops/`, `scripts/ci|deploy|ops/**`… | devops |
| 6 | test: `tests/`, `test/`, `__tests__/`, `e2e/`, `spec/`, `*.spec.*`, `*.test.*`, `*_test.*`, `test_*.py`… | qa |
| 7 | dữ liệu (`data`): `**/migrations/**`, `db/migrate/**`, `**/db/migration/**`, `alembic/versions/**`, `drizzle/**`, `**/seeds/**`, `**/seeders/**`, `db/seeds.rb`, `prisma/seed.*`, `db/schema.rb`, `db/structure.sql`, `dbt/**`, `dags/**`, `etl/**`, `elt/**`, `warehouse/**`… | dba |
| 8 | specialist của plugin (`config/agents.json`), rồi `Write scope` của specialist project `active` có `HIRE-APPROVED` | specialist đó |
| 9 | còn lại | developer |

Tài liệu của team nằm hết trong `.team/`, chỉ `README.md` và `CHANGELOG.md` ở ngoài. Agent bị chặn ghi vào `ARCHITECTURE.md` ở root, `docs/adr/**`, `docs/**` (guard báo đường dẫn mới); project cần giữ một đường dẫn ở ngoài thì thêm nó vào `paths.docs` (mục 11). Vì vậy nên commit `.team/`, đừng cho vào `.gitignore`.

Danh sách đầy đủ nằm ở `config/ownership.json`; mỗi project mở rộng được (mục 11). Không agent nào được ghi ra ngoài thư mục project, trừ một ngoại lệ: hr ghi vào `~/.claude/agents/` khi bạn chọn user scope.

### 7.4 Bash theo stack

| Chế độ | Khi nào | Bảo vệ |
|---|---|---|
| Denylist (mặc định) | `commands.*` để trống | luôn chặn `sudo`, `git commit/push`, `git reset --hard`, `git clean`, bỏ thay đổi, `gh pr create/merge`, `curl … \| sh`, `rm -r` vào `/`, `~`, `..`, `.git`, `.team`, `.claude`; redirect/`tee` vào file của người khác |
| Allowlist | bạn điền `commands.build/lint/test/run` (developer), `commands.test` + `commands.run` (qa: `run` để khởi động app cho live preview), `commands.infra` (devops) | chỉ các lệnh có tiền tố đó + lệnh chỉ-đọc |
| Chỉ-đọc | debugger, security, Explore, specialist `readonly` | chặn ghi file qua shell, `sed -i`, git thay đổi repo, `find -delete/-exec`, `xargs`, cài dependency, lệnh thay đổi hạ tầng từ xa |

### 7.5 Lệnh database và pipeline (`db-local`, dùng cho `dba`)

| Quy tắc | |
|---|---|
| Chỉ dba chạy | các lệnh DB/migrate/pipeline (`config/ownership.json` → `dbCommands`: Prisma, Django, Alembic, Rails, Flyway, Liquibase, EF Core, Knex, TypeORM, Drizzle, goose, dbmate, `pg_dump`, `dbt run/build/test…`, trigger Airflow/Dagster/Prefect, `bq query`, `snowsql`, `spark-submit`… + client `psql`, `mysql`, `sqlite3`, `mongosh`, `sqlcmd`). Vai trò khác bị chặn; `npx prisma generate`, `npm test`, `dbt parse` vẫn chạy được |
| Đích phải chứng minh là local/test | URL ngay trong lệnh, `--host` + `-d`, hoặc `db.envFile`; host thuộc `db.allowedHosts`, tên DB khớp `db.allowedDatabases` |
| Luôn chặn | đích là biến shell, lệnh có `prod`/`staging`/`live`/`uat`…, tunnel/port-forward, chạy file SQL qua client, qua `psql -c` / `mysql -e` mọi thứ ngoài `EXPLAIN`/`SHOW`/`DESCRIBE`/`\d`/SELECT catalog, `EXPLAIN ANALYZE` lệnh ghi |
| Warehouse từ xa | dbt/Airflow lấy đích từ file cấu hình mà guard không đọc được → bị chặn; dba đưa lệnh trong phiếu bàn giao để bạn chạy |
| Cấu hình | mục `db` trong `.claude/technical-team.json` (mục 11); thư mục dữ liệu khác mặc định → `paths.data` |

### 7.6 Những gì cấu hình **không** chặn được

| Điểm | Thực tế |
|---|---|
| Bash ghi file theo đường vòng | guard bắt redirect, `tee` và lệnh ghi phổ biến; `node -e`, `python -c`, test runner tạo snapshot vẫn ghi được. Cần cách ly thật thì dùng sandbox của Claude Code hoặc allowlist |
| Cổng, vòng lặp, "không nới lỏng test" | chỉ dựa vào chỉ dẫn; guard không phân biệt sửa test đúng hay nới lỏng |
| `HIRE-APPROVED` | guard biến mọi lệnh Write/Edit **thêm** dòng `HIRE-APPROVED` mới vào `.team/STATE.md` thành hộp xác nhận (cả từ session chính); cú Allow của bạn mới là lời duyệt. Không chặn được: ghi bằng Bash từ session chính của bạn (session chính không bị guard giới hạn), và chế độ `bypassPermissions` có thể bỏ qua hộp xác nhận |
| Tool MCP của lead | lead nhận toàn bộ tool của session; guard không thấy tool MCP (GitHub, Slack…), nên "không mở PR" qua MCP chỉ dựa vào chỉ dẫn |
| Nội dung skill | guard kiểm soát *skill nào* được nạp, không kiểm soát nội dung; skill có lệnh shell tự chạy hoặc `allowed-tools` có thể đi ngoài guard. Chỉ khai skill bạn đã đọc |
| WebFetch | có thể đọc nội dung độc hại hoặc làm lộ dữ liệu qua URL; run-kit dặn coi web là dữ liệu và không đưa code/secret vào truy vấn, guard không kiểm tra URL |
| DB `localhost` | có thể là tunnel tới production do bạn tự mở; config của tool có thể hardcode host. Bảo đảm thật: máy dev không có credential production |
| Thiếu Node | không có guard, không có kiểm tra phiếu |
| Session chính | không bị guard giới hạn (trừ khi lead là session chính), ngoại trừ hộp xác nhận khi thêm `HIRE-APPROVED`; agent ngoài team không trong `externalAgents` cũng không bị đụng tới |

---

## 8. Run kit và phiếu bàn giao

| Thành phần | Ở đâu | Nạp thế nào | Nội dung |
|---|---|---|---|
| `test-process` | `skills/test-process/SKILL.md` (~550 từ, luật bắt buộc) + `references/`: `process.md`, `techniques.md`, `quality-checklist.md`, `ux-verification.md`, `defects-and-reports.md` | preload vào **qa** | quy trình ISTQB gắn vào pipeline: lập kế hoạch dựa trên rủi ro + review tĩnh (P3a), entry/exit criteria, phân tích → thiết kế (EP, BVA, decision table, state transition, pairwise, exploratory theo charter) → triển khai → thực thi → theo dõi → hoàn tất; các đặc tính chất lượng ISO/IEC 25010:2023; xác minh UI/UX (khớp DESIGN.md, 10 heuristic của Nielsen, WCAG 2.2 AA); mẫu báo lỗi, severity × priority, vòng đời lỗi, retest/regression, test summary |
| `live-preview` | `skills/live-preview/SKILL.md` (~550 từ) + `references/`: `pass.md`, `common-bugs.md`, `web.md`, `mobile.md`, `desktop.md`, `cli.md`, `service.md` | preload vào **qa**; developer (tự kiểm tra trước khi bàn giao) và designer nạp khi cần, không cần cấu hình | nhận diện loại sản phẩm → build và chạy bản thật ở nền → điều khiển từng AC qua đúng giao diện: web/extension (Playwright), mobile (Maestro/Detox/`integration_test`/Espresso/XCUITest trên emulator/simulator), desktop (Playwright-Electron, WebDriver, framework UI test; `xvfb-run` khi headless), CLI/TUI (transcript: args, stdin, exit code, pty), API/service/worker/bot (HTTP/gRPC/queue với dependency thật). Thu lỗi/log/crash, screenshot hoặc transcript theo form factor, trạng thái rỗng/tải/lỗi, vòng đời; danh mục lỗi hay lọt qua test xanh, có nhóm riêng cho mobile, desktop, CLI, service |
| `run-kit` | `skills/run-kit/SKILL.md` (quy tắc + phiếu bàn giao) + `references/usage.md` (cách dùng) | SKILL.md (~600 từ) preload vào **mọi** agent; `usage.md` chỉ đọc khi cần; session chính nạp khi bạn hỏi cách dùng; `/technical-team:run-kit` để xem | cách dùng (chế độ, bảng lệnh, cổng, vòng lặp, specialist, skill), quy tắc làm việc, **phiếu bàn giao** |
| Lead manual | `agents/lead.md`, phần cuối | system prompt của lead | tầng, cổng, vòng lặp, mẫu brief, bảng quyền, `.team/`, điểm gắn, mẫu báo cáo |
| Pipeline | `commands/<lệnh>.md` → `## Pipeline` | lead đọc bằng Read khi chạy | các bước, agent, song song, cổng, vòng lặp, file `.team/`, điểm gắn, kết thúc |

Nội dung agent, command và skill viết dạng bảng + sơ đồ Mermaid, bằng tiếng Anh. Agent luôn trả lời theo ngôn ngữ của bạn mà lead ghi trong brief. Chi phí cố định mỗi session khoảng 1,9k token.

### Phiếu bàn giao (mọi agent, cuối mỗi lần chạy)

```
### Phiếu bàn giao
- **Kết quả:** xong | vướng | cần quyết định
- **Bằng chứng:** <output lệnh, test, hoặc file:line>
- **Đã ghi vào:** <file đã tạo/sửa, hoặc "không">
- **Còn mở:** <rủi ro, câu hỏi, việc chưa làm>
- **Đề xuất bước tiếp:** <ai làm gì tiếp>
```

| Cơ chế | |
|---|---|
| Định nghĩa | chỉ ở `run-kit` §3 |
| Kiểm tra | hook `SubagentStop` đọc chính mẫu đó; thiếu hoặc sai → trả agent lại kèm mẫu, tối đa 2 lần, sau đó lead coi là `vướng` |
| Lead | kết thúc bằng `## Báo cáo …` hoặc `## Chờ duyệt …` thay cho phiếu |

---

## 9. Specialist và tuyển dụng

Khi team thiếu chuyên môn domain, hr tuyển **specialist**. Specialist nằm ở một trong hai nơi:

| Loại | Ở đâu | Có hiệu lực |
|---|---|---|
| Specialist của plugin | `agents/` + `config/agents.json` của plugin (tuyển khi làm việc trong repo `technical-team`) | mọi project dùng plugin |
| Specialist của project | `.claude/agents/<tên>.md` + dòng `.team/ROSTER.md` | chỉ project đó, khi dòng `active` và `STATE.md` có `HIRE-APPROVED: <tên>` |

Agent của plugin **không bao giờ bị thay thế** bằng file agent của project hay user:
- Guard chỉ nhận agent của plugin dưới tên `technical-team:<tên>`. Một agent tên `developer` trong project không phải agent của team, và lead không gọi được nó.
- hr không được tạo file trùng tên agent của plugin.
- Muốn mở rộng thì dùng cấu hình (mục 11) hoặc `hire`.

### Quy trình `hire`

```mermaid
flowchart TD
  A[Nhu cầu + lý do] --> B{vai trò của team hoặc specialist có sẵn đã làm được?}
  B -- có --> N[không tuyển]
  B -- chưa --> C[hr: hồ sơ domain có nguồn + hồ sơ specialist + câu hỏi]
  C --> D[architect ∥ pm ∥ vai trò gần nhất: chỉ trả lời chỗ đặt]
  D --> E[hr: một đề xuất + điểm bất đồng]
  E --> F[lead: kiểm tra quyền tối thiểu]
  F --> G{{cổng tuyển dụng: bạn duyệt}}
  G -- duyệt --> H{đang ở repo technical-team?}
  H -- có --> I[agents/tên.md + config/agents.json + README]
  H -- không --> J[.claude/agents/tên.md + dòng ROSTER]
```

| Quy tắc | |
|---|---|
| Quyền tối thiểu | mặc định chỉ đọc và tư vấn; Write/Edit/Bash chỉ khi thật sự cần, kèm lý do; không bao giờ có `Agent`; phạm vi ghi không chồng ai; preload `technical-team:run-kit` |
| Repo plugin | khi gốc project có `.claude-plugin/plugin.json` tên `technical-team`, agent được tuyển thành **specialist của plugin**; có hiệu lực sau `/reload-plugins` |
| Project khác | specialist của riêng project; `.claude/agents/` thường nhận trong vài giây, khởi động lại nếu thư mục chưa có lúc mở session |
| Cách duyệt | trả lời "duyệt" ở session chính như mọi cổng khác; khi lead ghi `HIRE-APPROVED`, Claude Code hiện hộp xác nhận kèm dòng sẽ ghi. Đọc rồi bấm Allow: đó mới là lời duyệt. Lead phải chạy foreground ở bước này; agent chạy nền không hiện được hộp nên lệnh ghi bị từ chối và hire chưa được duyệt |
| Rà soát (`hire --roster`) | hr đề xuất cho nghỉ specialist lâu không dùng hoặc trùng việc; bạn duyệt; hr không xóa file, bạn tự xóa |

| Điểm gắn | Cùng ai | Khi nào |
|---|---|---|
| `design` | architect | trước G1 |
| `execute` | developer | khi triển khai |
| `review` | code-reviewer | bước code review, trước qa; chặn merge giữ G3 |
| `test` | qa | bước qa, trước G2 |

---

## 10. Không gian làm việc `.team/`

| File | Người ghi | Nội dung |
|---|---|---|
| `.team/STATE.md` | lead | work item, tầng/pipeline, cổng, phê duyệt, `Loop log`, kết quả, phát hiện hoãn, `HIRE-APPROVED`, lần dùng specialist, báo cáo cuối |
| `.team/SPEC.md` | analyst | user story, acceptance criteria, trường hợp biên |
| `.team/DESIGN.md` | designer | design system (đầu file); mỗi work item: flow, màn hình, ma trận trạng thái, copy |
| `.team/PLAN.md` | architect | plan triển khai |
| `.team/TASKS.md` | pm (ticket) + qa (section `### QA`) | ticket, ước lượng, phụ thuộc, tập file độc quyền, trạng thái; mỗi work item có section QA: test plan, review tĩnh, RTM, nhật ký từng vòng, lỗi, test summary. Hai bên không sửa phần của nhau (guard chỉ phân quyền theo file, không theo section) |
| `.team/OPS_HANDOFF.md` | devops | thông tin vận hành thô cho writer |
| `.team/ROSTER.md` | hr | specialist của project |
| `.team/ARCHITECTURE.md` | architect | tổng quan kiến trúc |
| `.team/adr/NNNN-<quyet-dinh>.md` | architect | ADR |
| `.team/docs/**` | writer | runbook, API docs, hướng dẫn |

| Quy ước | |
|---|---|
| Mã định danh | lead cấp `W-001`, `W-002`…; SPEC (`W-001.AC1`), PLAN, TASKS (`W-001-T1`) dùng chung mã |
| Trạng thái | SPEC/PLAN `draft` → `done` (PLAN có `superseded`); TASKS `todo` · `doing` · `blocked` · `review` · `done`; phê duyệt G1 chỉ ghi ở `STATE.md` |
| Archive | work item `done` → mỗi chủ file tự chuyển phần của mình sang `.team/archive/<FILE>-<YYYY-MM>.md` |
| Nội dung | tóm tắt và kết luận; không log dài, không secret, không dữ liệu thật |
| Quy ước vận hành | nằm trong plugin, không nằm trong `.team/` |

---

## 11. Cấu hình theo project

Mọi tùy biến nằm trong `.claude/technical-team.json`. File này do `init` tạo ra (không có thì dùng mặc định) và **chỉ bạn sửa**, vì guard chặn mọi agent ghi vào `.claude/`.

```json
{
  "commands": {
    "build": ["npm run build"],
    "lint":  ["npm run lint"],
    "test":  ["npm test", "npx playwright test"],
    "run":   ["npm run dev"],
    "infra": ["docker build", "docker compose", "terraform plan"]
  },
  "paths": {
    "infra": ["tools/release/**"],
    "tests": ["qa-fixtures/**"],
    "docs":  ["handbook/**"],
    "architecture": [],
    "data": ["database/sql/**"]
  },
  "devopsAllowRemote": false,
  "externalAgents": ["Explore"],
  "db": {
    "commands": [],
    "allowedHosts": ["localhost", "127.0.0.1", "::1", "db"],
    "allowedDatabases": ["*_test", "*_dev", "*_local"],
    "envFile": ".env.test"
  },
  "skills": {
    "designer": ["<skill-ui-ux-cài-từ-github>"],
    "developer": ["react-native", "mobile-kit:ios-release", "<skill-frontend-cài-từ-github>"],
    "qa": ["detox-e2e"]
  }
}
```

| Mục | Tác dụng |
|---|---|
| `commands` | mỗi mục là một tiền tố lệnh; danh sách khác rỗng thì vai trò đó chuyển sang allowlist (7.4) |
| `paths` | **cộng thêm** vào mặc định trong `config/ownership.json`; `paths.data` mở rộng vùng ghi của dba, `paths.<specialist plugin>` mở rộng vùng của specialist đó |
| `devopsAllowRemote` | `true` cho devops chạy `docker push`, `kubectl apply`, `terraform apply`… (mặc định tắt) |
| `externalAgents` | agent ngoài team mà lead được gọi để lấy ngữ cảnh hiện trạng; luôn chạy chỉ-đọc, kể cả khi bạn tự gọi; `[]` để tắt |
| `db` | `commands` rỗng = dùng danh sách mặc định; `allowedHosts` thêm service DB của docker-compose; `allowedDatabases` là glob; `envFile` là file env mà tool thật sự đọc |
| `skills` | skill mỗi vai trò được nạp; skill của project ghi tên trần (`.claude/skills/<tên>/`), skill plugin khác ghi `<plugin>:<skill>`; lead chỉ ghi vào brief skill hợp với việc đang giao; specialist khai theo tên |
| JSON lỗi | guard chặn mọi lệnh ghi/Bash của team cho tới khi bạn sửa |

Skill chỉ thêm kiến thức, không thêm quyền. Skill UI/UX bạn cài từ GitHub thì khai vào `skills.designer`; skill frontend tương ứng khai vào `skills.developer`, vì developer mới là người dựng UI. Lead tự chọn skill phù hợp cho từng brief. `live-preview` đi kèm plugin nên không cần khai.

Live preview cần driver của nền tảng: `@playwright/test` (web, Electron), Maestro/Detox/`integration_test` + emulator (mobile), `xvfb-run` (desktop Linux headless), Hurl/curl (API). qa không được cài (guard chặn), nên với project chưa có thì qa dừng ở `cần quyết định` để developer/devops thêm. Với `new`, việc này nằm sẵn trong scaffold M1. Ở chế độ allowlist, thêm lệnh khởi động vào `commands.run` và lệnh driver (`maestro test`, `adb`, `xvfb-run …`) vào `commands.test`. File build/release mobile như Fastlane hay `eas.json` nên khai vào `paths.infra`.

---

## 12. Giới hạn đã biết

| Giới hạn | Chi tiết |
|---|---|
| Chưa chạy end-to-end với model thật | đã kiểm chứng: `claude plugin validate --strict` (plugin + marketplace), cài thử và `claude plugin details`, 53 unit test (guard, phiếu bàn giao, tính nhất quán của bộ lệnh), chạy thử `init` |
| Live preview | cần driver của nền tảng có sẵn (Playwright, Maestro/Detox, emulator Android, Xvfb…); qa không tự cài được (guard chặn) mà dừng ở `cần quyết định`. Máy không chạy được nền tảng đó (iOS simulator cần macOS, app chỉ chạy trên Windows) thì qa preview phần chạy được và ghi rõ phần chưa preview. Subagent không dùng được preview pane của app Claude; bằng chứng là output của runner, screenshot/transcript trong `test-results/`, qa và designer xem ảnh bằng Read |
| Chất lượng UI | designer chỉ đặc tả và review; code UI vẫn do developer viết. Kết quả đẹp hay không phụ thuộc vào skill frontend bạn khai cho `skills.developer` và thư viện UI của project |
| Chưa kiểm chứng được | giá trị `agent_type` thực tế cho agent plugin; preload skill bằng tên có tiền tố (`technical-team:run-kit`); tên trường input của tool `Skill` (guard chặn khi không đọc được tên); trường `last_assistant_message` của `SubagentStop` (thiếu thì hook không chặn) |
| Thử nhanh sau khi cài | `/technical-team:status`, rồi nhờ `technical-team:pm` ghi thử vào `README.md` → guard phải từ chối |
| Chi phí | `feature` gọi khoảng 10–12 lượt agent (đã gồm designer P1a, qa P3a); mỗi vòng D3 làm nhiều việc hơn (live preview, UI/UX, exploratory), từ vòng 2 qa chỉ retest + regression + phần mới đổi (nhiều hơn nếu có vòng lặp, specialist); dùng `run` để lead chọn tầng nhẹ nhất |
| Commit/push | mọi agent bị chặn, kể cả khi bạn yêu cầu; lead đưa lệnh để bạn tự chạy |
| Lead gọi agent ngoài | chỉ những agent trong `externalAgents` (mặc định `Explore`, chỉ-đọc); `general-purpose`, `Plan`, fork, agent plugin khác bị chặn; kết quả của Explore chỉ là ngữ cảnh, không phải bằng chứng cho cổng |
| Explore ở session chính | hook không biết ai gọi Explore, nên khi bạn tự dùng nó cũng chạy chỉ-đọc |
| Hook timeout | guard 15 giây, kiểm tra phiếu 10 giây; với session thường cả hai thoát ngay |

---

## 13. Phát triển plugin

| Việc | Lệnh |
|---|---|
| Test | `node --test "tests/*.test.mjs"` (guard + kiểm tra bộ lệnh/agent/skill khớp run-kit và README) |
| Validate | `claude plugin validate . --strict` và `claude plugin validate .claude-plugin/marketplace.json --strict` |
| Chạy thử bản đang sửa (từ thư mục clone của repo) | `claude --plugin-dir .`, sửa xong gõ `/reload-plugins` |
| Tuyển specialist vào plugin | mở chính repo này làm project rồi chạy `/technical-team:hire …` |

**Quy tắc khi sửa plugin:** mỗi lần thêm, đổi tên, gộp hoặc xóa một **agent, skill hay command** (kể cả đổi tham số/cờ), cập nhật trong cùng thay đổi:

| Thay đổi | Cập nhật |
|---|---|
| command (tên, `argument-hint`, cờ, gate) | `skills/run-kit/references/usage.md` §2, README mục 6 (+ 6.1 nếu là `new`), `agents/lead.md` §1 nếu ảnh hưởng tầng, dòng "Called in" của agent liên quan |
| agent (thêm/xóa/đổi quyền, tool) | README mục 4 và 7, `agents/lead.md` (Who, §5), `skills/run-kit/references/usage.md` §4 nếu là specialist |
| skill | `skills/run-kit/SKILL.md` + README mục 8 |

`tests/commands.test.mjs` fail khi bảng lệnh trong run-kit/README lệch với `commands/`, khi còn tham chiếu tới lệnh đã bỏ, khi `new` gọi một bước không còn tồn tại, hoặc khi một agent/skill không có trong README.

```
technical-team/
├── .claude-plugin/
│   ├── plugin.json
│   └── marketplace.json
├── agents/                 14 vai trò
├── commands/               12 lệnh, mỗi lệnh chứa pipeline của nó (biến thể = cờ)
├── skills/run-kit/         tài liệu sử dụng + quy tắc chung + phiếu bàn giao
├── skills/test-process/    quy trình kiểm thử của QA + references/ (kỹ thuật, đặc tính chất lượng, xác minh UI/UX, lỗi và báo cáo)
├── skills/live-preview/    kiểm thử trên sản phẩm đang chạy + references/ (lỗi hay gặp, web, mobile, desktop, cli, service)
├── hooks/
│   ├── hooks.json          PreToolUse → guard.mjs, SubagentStop → handoff-check.mjs
│   ├── guard.mjs           thực thi phân quyền
│   └── handoff-check.mjs   bắt buộc phiếu bàn giao
├── config/
│   ├── ownership.json      chủ sở hữu đường dẫn (cả `data` của dba), dbCommands, externalAgents
│   └── agents.json         specialist tuyển vào plugin (hiện trống)
├── scripts/team-init.mjs
├── templates/              .team/*.md, ARCHITECTURE.md, adr.md, specialist-agent.md, technical-team.json
└── tests/                  guard.test.mjs, commands.test.mjs
```

**Vai trò có thể cần sau này** (tuyển qua `hire` khi project cần): product owner (ưu tiên backlog giữa nhiều work item; hiện là bạn).
