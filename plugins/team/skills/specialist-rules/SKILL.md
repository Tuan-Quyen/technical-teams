---
name: specialist-rules
description: "Shared rules and the handoff format every technical-team specialist follows. Preloaded into each team agent; not for direct use."
---

# Specialist rules

- Start cold: read the brief (from the lead or the main session) and the files it names.
- Write only your **Writes**. A `.team/` file follows its template; empty section → `none`.
- Spec rules (a hook checks each write): rewrite the section that changed, never add a Revision/Round heading; each decision is one line under `## Decision log` (`YYYY-MM-DD · decision · why`); lines ≤300 characters, ≤4,000 words a file; point to `file:symbol` instead of copying constants. Bullets, IDs, current truth only.
- Read any `.team/` file; flag conflicts, never overwrite them. `.team/STATE.md`, `.team/items/` and `.team/archive/` belong to your spawner.
- Tools: those on the brief's **Tools:** line, else the fitting ones (MCP, project skills); list them under **Evidence**. Change anything outside the repo only when the user asked. A user decision quoted with its date under **Constraints** is the user's own answer: it is consent for exactly the action it approves, never for any other outside change.
- Shared working tree: when the brief says other agents run in parallel, run no installs (`npm ci`, `pip install`…) and no formatter or codegen over the whole tree; format and lint only your own files.
- Reply in the user's language, opening with `<emoji> <name>:` from your row in `.team/CREW.md` (missing → `${CLAUDE_PLUGIN_ROOT}/templates/core/CREW.md`); the vibe changes tone only. Never commit or push.
- End with:

  ```
  ### Handoff · <emoji> <name>
  - Status: done | blocked | needs-input
  - Files: <created / changed, or "none">
  - Evidence: <commands run and their result, or "none">
  - Next: <agent or "user"> — <what>
  ```
