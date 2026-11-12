# CLI / TUI — live preview

The user of a CLI is a person at a terminal **and** a script in a pipeline. Preview both: run the built binary or installed entry point exactly as documented, never an import of `main()`.

## 1. Run it the user's way

| Stack | Build / entry point |
|---|---|
| Node | `npm run build`, then `node dist/cli.js` or the `bin` from `package.json` (`npx .` from the repo) |
| Python | the `[project.scripts]` entry point in a venv the project already has (`.venv/bin/<tool>`), or `python -m <pkg>` |
| Go | `go build -o ./bin/<tool> ./cmd/<tool>` then `./bin/<tool>` |
| Rust | `cargo build` then `./target/debug/<tool>` (release flags if the change concerns them) |
| Shell | the script with its shebang, not `bash script.sh` when users run `./script.sh` |

Use a throwaway working directory and a throwaway `HOME` / config dir (`HOME=$(mktemp -d)`, `XDG_CONFIG_HOME=…`) so the run does not depend on — or damage — your machine's config.

## 2. Transcript harness

```bash
# e2e/preview/w-012.sh — every case prints command, exit code, stdout, stderr
set -u
BIN=./bin/mytool
T=$(mktemp -d); export HOME="$T"
run() { echo "\$ $*"; out=$("$@" 2>"$T/err"); code=$?; echo "$out"; echo "[stderr] $(cat "$T/err")"; echo "[exit] $code"; echo; }

run $BIN --help
run $BIN --version
run $BIN init demo                      # AC1 happy path
run $BIN init demo                      # already exists → clear error, non-zero exit
run $BIN init                           # missing argument → usage hint
run $BIN init "tên có dấu và khoảng trắng"
run $BIN list --json                    # machine output parses
$BIN list --json | jq -e . >/dev/null && echo "[json] valid"
run $BIN list | head -1                 # pipe closed early: no "broken pipe" trace
echo "y" | $BIN delete demo; echo "[exit] $?"   # non-interactive stdin
NO_COLOR=1 $BIN list | cat -v | grep -q $'\e\[' && echo "[color] leaked into pipe"
```

Put assertions in the project's test framework when it has CLI tests (`bats`, `pytest` + `subprocess`, Go `testscript`, Rust `assert_cmd`/`trycmd`, Node `execa`): the transcript file then doubles as the regression test.

**TUI** (interactive, full-screen): drive through a pty — `tmux new -d -s t -x 80 -y 24 './bin/mytool'`, `tmux send-keys -t t 'j' 'Enter'`, `tmux capture-pane -p -t t > test-results/w-012-tui-80x24.txt`; or `pexpect` / `expect`. Repeat at 120×40. Read the captured panes like screenshots.

## 3. Checks

| Area | Check |
|---|---|
| Exit codes | 0 on success, non-zero on every failure; documented codes match |
| Streams | results on stdout, diagnostics on stderr; nothing but data on stdout in `--json`/`--quiet` mode |
| Help + errors | `--help`, `-h`, unknown flag, missing argument, wrong type: short message + how to fix, no stack trace |
| TTY vs pipe | colors/spinners/progress bars only on a TTY; `NO_COLOR` respected; prompts never hang when stdin is not a TTY (fail with a hint or honor `--yes`) |
| Input | paths with spaces/unicode, relative vs absolute, stdin `-`, empty input, huge input, Windows line endings |
| Safety | destructive commands confirm or need `--force`; `--dry-run` really changes nothing (check the file system) |
| Signals | Ctrl+C mid-operation: clean exit, no half-written files, terminal restored (TUI) |
| Config + env | missing config file, invalid config, env overrides, first run on a clean `HOME` |
| Output shape | machine-readable output stable (JSON keys, CSV header); human output fits 80 columns |
| Performance | startup time of `--help`, time on a realistic large input |

CLI-specific bug rows: `common-bugs.md` section **C**.
