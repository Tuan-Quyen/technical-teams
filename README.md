# technical-team

Plugin Claude Code dựng một team kỹ thuật gồm **13 agent** do một tech lead điều phối (mặc định bao gồm cả `dba`): phân tầng công việc, 4 cổng chất lượng, vòng lặp giao hàng chạy tới khi pass, **18 lệnh workflow** (mỗi lệnh chứa luôn pipeline của nó), skill **`run-kit`** (tài liệu sử dụng + quy tắc chung + handoff block tiếng Anh), một **guard hook** chặn bằng cấu hình những gì mỗi vai trò không được làm, và quy trình **HR** để tuyển thêm specialist theo domain. Không gắn với ngôn ngữ hay framework nào: mỗi agent tự đọc stack, convention và lệnh build/test của repo.

---

## Mục lục
1. [Yêu cầu](#1-yêu-cầu)
2. [Cài đặt, chạy thử, gỡ](#2-cài-đặt-chạy-thử-gỡ)
3. [Hai cách làm việc với tech lead](#3-hai-cách-làm-việc-với-tech-lead)
4. [Đội hình, model và ranh giới vai trò](#4-đội-hình-model-và-ranh-giới-vai-trò)
5. [Phân quyền và mức bảo vệ thực tế](#5-phân-quyền-và-mức-bảo-vệ-thực-tế)
6. [Tầng, cổng, vòng lặp](#6-tầng-cổng-vòng-lặp)
7. [Lệnh workflow (kèm ví dụ)](#7-lệnh-workflow-kèm-ví-dụ)
8. [Run kit](#8-run-kit)
9. [Tuyển specialist](#9-tuyển-specialist)
10. [Không gian làm việc `.team/`](#10-không-gian-làm-việc-team)
11. [Tùy biến](#11-tùy-biến)
12. [Giới hạn đã biết](#12-giới-hạn-đã-biết)
13. [Phát triển plugin](#13-phát-triển-plugin)
14. [Ghi chú về các vai trò mặc định](#14-ghi-chú-về-các-vai-trò-mặc-định)

---

## 1. Yêu cầu

| Thành phần | Phiên bản | Vì sao |
|---|---|---|
| Claude Code | **≥ 2.1.246**, khuyến nghị bản mới nhất. Đã validate với **2.1.318** | Subagent gọi subagent (mặc định sâu 3 tầng từ 2.1.219), tool `Agent`, tên skill plugin có tiền tố, `agent_type` trong input của hook |
| Node.js | **≥ 18**, có trên `PATH` | Guard hook (`hooks/guard.mjs`) và script `init` chạy bằng Node |

> ⚠️ Nếu máy không có `node`, hook lỗi theo kiểu *không chặn*: Claude Code coi đó là lỗi hook thông thường và **cho lệnh chạy tiếp**. Khi đó mọi giới hạn ghi/Bash chỉ còn dựa vào chỉ dẫn trong prompt. Kiểm tra bằng `node --version` trước khi dùng.

Không đặt `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH=1`: khi chạy qua lệnh workflow, chuỗi gọi là *session chính → lead → thành viên* (2 tầng).

---

## 2. Cài đặt, chạy thử, gỡ

Thư mục này vừa là plugin (`.claude-plugin/plugin.json`) vừa là marketplace (`.claude-plugin/marketplace.json`, tên `technical-team-marketplace`).

### Chạy thử local (không cài)
```bash
claude --plugin-dir "D:/code/AI/storage/plugin/technical-team"
```
Plugin chỉ có hiệu lực trong session đó. Sửa file xong, gõ `/reload-plugins` trong session để nạp lại.

### Cài theo user scope (mọi project của bạn)
```bash
claude plugin marketplace add "D:/code/AI/storage/plugin/technical-team"
claude plugin install technical-team@technical-team-marketplace --scope user
```

### Cài theo project scope (bật cho cả team qua settings của repo)
Từ thư mục gốc của repo:
```bash
claude plugin marketplace add <nguồn-marketplace> --scope project
claude plugin install technical-team@technical-team-marketplace --scope project
```
Lệnh ghi vào `.claude/settings.json` của repo; commit file đó để cả team dùng chung. Đường dẫn local (`D:/...`) chỉ chạy trên máy bạn; để đồng đội cài được, hãy đẩy thư mục plugin lên một git repo và dùng nguồn git. Ví dụ `.claude/settings.json`:
```json
{
  "extraKnownMarketplaces": {
    "technical-team-marketplace": {
      "source": { "source": "git", "url": "https://<git-host>/<org>/technical-team.git" }
    }
  },
  "enabledPlugins": {
    "technical-team@technical-team-marketplace": true
  }
}
```

### Gỡ
```bash
claude plugin uninstall technical-team@technical-team-marketplace --scope user     # hoặc --scope project
claude plugin marketplace remove technical-team-marketplace                        # nếu không cần marketplace nữa
```
Gỡ plugin **không** xóa `.team/`, `ARCHITECTURE.md`, `docs/adr/` hay specialist trong `.claude/agents/` của project: đó là dữ liệu của project.

### Kiểm tra sau khi cài
```bash
claude plugin details technical-team    # 13 agent, 19 skill (18 lệnh + run-kit), 2 hook (PreToolUse, SubagentStop)
```
Trong session: `/agents` phải thấy `technical-team:lead` … `technical-team:hr`.

### Bắt đầu ở một project
```
/technical-team:init
```
Tạo `.team/` từ template, `.claude/agents/` (để specialist tuyển sau này nạp được) và `.claude/technical-team.json`. Không bao giờ ghi đè file đã có. Nên commit `.team/`.

---

## 3. Hai cách làm việc với tech lead

| Cách | Khởi động | Tại cổng cần bạn duyệt |
|---|---|---|
| **Qua lệnh / subagent** (mặc định) | Gõ một lệnh workflow, ví dụ `/technical-team:feature ...`. Session chính giao cho `technical-team:lead` chạy như subagent | Subagent không hỏi bạn giữa chừng được, nên lead **ghi trạng thái vào `.team/STATE.md`, dừng và trả về "Chờ duyệt"**. Bạn trả lời trong session chính; session chính gọi lại lead với câu trả lời nguyên văn |
| **Lead làm luồng chính** | `claude --agent technical-team:lead`, hoặc đặt `"agent": "technical-team:lead"` trong `.claude/settings.json` của project | Lead hỏi bạn trực tiếp trong hội thoại |

Lệnh workflow dùng được ở cả hai cách: khi session *chính là* lead, lead chạy thẳng phần `## Pipeline` của lệnh thay vì sinh thêm một lead nữa.

**Tự cấp ngữ cảnh bằng skill ngoài:** bạn có thể cài thêm skill từ project khác (kiến thức domain, quy ước công ty…) và tự gọi trong session chính trước khi chạy lệnh. Agent không thấy hội thoại, nên khi giao việc session chính tóm tắt trung thực những gì bạn đã cung cấp vào mục **User-provided context** của prompt gửi lead, và lead đưa phần liên quan vào brief của từng agent (ô `Context`). Muốn một vai trò **tự nạp** skill khi làm việc (ví dụ developer với skill mobile), xem mục 11 → "Skill theo vai trò".

Plugin **cố ý không** đặt `agent` trong `settings.json` của plugin: làm vậy sẽ biến mọi session ở mọi project bật plugin thành tech lead (với shell bị giới hạn ở `git status`/`git diff`).

Khi lead là luồng chính, guard áp quyền của lead lên chính session đó. Muốn tự sửa tay một file, hãy mở một session thường.

---

## 4. Đội hình, model và ranh giới vai trò

Tên agent đầy đủ có tiền tố plugin: `technical-team:<tên>`.

| Tên | Vai trò | Model | Trách nhiệm |
|---|---|---|---|
| `lead` | Tech lead | opus | Người duy nhất phân việc: xếp tầng, chạy pipeline, giữ cổng, báo cáo |
| `analyst` | Business analyst | sonnet | User story, acceptance criteria kiểm chứng được, trường hợp biên, câu hỏi mở |
| `architect` | Architect | opus | Thiết kế, plan triển khai, `ARCHITECTURE.md`, ADR (lý do + phương án đã loại) |
| `pm` | Project manager | sonnet | Ticket, ước lượng, phụ thuộc, tập file độc quyền, nhóm song song, trạng thái |
| `developer` | Developer (fullstack) | sonnet | Viết/sửa code theo plan; giữ hợp đồng backend–frontend khớp nhau |
| `debugger` | Debugger | opus | Tái hiện, khoanh vùng, chứng minh nguyên nhân gốc, đề xuất hướng sửa. Không sửa code |
| `qa` | QA | sonnet | AC → test, viết và chạy test, kết luận PASS/FAIL; regression test cho bug |
| `code-reviewer` | Code reviewer | sonnet | Review **code** (diff) chỉ-đọc — không phải review project/sản phẩm. Đứng ngay sau developer, trước QA. Phân mức chặn merge / nên sửa / gợi ý, có `file:line` |
| `security` | Security | opus | Audit code, dependency, secrets, phân quyền, cấu hình |
| `devops` | DevOps | sonnet | CI/CD, Docker, deploy, hạ tầng; ghi thông tin vận hành vào `.team/OPS_HANDOFF.md` |
| `writer` | Technical writer | sonnet | README, API docs, CHANGELOG, runbook vận hành hệ thống, hướng dẫn |
| `hr` | HR | opus | Tuyển specialist khi team thiếu chuyên môn domain |
| `dba` | Database administrator (DBA) | opus | Migration không downtime (đánh giá lock, backfill, expand → migrate → contract, rollback) và review schema/query rủi ro |

Model là alias (`opus`/`sonnet`) nên luôn theo bản mới nhất.

**Tài liệu của `writer`** phải chính xác (đối chiếu code, config, script thật và `OPS_HANDOFF.md`; chỗ chưa kiểm chứng được đánh dấu `⚠️ Chưa kiểm chứng`), dễ lướt (tiêu đề rõ, bước đánh số, lệnh copy chạy được, ý quan trọng ở đầu) và viết cho người đang ở giữa một việc cụ thể.

### Ranh giới (được ghi trong file của cả hai bên)

| Cặp | Ranh giới |
|---|---|
| pm ↔ analyst | analyst quyết định *cái gì / vì sao* (story, AC); pm quyết định ticket, thứ tự, ước lượng. pm không sửa AC, analyst không chia ticket |
| pm ↔ architect | architect quyết định *làm thế nào*; pm chia plan đã duyệt thành ticket, không đổi thiết kế. Không chia sạch được thì báo architect |
| pm ↔ lead | pm đề xuất thứ tự, nhóm song song, theo dõi trạng thái; chỉ lead giao việc, chọn pipeline và cho qua cổng |
| debugger ↔ developer | debugger chẩn đoán có bằng chứng, không viết patch; developer sửa theo chẩn đoán, không chẩn đoán lại. Sửa không ăn → quay lại debugger |
| developer ↔ qa (test) | qa viết test mới và kết luận PASS/FAIL; developer chỉ **Edit** test cũ bị gãy do hành vi được *chủ đích* thay đổi |
| dba ↔ developer | developer giữ code model/ORM và schema-as-code (như `schema.prisma`); dba giữ migration, seed, dump schema và chạy lệnh DB/migrate |
| devops ↔ writer | devops ghi dữ kiện thô vào `OPS_HANDOFF.md` và sửa file hạ tầng; writer biến dữ kiện thành runbook/tài liệu, không sửa hạ tầng |
| hr ↔ lead (tuyển) | lead phát hiện và đề xuất nhu cầu, chuyển câu hỏi tham vấn, ghi phê duyệt của bạn; hr đánh giá nhu cầu có thật không, tra cứu, soạn hồ sơ, tạo specialist. Bạn là người quyết định |

---

## 5. Phân quyền và mức bảo vệ thực tế

Nguyên tắc: mỗi agent chỉ có đúng tool và phạm vi ghi công việc cần.

### 5.1 Ba lớp bảo vệ

| Lớp | Cơ chế | Chặn được gì |
|---|---|---|
| **A. Frontmatter `tools`** | Claude Code chỉ đưa cho agent các tool được liệt kê | Loại tool: agent không có `Bash` thì không chạy được shell; không có `Write`/`Edit` thì không ghi file bằng tool; chỉ lead có `Agent` |
| **B. Guard hook** (`hooks/guard.mjs`, `PreToolUse`) | Đọc `agent_type` trong input hook để biết lệnh gọi đến từ agent nào, rồi cho/không cho | Đường dẫn ghi theo chủ sở hữu, nội dung lệnh Bash theo vai trò, ai được gọi agent nào, cổng duyệt tuyển dụng, skill nào được nạp |
| **B2. Handoff check** (`hooks/handoff-check.mjs`, `SubagentStop`) | Đọc `last_assistant_message` khi một agent của team kết thúc | Thiếu khối Handoff, thiếu nhãn (`Result`, `Evidence`, `Files changed`, `Open items`, `Next steps`), `Result` sai giá trị, `done` không có bằng chứng → agent bị trả lại kèm mẫu Handoff (tối đa 2 lần). Lead phải kết thúc bằng báo cáo cuối hoặc báo cáo chờ duyệt |
| **C. Chỉ dẫn** (prompt agent + run kit) | Agent tự tuân thủ | Mọi thứ còn lại: thứ tự pipeline, cổng G1–G4, giới hạn vòng lặp, "không nới lỏng test", chất lượng bằng chứng |

Những gì tài liệu Claude Code xác nhận và ảnh hưởng tới thiết kế:
- Agent trong plugin **bị bỏ qua** các trường `hooks`, `mcpServers`, `permissionMode`. Vì vậy không thể gắn hook riêng vào từng agent; mọi kiểm tra theo vai trò nằm trong **một hook cấp plugin** (`hooks/hooks.json`) và phân biệt vai trò bằng `agent_type`.
- Cú pháp `Bash(<pattern>)` **không được tài liệu hóa cho trường `tools`** của subagent (chỉ `Agent(<type>)` có, và bị bỏ qua khi agent chạy như subagent). Các agent khai `Bash` trơn; việc giới hạn lệnh do guard làm.
- Subagent không bao giờ có `AskUserQuestion`; đó là lý do lead phải dừng tại cổng khi chạy dưới dạng subagent.

### 5.2 Bảng phân quyền

| Vai trò | Tools (lớp A) | Quyền ghi (lớp B) | Bash (lớp B) |
|---|---|---|---|
| lead | Agent, Read, Write, Edit, Glob, Grep, Bash, Skill | Chỉ `.team/STATE.md` | Chỉ `git status`, `git diff` (+ bộ lọc `head`/`tail`/`grep`/`wc`/`sort`/`uniq`/`cut`), và script `init` của plugin |
| analyst | Read, Write, Edit, Glob, Grep, Skill | Chỉ `.team/SPEC.md` | Không có tool |
| architect | Read, Write, Edit, Glob, Grep, Skill | `.team/PLAN.md`, `ARCHITECTURE.md`, `docs/adr/**` | Không có tool |
| pm | Read, Write, Edit, Glob, Grep, Skill | Chỉ `.team/TASKS.md` | Không có tool |
| developer | Read, Write, Edit, Glob, Grep, Bash, Skill | Mọi đường dẫn **không** thuộc ai khác; test có sẵn chỉ bằng `Edit` | Build, lint, test, chạy local; chặn lệnh nguy hiểm; allowlist nếu cấu hình |
| debugger | Read, Glob, Grep, Bash, Skill | Không | Chỉ-đọc (chạy app/test, đọc log, git chỉ-đọc) |
| qa | Read, Write, Edit, Glob, Grep, Bash, Skill | Chỉ file/thư mục test | Chỉ-đọc, hoặc chỉ các lệnh test đã cấu hình |
| code-reviewer | Read, Glob, Grep, Bash, Skill | Không | Chỉ `git diff`, `git log` (+ bộ lọc) |
| security | Read, Glob, Grep, Bash, Skill | Không | Chỉ-đọc (audit, secret scan; chặn `audit fix`) |
| devops | Read, Write, Edit, Glob, Grep, Bash, Skill | File hạ tầng + `.team/OPS_HANDOFF.md` | Docker/IaC/kiểm tra config; chặn thay đổi môi trường từ xa trừ khi bật |
| writer | Read, Write, Edit, Glob, Grep, Skill | `README.md`, `CHANGELOG.md` (mọi cấp), `docs/**` trừ `docs/adr/**` | Không có tool |
| hr | Read, Write, Edit, Glob, Grep, WebSearch, WebFetch, Skill | File specialist đã duyệt (`.claude/agents/<tên>.md` hoặc `~/.claude/agents/<tên>.md`) + `.team/ROSTER.md` | Không có tool |
| specialist | Do HR đề xuất, bạn duyệt; không bao giờ có `Agent`; có `Skill` | Cột `Write scope` trong `ROSTER.md`, chỉ khi `STATE.md` có `HIRE-APPROVED: <tên>` (mặc định không) | Cột `Bash`: `none` / `readonly` / `developer` / `db-local` (mặc định `none`) |
| dba | Read, Write, Edit, Glob, Grep, Bash, Skill | File migration, seed, schema dump (`config/members.json` → `dba.write`, project mở rộng bằng `paths.dba`) | `db-local` (mục 5.4b) |

**Lệch so với bảng gốc, có chủ đích:**
- **Mọi agent có thêm `Skill`**, để nạp skill theo vai trò mà bạn khai trong `.claude/technical-team.json` → `skills`. Guard chặn mọi skill ngoài `run-kit` và danh sách của đúng vai trò đó.
- **Lead và code-reviewer khai `Bash` thay vì `Bash(git status:*)`**, vì lý do ở 5.1. Giới hạn vẫn đúng như bảng, nhưng do guard thực thi.

### 5.3 Mỗi đường dẫn có đúng một chủ

Guard xác định chủ theo thứ tự, khớp đầu tiên thắng:

1. **Không ai ghi:** `.git/**`, `.claude/**` (trừ file specialist cho hr), `.env` và `.env.*` (trừ `*.example`/`*.sample`/`*.template`), mọi file lạ trong `.team/`.
2. `.team/STATE.md` → lead · `SPEC.md` → analyst · `PLAN.md` → architect · `TASKS.md` → pm · `OPS_HANDOFF.md` → devops · `ROSTER.md` → hr (kể cả bản `archive/<FILE>-<YYYY-MM>.md`).
3. `ARCHITECTURE.md`, `docs/adr/**` → architect.
4. `README.md`, `**/README.md`, `CHANGELOG.md`, `**/CHANGELOG.md`, `docs/**` → writer.
5. File hạ tầng (Dockerfile, compose, `.github/workflows/**`, `.gitlab-ci.yml`, `Jenkinsfile`, `infra/**`, `deploy/**`, `k8s/**`, `helm/**`, `terraform/**`, `ops/**`, `scripts/ci|deploy|ops/**`, …) → devops.
6. File test (`tests/**`, `test/**`, `__tests__/**`, `e2e/**`, `spec/**`, `*.spec.*`, `*.test.*`, `*_test.*`, `test_*.py`, …) → qa.
7. Đường dẫn của `dba` (và các thành viên cấu hình trong `config/members.json`: `**/migrations/**`, `db/migrate/**`, `**/db/migration/**`, `alembic/versions/**`, `drizzle/**`, `**/seeds/**`, `**/seeders/**`, `db/seeds.rb`, `prisma/seed.*`, `db/schema.rb`, `db/structure.sql`…) → `dba` / thành viên đó.
8. `Write scope` của specialist đang `active` trong `ROSTER.md` **và** có `HIRE-APPROVED` trong `STATE.md` → specialist đó (bị cắt khỏi vùng của developer; không thể chiếm đường dẫn ở bước 1–6). 
9. Còn lại → developer.

Danh sách đầy đủ ở `config/ownership.json`; mỗi project mở rộng được (mục 11). Ngoài thư mục project, không agent nào được ghi (trừ hr với `~/.claude/agents/` khi bạn chọn user scope).

### 5.4 Bash theo stack

Lệnh build/test mỗi project khác nhau nên plugin không hardcode được. Guard có hai chế độ cho developer, qa, devops:

| Chế độ | Khi nào | Bảo vệ |
|---|---|---|
| **Denylist** (mặc định) | `commands.*` trong `.claude/technical-team.json` để trống | Luôn chặn: `sudo`, `git commit/push`, `git reset --hard`, `git clean`, bỏ thay đổi (`git checkout -- .`, `git restore .`), `gh pr create/merge`, `curl … \| sh`, `rm -r` vào `/`, `~`, `..`, `.git`, `.team`, `.claude`. developer: chặn thêm lệnh thay đổi hạ tầng từ xa. qa (không cấu hình): như vai trò chỉ-đọc. Các redirect `>`/`tee` vào file của người khác bị chặn |
| **Allowlist** | Bạn điền `commands.build/lint/test/run` (developer), `commands.test` (qa), `commands.infra` (devops) | Chỉ các lệnh có tiền tố đó + lệnh chỉ-đọc (`ls`, `cat`, `grep`, `find` không `-delete/-exec`, `git status/diff/log/show`, …) |

**Vai trò chỉ-đọc** (debugger, security, specialist `readonly`) bị chặn: redirect ra file, `rm/mv/cp/mkdir/touch/chmod/ln/tee/dd/…`, `sed -i`, `perl -i`, git thay đổi repo, `find -delete/-exec`, `xargs`, cài/gỡ dependency, `docker push/rm`, `kubectl apply/delete…`, `helm install/upgrade…`, `terraform apply/destroy…`.

### 5.4b Lệnh database (`db-local`, dùng cho `dba`)

Mặc định `dba` là của technical-team nên luật này áp cho mọi project (specialist nào khác được duyệt mức `db-local` cũng vậy):

- **Chỉ specialist đó được chạy lệnh DB/migration.** Danh sách tiền tố mặc định ở `config/ownership.json` → `dbCommands` (Prisma, Django, Alembic, Rails, Flyway, Liquibase, EF Core, Knex, Sequelize, TypeORM, Drizzle, goose, dbmate, sqlx, diesel, atlas, `pg_dump`…) cộng các client `psql`, `mysql`, `sqlite3`, `mongosh`, `sqlcmd`…; project thay được bằng `db.commands`. Developer, qa… chạy những lệnh này đều bị chặn (lệnh như `npx prisma generate`, `npm test` vẫn chạy được). Test setup tự chạy migration vào DB test bên trong test runner không bị ảnh hưởng.
- **Đích kết nối phải chứng minh được là local/test**, bằng một trong ba cách: URL ghi ngay trong lệnh (`DATABASE_URL=postgresql://app@localhost:5432/app_test npx prisma migrate dev`), `--host` + `-d/--database`, hoặc `db.envFile` trỏ tới file env mà tool thật sự đọc. Host phải thuộc `db.allowedHosts`, tên DB phải khớp `db.allowedDatabases`. Không xác định được đích thì chặn.
- **Luôn chặn:** đích chứa biến shell (`$PROD_URL`, `$(…)`); lệnh có `prod`, `production`, `staging`, `live`, `uat`…; tunnel/port-forward (`ssh`, `kubectl port-forward`, `cloud-sql-proxy`, `gcloud sql connect`…); chạy file SQL qua client (`-f`, `<`); qua `psql -c`/`mysql -e` chỉ cho `EXPLAIN`, `SHOW`, `DESCRIBE`, `\d` và `SELECT` trên catalog; `EXPLAIN ANALYZE` với câu lệnh ghi.
- Ngoài lệnh DB, shell của `dba` là chỉ-đọc.

### 5.5 Những gì **không** chặn được bằng cấu hình

Nói thẳng để bạn không tin nhầm vào guard:
- **Bash vẫn có thể ghi file theo đường vòng.** Guard bắt redirect và `tee`, chặn lệnh ghi phổ biến với vai trò chỉ-đọc, nhưng một script (`node -e`, `python -c`, chương trình build, test runner tạo snapshot) vẫn có thể ghi bất cứ đâu. Đây là kiểm tra theo mẫu, không phải sandbox. Cần cách ly thật thì dùng chế độ sandbox của Claude Code hoặc allowlist.
- **Cổng G1–G4, thứ tự pipeline, vòng lặp chất lượng, "không nới lỏng test"** chỉ dựa vào chỉ dẫn (lớp C). Guard không biết một test bị sửa là "sửa đúng" hay "nới lỏng".
- **Cổng duyệt tuyển dụng** được hook kiểm tra (hr chỉ ghi được file specialist khi `STATE.md` có dòng `HIRE-APPROVED: <tên>`), nhưng chính lead viết dòng đó. Đây là điểm kiểm soát có dấu vết, không phải chữ ký của bạn. Xem lại `STATE.md` → "Hires" khi cần chắc chắn.
- **Thiếu Node = không có guard** (mục 1), và không có cả kiểm tra handoff.
- **Kiểm tra handoff** dựa vào trường `last_assistant_message` của `SubagentStop` (tài liệu có nêu). Nếu Claude Code không gửi trường này, hook không chặn (không đoán mò), và việc kiểm tra quay về lead.
- **Skill bạn khai chạy với quyền của agent nạp nó.** Guard kiểm soát *skill nào* được nạp, không kiểm soát *nội dung* skill. Một skill có khối lệnh shell tự chạy khi nạp, hoặc khai `allowed-tools`, có thể đi ngoài kiểm tra Bash của guard (chưa kiểm chứng). Chỉ khai skill bạn đã đọc và tin.
- Tên trường input của tool `Skill` không được tài liệu ghi rõ; guard đọc `skill`/`name`/`command`, và **chặn** khi không đọc ra được tên, nên nếu Claude Code dùng tên trường khác thì agent sẽ bị chặn nạp skill (an toàn, nhưng cần sửa guard).
- **Chặn DB theo host/tên DB không phải bảo đảm tuyệt đối.** `localhost` có thể là tunnel tới production do bạn tự mở từ trước; file config của tool (`knexfile`, `database.yml`, `alembic.ini`, `appsettings.json`) có thể hardcode host hoặc chọn môi trường theo biến, và tool có thể bỏ qua `DATABASE_URL` trong lệnh. Bảo đảm thật: máy dev và repo **không có credential production**, mạng dev không tới được DB production.
- **Dòng danh bạ cần `HIRE-APPROVED`, nhưng dòng đó do lead ghi** sau khi bạn duyệt: đây là dấu vết kiểm soát, không phải chữ ký của bạn.
- **Session chính không bị guard giới hạn** (trừ khi lead là luồng chính). Bạn và session chính vẫn toàn quyền.
- Agent không thuộc team (built-in, plugin khác) không bị guard đụng tới. Lead bị chặn không được gọi chúng, để mọi việc đi qua đúng chủ.
- Guard nhận diện vai trò bằng tên. Một agent của bạn ở chỗ khác tình cờ tên `developer` sẽ bị đối xử như developer của team (đây cũng là cơ chế ghi đè ở mục 11).

---

## 6. Tầng, cổng, vòng lặp

### Tầng (khi `run` hoặc không chỉ định pipeline)

| Tầng | Khi nào | Luồng |
|---|---|---|
| **T0 – Việc lẻ** | Câu hỏi, sửa nhỏ một chỗ, cập nhật tài liệu | Giao thẳng cho 1 agent |
| **T1 – Thay đổi nhỏ** | Phạm vi rõ, không đổi thiết kế | developer → code-reviewer → qa (→ security nếu bị kích hoạt) |
| **T2 – Tính năng** | Tính năng mới hoặc chạm thiết kế | analyst → architect → pm → developer → code-reviewer → qa → security → writer |
| **TB – Lỗi** | Bug, test fail, hành vi sai | debugger → developer → code-reviewer → qa (regression test) (→ security nếu bị kích hoạt) |

Bắt buộc ở mọi tầng: **security** khi chạm auth, input người dùng, truy cập dữ liệu, secrets, thanh toán, dữ liệu cá nhân; **devops** khi chạm hạ tầng/deploy; **writer** khi ảnh hưởng cách dùng, API, vận hành; **specialist** theo danh bạ. Thiếu chuyên môn → lead đề xuất tuyển qua hr. Lead luôn nói đã chọn tầng nào và vì sao; bạn có thể yêu cầu đổi.

### Cổng

| Cổng | Điều kiện qua |
|---|---|
| **G1 – Duyệt hướng làm** | Bạn duyệt spec + plan (hoặc hướng sửa của debugger khi rủi ro cao). Lead ghi lại ngày và câu trả lời nguyên văn của bạn trong `STATE.md` |
| **G2 – Test** | qa kết luận PASS, có output test thật |
| **G3 – Review** | Không còn phát hiện "chặn merge" từ code-reviewer / security / specialist review, trên đúng bản code đã qua G2 |
| **G4 – Hoàn tất** | Tài liệu đã cập nhật (nếu cần), `.team/` đã cập nhật, báo cáo đã gửi |

### Vòng lặp
Thứ tự cố định cho mọi pipeline có sửa code:

```
developer ──► code-reviewer ──► QA ──► security* ──► xong (G2 + G3 trên cùng bản code)
   ▲               │ chặn merge   │ FAIL      │ chặn merge
   └───────────────┴──────────────┴───────────┘
```
\* security chỉ chạy khi pipeline hoặc điều kiện kích hoạt yêu cầu (luôn có trong `feature` và `hotfix`). Không có security thì vòng kết thúc ở QA PASS.

- **QA fail → developer**, **QA pass → security**.
- **Mọi lần sửa code đều đi lại từ code-reviewer**: QA fail → developer → code-reviewer → QA; security chặn → developer → code-reviewer → QA → security. Không đoạn code nào tới QA mà chưa qua code review, và không đoạn nào tới security mà chưa có QA PASS.
- **Lặp cho tới khi pass, không giới hạn số vòng.**

- **Tiến triển quyết định, không phải số vòng.** Một vòng có tiến triển nếu tập lỗi giảm đi hoặc thay đổi. Nếu **cùng một lỗi còn nguyên qua 2 vòng liên tiếp**, lead leo thang (vòng lặp vẫn chạy tiếp sau mỗi bước):
  1. **debugger** chẩn đoán lỗi đó (cũng áp dụng khi developer bí sau 2 lần thử có trọng tâm);
  2. vẫn còn → **architect** (và **analyst** nếu dính AC) kiểm tra plan/AC có sai hoặc mâu thuẫn không; đổi hướng thì quay lại G1;
  3. vẫn còn → **tạm dừng hỏi bạn**, kèm nhật ký vòng lặp và các phương án. Work item không bao giờ bị đóng là xong khi còn lỗi.
- **Chống "làm cho test xanh":** mỗi vòng qa kiểm tra diff của file test; test bị skip, xóa, nới assertion hay mock mất phần đang kiểm tra đều là FAIL, code-reviewer coi là chặn merge.
- Nhật ký từng vòng nằm trong `STATE.md` → `Loop log`. Bạn có thể dừng hoặc đổi hướng bất cứ lúc nào.

> Lưu ý: vòng lặp không giới hạn tốn token tương ứng. PASS QA nghĩa là đạt các AC và test hiện có, không chứng minh được là không còn lỗi nào; chất lượng đầu ra phụ thuộc nhiều nhất vào việc AC có đủ và đúng hay không.

---

## 7. Lệnh workflow (kèm ví dụ)

Mọi lệnh có tiền tố `/technical-team:` và hiện `argument-hint` khi gõ. Mỗi file lệnh có hai phần: **Running this command** (session chính giao cho lead, chuyển báo cáo chờ duyệt, gọi lại lead với câu trả lời của bạn) và **Pipeline** (các bước lead thực thi). Logic của mỗi pipeline chỉ nằm trong file lệnh của nó; `feature` dùng lại bước 0–5 của `plan`, `run` chuyển sang `change`/`feature`/`fix`. Thiếu tham số bắt buộc thì lệnh hỏi lại, không đoán.

| Lệnh | Pipeline | Cổng |
|---|---|---|
| `run <yêu cầu>` | `commands/run.md`: lead tự xếp T0/T1/T2/TB | Theo tầng |
| `init` | `scripts/team-init.mjs` | – |
| `status` | `commands/status.md` (không gọi agent) | – |
| `plan <mục tiêu>` | `commands/plan.md` | G1 |
| `feature <mô tả>` | `commands/feature.md` | G1–G4 |
| `change <mô tả>` | `commands/change.md` | G2–G4 |
| `fix <lỗi>` | `commands/fix.md` | G1 nếu rủi ro cao, G2–G4 |
| `hotfix <lỗi>` | `commands/hotfix.md` | G2–G4 (rút gọn tài liệu) |
| `investigate <triệu chứng>` | `commands/investigate.md` | – |
| `review [phạm vi diff]` | `commands/review.md` | G3 |
| `audit [phạm vi]` | `commands/audit.md` | – |
| `test [phạm vi]` | `commands/test.md` | G2 |
| `infra <yêu cầu>` | `commands/infra.md` | G1, G3, G4 |
| `release [version]` | `commands/release.md` | G2–G4, kết luận GO/NO-GO |
| `docs [phạm vi]` | `commands/docs.md` | G4 |
| `adr <quyết định>` | `commands/adr.md` | – |
| `hire <domain/nhu cầu>` | `commands/hire.md` | Cổng duyệt tuyển dụng |
| `roster` | `commands/roster.md` | Duyệt cho nghỉ (nếu có đề xuất) |

### Ví dụ

```text
/technical-team:init
```
Tạo `.team/` lần đầu ở project.

```text
/technical-team:run Thêm nút "Quên mật khẩu" ở trang đăng nhập
```
Lead tự xếp tầng (thường T2 vì chạm auth và cần security), nói lý do rồi chạy.

```text
/technical-team:status
```
Liệt kê việc đang chờ bạn duyệt trước, rồi tới cổng hiện tại, ticket bị chặn, bộ đếm vòng lặp sắp chạm trần.

```text
/technical-team:plan Cho phép xuất báo cáo doanh thu ra CSV theo khoảng ngày
```
analyst → architect → pm, rồi dừng ở G1 với tóm tắt AC, thiết kế, ticket. Chưa viết code.

```text
/technical-team:feature Đăng nhập bằng Google OAuth cho web app
```
Toàn bộ T2: dừng ở G1 chờ bạn, sau đó developer → code-reviewer → QA (fail thì về developer) → security → tài liệu (G4).

```text
/technical-team:change Đổi thông báo lỗi khi email sai định dạng thành "Email không hợp lệ"
```
Lead ghi 2–5 gạch đầu dòng hành vi mong đợi trong `STATE.md` thay cho AC, rồi developer → code-reviewer → QA (→ security nếu chạm auth/dữ liệu/secrets…).

```text
/technical-team:fix Tổng tiền giỏ hàng sai khi áp 2 mã giảm giá cùng lúc
```
debugger chứng minh nguyên nhân gốc → (G1 nếu hướng sửa rủi ro cao) → developer → code-reviewer → QA viết regression test.

```text
/technical-team:hotfix API /orders trả 500 trên production từ 10h sáng
```
Bản sửa nhỏ nhất, developer → code-reviewer → QA → security (bắt buộc), tài liệu rút gọn, phần còn lại ghi là hoãn. Nếu hướng sửa rủi ro cao, lead vẫn dừng hỏi bạn.

```text
/technical-team:investigate Worker xử lý queue thỉnh thoảng bị treo sau vài giờ
```
Chỉ chẩn đoán, không sửa. Báo cáo nguyên nhân gốc, bằng chứng, hướng sửa, rồi gợi ý `fix`.

```text
/technical-team:review main...HEAD
/technical-team:review
```
Không có tham số: working tree so với `HEAD`; nếu sạch thì commit cuối.

```text
/technical-team:audit
/technical-team:audit src/payments/
```

```text
/technical-team:test W-004
/technical-team:test src/billing/
```
qa bổ sung test còn thiếu theo AC. Lỗi phát hiện được báo thành bug, không sửa tại chỗ.

```text
/technical-team:infra Thêm GitHub Actions chạy lint + test cho mỗi pull request
```
devops đề xuất trước (G1), làm và kiểm tra local, code-reviewer → security, writer viết runbook.

```text
/technical-team:release 1.4.0
/technical-team:release
```
Không có version: lead đề xuất theo semver. Team không tag, không deploy; báo cáo cho bạn lệnh cần chạy.

```text
/technical-team:docs
/technical-team:docs docs/api/
```

```text
/technical-team:adr Chuyển từ REST polling sang WebSocket cho thông báo realtime
```

```text
/technical-team:hire IoT: firmware ESP32, MQTT, cập nhật OTA cho thiết bị
```

```text
/technical-team:roster
```

---

## 8. Run kit

Plugin chỉ còn **một skill**: `run-kit` (`skills/run-kit/SKILL.md`). Pipeline nằm trong các file lệnh (mục 7), sổ tay vận hành của tech lead nằm trong chính `agents/lead.md`.

| Thành phần | Ở đâu | Nạp thế nào | Nội dung |
|---|---|---|---|
| `run-kit` | `skills/run-kit/SKILL.md` | Preload vào **mọi** agent (kể cả specialist); session chính nạp khi bạn hỏi cách dùng; gõ `/technical-team:run-kit` để xem | Tài liệu sử dụng ngắn (hai cách chạy, bảng lệnh + tham số, cổng, vòng lặp, specialist), quy tắc làm việc chung, **định dạng handoff (tiếng Anh)** |
| Lead manual | `agents/lead.md`, phần cuối | Là system prompt của lead | Tầng, cổng, vòng lặp giao hàng, mẫu brief, bảng quyền tóm tắt, `.team/`, điểm gắn specialist, mẫu báo cáo cuối và báo cáo chờ duyệt |
| Pipeline | `commands/<lệnh>.md` → `## Pipeline` | Lead đọc file bằng Read khi chạy lệnh | Các bước, agent, bước song song, cổng và điểm dừng, vòng lặp, file `.team/`, điểm gắn specialist, điều kiện kết thúc, báo cáo |

Mọi agent có tool `Skill`, nhưng guard chỉ cho nạp `run-kit` và các skill bạn khai cho vai trò đó (mục 11). Chi phí luôn-bật của plugin khoảng **1,9k token** mỗi session (trước là ~2,8k với 37 skill).

### Handoff block (mọi agent, cuối mỗi lần chạy)

Định dạng chỉ định nghĩa ở **một nơi**: `skills/run-kit/SKILL.md` §3 (tiêu đề `### Handoff` và các nhãn tiếng Anh: `Result`, `Evidence`, `Files changed`, `Open items`, `Next steps`), được preload vào mọi agent. Hook `SubagentStop` đọc chính mẫu đó để kiểm tra, nên nếu preload hỏng hoặc agent quên, hook vẫn trả agent lại kèm đúng mẫu. Sau 2 lần nhắc mà vẫn thiếu, hook cho dừng để tránh lặp vô hạn; lead coi lần chạy đó là `blocked`.

## 9. Tuyển specialist

**Khi nào:** lead đề xuất (kèm lý do) hoặc bạn gọi `hire`. hr kiểm tra trước xem vai trò cốt lõi (nhất là developer, architect) hoặc specialist hiện có đã làm được chưa; hr được phép kết luận "không cần tuyển".

**Quy trình (`commands/hire.md`):**
1. **hr** phân tích nhu cầu, lập **hồ sơ domain** (khái niệm, chuẩn, giao thức; công cụ phổ biến và cách nhận diện project đang dùng; lỗi và rủi ro điển hình; "làm tốt" trông thế nào; chỉ tra tới độ sâu công việc hiện tại cần). Mỗi điểm có nguồn và mức độ chắc chắn, kèm câu hỏi để bạn bổ sung kinh nghiệm thực tế.
2. **hr** soạn **hồ sơ specialist** từ `templates/specialist-agent.md`: không bao giờ có `Agent`, mặc định chỉ đọc và tư vấn, phạm vi ghi không chồng lên ai, preload `technical-team:run-kit`.
3. **Tham vấn chỗ đặt:** hr soạn câu hỏi, **lead** gửi song song cho architect, pm và vai trò gần domain nhất (họ chỉ trả lời, không ghi file), rồi chuyển câu trả lời lại cho hr.
4. **hr** chốt **một** đề xuất; ý kiến mâu thuẫn được nêu rõ để bạn quyết.
5. **Cổng duyệt tuyển dụng:** lead dừng, trình bạn hồ sơ domain, hồ sơ specialist, chỗ đặt, câu hỏi.
6. **Tạo:** bạn duyệt → lead ghi `HIRE-APPROVED: <tên>` vào `STATE.md` → hr tạo agent ở một trong hai nơi → lead đối chiếu lại:
   - **Đang làm việc trong chính repo `technical-team`** (gốc project có `.claude-plugin/plugin.json` tên `technical-team`): hr ghi `agents/<tên>.md` và thêm mục vào `config/members.json` (đường dẫn ghi, mức Bash, điểm gắn, điều kiện kích hoạt), writer cập nhật README. Agent trở thành **thành viên của plugin** (như `dba`), guard áp quyền ở mọi project dùng plugin. Có hiệu lực sau `/reload-plugins` hoặc session mới.
   - **Project khác:** hr ghi `.claude/agents/<tên>.md` (hoặc `~/.claude/agents/` nếu bạn chọn user scope) và một dòng `ROSTER.md` của project đó. Không bao giờ ghi vào thư mục plugin đã cài.

**Có hiệu lực khi nào:** Claude Code theo dõi `.claude/agents/` và `~/.claude/agents/`, thường nhận agent mới trong vài giây. Cần **khởi động lại session** nếu thư mục `agents/` chưa tồn tại lúc session bắt đầu (lệnh `init` tạo sẵn `.claude/agents/` để tránh trường hợp này ở các session sau), hoặc nếu lead báo không gọi được tên đó.

**Điểm gắn trong pipeline** (định nghĩa sẵn trong pipeline của mọi lệnh, specialist tham gia mà không phải sửa plugin):

| Điểm gắn | Cùng ai | Khi nào |
|---|---|---|
| `design` | architect | Trước G1 |
| `execute` | developer | Khi triển khai (làm phần domain trong phạm vi ghi, hoặc tư vấn) |
| `review` | code-reviewer | Ở bước code review (trước QA); phát hiện "chặn merge" trả code về developer và giữ G3 |
| `test` | qa | Ở bước QA, trước G2 |

Ở mỗi điểm gắn, lead xem `dba` và thành viên trong `config/members.json` cùng các dòng `active` trong `ROSTER.md` (có `HIRE-APPROVED` tương ứng), rồi gọi ai có điểm gắn và điều kiện kích hoạt khớp với yêu cầu.

### Vai trò DBA: `dba`

`agents/dba.md` — DBA cho migration không downtime (đánh giá lock, backfill theo batch, expand → migrate → contract, rollback từng migration) và review schema/query rủi ro. Model `opus`. Mặc định `dba` là của technical-team: có mặt ở mọi project, không cần kích hoạt, không nằm trong `ROSTER.md`.

- **Quyền** khai trong `config/members.json`: đường dẫn migration/seed/schema dump phổ biến của các stack (mục 5.3), Bash `db-local` (mục 5.4b). Project để migration ở chỗ khác thì thêm `paths.dba` vào `.claude/technical-team.json`.
- **Bạn tự thêm mục `db`** vào `.claude/technical-team.json` (host/DB local hợp lệ, file env), mục 11. Thiếu thì dùng mặc định `localhost` + tên DB `*_test`/`*_dev`/`*_local`.
- **Điểm gắn:** `design` (cùng architect khi chạm schema/dữ liệu), `execute` (song song với developer khi migration viết tay; nối tiếp sau developer khi migration sinh từ model ORM), `review` (ở bước code review, trước QA).
- **Ranh giới với developer:** developer giữ code model/ORM và file schema-as-code như `schema.prisma`; dba giữ file migration, seed và file dump schema. Chỉ dba chạy lệnh migrate/DB.
- **Ranh giới khác:** fixture test thuộc qa; bước chạy migration trong CI/deploy thuộc devops (dba đưa thứ tự chạy và rollback trong handoff để devops ghi `OPS_HANDOFF.md`); kế hoạch rollback nằm ở header của từng file migration.
- **Lưu ý:** vì `dba` luôn có mặt, ở mọi project developer **không còn** tự chạy lệnh migrate được nữa, kể cả project nhỏ. Việc đổi schema luôn đi qua dba.

**Rà soát:** `roster` → hr đề xuất cho nghỉ specialist lâu không dùng hoặc trùng việc. Chỉ khi bạn đồng ý, hr chuyển dòng sang mục "Retired"; hr không xóa file được — bạn tự xóa file agent theo đường dẫn lead đưa.

---

## 10. Không gian làm việc `.team/`

Mỗi file có đúng một người ghi (guard thực thi), mọi agent đều đọc được.

| File | Người ghi | Nội dung |
|---|---|---|
| `.team/STATE.md` | lead | Work item đang chạy, tầng/pipeline, cổng, phê duyệt của bạn, bộ đếm vòng lặp, tóm tắt QA/review/security/debug/specialist, `HIRE-APPROVED`, lần dùng specialist, báo cáo cuối |
| `.team/SPEC.md` | analyst | User story, acceptance criteria, trường hợp biên |
| `.team/PLAN.md` | architect | Plan triển khai |
| `.team/TASKS.md` | pm | Ticket, ước lượng, phụ thuộc, tập file độc quyền, trạng thái |
| `.team/OPS_HANDOFF.md` | devops | Thông tin vận hành thô cho writer |
| `.team/ROSTER.md` | hr | Danh bạ specialist (guard đọc bảng này) |
| `ARCHITECTURE.md` | architect | Tổng quan kiến trúc |
| `docs/adr/NNNN-<quyet-dinh>.md` | architect | ADR |

- **Mã định danh:** lead cấp `W-001`, `W-002`… khi bắt đầu một việc; SPEC (`W-001.AC1`), PLAN, TASKS (`W-001-T1`) dùng cùng mã nên nội dung các tính năng không lẫn nhau.
- **Trạng thái:** SPEC/PLAN `draft` → `done` (PLAN có thêm `superseded`); TASKS `todo` · `doing` · `blocked` · `review` · `done`. Phê duyệt G1 chỉ ghi ở `STATE.md`.
- **Archive:** khi work item `done`, mỗi chủ file tự chuyển phần của mình sang `.team/archive/<FILE>-<YYYY-MM>.md` vào lần sửa file kế tiếp.
- Chỉ ghi tóm tắt và kết luận, không log dài. Không ghi secrets, token, dữ liệu thật.
- Quy ước vận hành nằm trong plugin (run kit, file agent), không nằm trong `.team/`.

---

## 11. Tùy biến

### `.claude/technical-team.json` (của bạn; mọi agent bị chặn ghi `.claude/`)
```json
{
  "commands": {
    "build": ["npm run build"],
    "lint":  ["npm run lint"],
    "test":  ["npm test", "npx playwright test"],
    "run":   ["npm run dev"],
    "infra": ["docker build", "docker compose", "terraform plan", "terraform validate"]
  },
  "paths": {
    "infra": ["tools/release/**"],
    "tests": ["qa-fixtures/**"],
    "docs":  ["handbook/**"],
    "architecture": []
  },
  "devopsAllowRemote": false,
  "db": {
    "commands": [],
    "allowedHosts": ["localhost", "127.0.0.1", "::1", "db"],
    "allowedDatabases": ["*_test", "*_dev", "*_local"],
    "envFile": ".env.test"
  }
}
```
- Mỗi mục trong `commands` là **tiền tố lệnh**. Danh sách khác rỗng → vai trò tương ứng chuyển sang allowlist.
- `paths` **cộng thêm** vào mặc định trong `config/ownership.json`.
- `devopsAllowRemote: true` cho phép devops chạy `docker push`, `kubectl apply`, `terraform apply`… Mặc định tắt: các lệnh này do bạn chạy.
- `db` (khi `dba` đang bật): `commands` để trống = dùng danh sách mặc định của plugin; `allowedHosts` thêm tên service DB trong docker-compose nếu có; `allowedDatabases` là glob tên DB local/test; `envFile` là file env mà tool migration thực sự đọc (guard tự đọc `DATABASE_URL` trong đó).
- File JSON lỗi → guard chặn mọi lệnh ghi/Bash của team cho tới khi bạn sửa.

### Skill theo vai trò

Khai skill cho từng vai trò ngay trong `.claude/technical-team.json` của project, không cần chép file agent:
```json
"skills": {
  "developer": ["react-native", "mobile-kit:ios-release"],
  "qa": ["detox-e2e"],
  "lead": []
}
```
- Skill của project để ở `.claude/skills/<tên>/SKILL.md` và ghi bằng tên trần; skill từ plugin khác ghi `<plugin>:<skill>`.
- Lead đọc danh sách mỗi lần chạy và chỉ ghi vào brief những skill hợp với việc đang giao (ticket mobile thì `react-native`, ticket backend thì không). Agent nạp đúng những skill đó bằng tool `Skill`, nên không tốn context khi việc không liên quan.
- Guard chặn agent nạp skill ngoài danh sách của vai trò mình (luôn cho `run-kit`). Main session của bạn không bị giới hạn.
- Skill chỉ thêm kiến thức, không thêm quyền: developer vẫn chỉ ghi được vùng của developer. File build/release mobile (Fastlane, `eas.json`, …) nên khai vào `paths.infra` để thuộc về devops.
- Specialist của project cũng dùng được: khai theo tên specialist, ví dụ `"iot-firmware": ["esp-idf"]`.

### Ghi đè agent cốt lõi cho một project
Tên agent không được chứa `:`, nên không thể tạo file trùng tên `technical-team:developer`. Cách làm:
1. Chép `agents/<vai-trò>.md` của plugin vào `.claude/agents/<vai-trò>.md` của project (hoặc `~/.claude/agents/` cho mọi project), giữ `name: <vai-trò>` và preload `technical-team:run-kit`.
2. Sửa nội dung theo project.

Lead kiểm tra file này mỗi lần chạy và giao cho tên trần `<vai-trò>` thay vì `technical-team:<vai-trò>`. Chỉ để thêm skill thì không cần ghi đè: dùng mục "Skill theo vai trò" ở trên, tránh việc bản sao bị lệch khi plugin cập nhật. Guard vẫn áp đúng quyền của vai trò đó vì nhận diện theo tên.

### Đổi model
Sửa `model:` trong file agent (bản ghi đè ở project, hoặc fork plugin).

---

## 12. Giới hạn đã biết

- **Chưa chạy end-to-end với model thật.** Môi trường dựng plugin không đăng nhập được Claude, nên đã kiểm chứng: `claude plugin validate --strict` (plugin + marketplace), cài thử và `claude plugin details` (13 agent, 19 skill, 1 hook), 29 unit test của guard và handoff check, chạy thử `init`. Chưa kiểm chứng: giá trị thực tế của `agent_type` mà Claude Code gửi cho agent plugin (guard chấp nhận cả `technical-team:<tên>` lẫn `<tên>`), và việc preload skill bằng tên có tiền tố `technical-team:run-kit` trong trường `skills`. Kiểm tra nhanh sau khi cài: gọi `/technical-team:status`, rồi nhờ `technical-team:pm` ghi thử vào `README.md` — guard phải từ chối.
- **Chi phí:** pipeline `feature` gọi khoảng 8–10 lượt agent (nhiều hơn nếu có vòng lặp hoặc specialist). Dùng `run` để lead chọn tầng nhẹ nhất phù hợp.
- **Commit/push:** guard chặn mọi agent của team commit, push, mở PR, kể cả khi bạn yêu cầu; lead sẽ đưa bạn lệnh để tự chạy.
- **Lead không gọi được agent ngoài team** (Explore, general-purpose, agent của plugin khác).
- **Handoff check** dựa vào trường `last_assistant_message` của `SubagentStop` (nếu Claude Code không gửi trường này thì việc kiểm tra fallback về tech lead).
- Guard chạy với mỗi lệnh `Write/Edit/MultiEdit/NotebookEdit/Bash/Agent` (timeout 15 giây); với session thường nó thoát ngay.

---

## 13. Phát triển plugin

```bash
node --test tests/guard.test.mjs        # unit test của guard
claude plugin validate . --strict       # validate plugin
claude plugin validate .claude-plugin/marketplace.json --strict
claude --plugin-dir .                   # chạy thử
```

Cấu trúc:
```
technical-team/
├── .claude-plugin/
│   ├── plugin.json
│   └── marketplace.json
├── agents/            13 agent của technical-team (bao gồm dba)
├── commands/          18 lệnh workflow, mỗi lệnh chứa pipeline của nó
├── skills/run-kit/    tài liệu sử dụng + quy tắc chung + handoff format
├── hooks/
│   ├── hooks.json        PreToolUse → guard.mjs, SubagentStop → handoff-check.mjs
│   ├── guard.mjs         thực thi phân quyền
│   └── handoff-check.mjs bắt buộc khối handoff chuẩn
├── config/ownership.json   chủ sở hữu đường dẫn + dbCommands mặc định
├── config/members.json     phân quyền cho dba và thành viên plugin
├── scripts/team-init.mjs
├── templates/         .team/*.md, ARCHITECTURE.md, adr.md, specialist-agent.md, technical-team.json
└── tests/guard.test.mjs
```

Nội dung agent, command và skill viết dạng **bảng + sơ đồ Mermaid** (pipeline, vòng lặp, bước song song, cổng) để agent và người đọc lướt nhanh; viết bằng tiếng Anh (chính xác hơn và ít token hơn khi model đọc); agent luôn trả lời theo ngôn ngữ của bạn mà lead ghi trong brief.

---

## 14. Ghi chú về các vai trò mặc định

Không tùy tiện thêm vai trò ngoài các vai trò mặc định của team. Những khoảng trống có thể cần cân nhắc sau, mỗi cái đều tuyển được dưới dạng specialist qua hr nếu project cần:
- **UX/UI designer:** không ai sở hữu luồng người dùng, wireframe, accessibility. Hiện analyst chỉ viết AC, developer tự quyết giao diện.
- ~~Data/DBA~~: mặc định `dba` là của technical-team (mục 9). Data engineering theo nghĩa pipeline/ETL/warehouse vẫn chưa có ai.
- **Product owner:** người ưu tiên backlog giữa nhiều work item hiện là bạn; pm chỉ sắp thứ tự ticket trong một work item.
