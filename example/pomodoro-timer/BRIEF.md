# Brief: Pomodoro Timer example, built by technical-team 0.22.0

You were launched with `--plugin-dir` pointing at the technical-team plugin from PR #12 (version 0.22.0). Confirm the loaded `technical-team` agents show the short 0.22 descriptions ("Use PROACTIVELY …") before starting.

**Goal:** prove the plugin works end to end by building a small real app with it.

**Location:** your working directory is `example/pomodoro-timer/` — the project root. The `.team/` workspace goes here (`example/pomodoro-timer/.team/`).

**How:** run the plugin's `new` pipeline (`/technical-team:new`) with the target below as the request. Let the team agents do their own steps; do not write the app yourself outside the pipeline. Stop at the pipeline's user gates (ba questions, stack, milestones) and ask the user.

**Target (user's words, keep as-is):**

> Xây dựng ứng dụng **Pomodoro Timer** với React, TypeScript, Vite, Tailwind CSS, Zustand (state management), Framer Motion (animation), Lucide React (icons) và LocalStorage (persistence).
>
> Giao diện Premium Dark, hiện đại, responsive trên desktop và mobile. Tính năng gồm Focus 25 phút, Short Break 5 phút, Long Break 15 phút; Start, Pause, Resume, Reset, Skip; vòng tròn tiến trình SVG animation; đếm phiên Pomodoro theo chu kỳ 4 phiên; tự động chuyển phiên; tùy chỉnh thời lượng; âm thanh và Browser Notifications; Fullscreen Focus Mode.
>
> Đảm bảo timer chính xác bằng timestamp, hoạt động ổn định khi chuyển tab hoặc chạy nền, khôi phục trạng thái sau refresh. Code sạch, component tái sử dụng, TypeScript strict, UX mượt mà và tối ưu hiệu năng. Chỉ triển khai Pomodoro Timer Core, không thêm các module ngoài phạm vi.

**Done when:**
- `npm install`, `npm run build`, lint and tests pass in `example/pomodoro-timer/`; qa has checked the running app at desktop and mobile width.
- `.team/` holds the item's requirements, design, tasks and reports, each within its template's **Budget** line; `STATE.md` has no stale row at the end.
- Everything committed on branch `example-pomodoro-timer-v022`. Do not push or open a PR unless the user asks.
- Do not edit `plugins/team/` — report plugin issues instead.

**Final report (short bullets) — the point of this exercise:**
- What was built.
- Plugin behaviour: did each agent stay in its role; did every `.team/` file stay within budget (give line counts); how many review and qa rounds; any gate, rule or template that misfired or was unclear — each with a file reference in `plugins/team/`.
- Save the report to `example/pomodoro-timer/PLUGIN-REPORT.md` as well.
