# Desktop app (and games) — live preview

Covers Electron, Tauri, Qt/PySide, .NET (WPF, WinUI, MAUI, Avalonia), Swift/AppKit, JavaFX/Swing, GTK, and game engines. Use the project's UI test framework first.

## 1. Can this environment run it?

| Target | Needs |
|---|---|
| Linux GUI on a headless machine | Xvfb: wrap the command in `xvfb-run -a -s "-screen 0 1440x900x24"` |
| Windows-only (WPF, WinUI) / macOS-only (AppKit) app | that OS. On another OS: build + unit/UI-logic tests only, report the app as **Not previewed** with the reason |
| GPU / WebGL / game engine | software rendering may differ (Mesa llvmpipe); note it in the evidence |

## 2. Run and drive

| Stack | Run | Drive |
|---|---|---|
| Electron | dev: `npm start`; packaged: `npm run make`/`electron-builder --dir` then the binary in `out/`/`dist/` | Playwright `_electron` (below) |
| Tauri | `npm run tauri build -- --debug` then the binary in `src-tauri/target/debug/` | `tauri-driver` + WebdriverIO, or the web frontend with Playwright for layout only (Rust commands then need their own checks) |
| Qt / PySide | the built binary / `python -m app` | Qt Test (`QTest::mouseClick`), `pytest-qt` (`qtbot`), Squish if present |
| .NET WPF/WinUI | `dotnet run` / published exe | FlaUI, WinAppDriver / Appium Windows |
| macOS AppKit/SwiftUI | `xcodebuild` + open the `.app` | XCUITest (macOS target) |
| JavaFX | `./gradlew run` | TestFX |
| Unity / Godot / other engines | build for the target platform or run the editor in batch mode | Unity Test Framework (PlayMode), Godot GUT, scripted input; capture frames |

**Electron with Playwright:**

```ts
import { _electron as electron, test, expect } from '@playwright/test';

test('W-012 AC1 create project (desktop)', async () => {
  const app = await electron.launch({ args: ['.'] });           // or executablePath: 'dist/linux-unpacked/my-app'
  const errors: string[] = [];
  app.process().stderr?.on('data', (d) => { if (/error/i.test(String(d))) errors.push(String(d)); }); // main process
  const win = await app.firstWindow();
  win.on('pageerror', (e) => errors.push(`renderer: ${e.message}`));
  win.on('console', (m) => { if (m.type() === 'error') errors.push(`renderer console: ${m.text()}`); });

  for (const size of [{ width: 1024, height: 700 }, { width: 1440, height: 900 }]) {     // minimum + typical
    await app.evaluate(({ BrowserWindow }, s) => BrowserWindow.getAllWindows()[0].setSize(s.width, s.height), size);
    await win.getByRole('button', { name: 'New project' }).click();
    await win.getByLabel('Name').fill('Alpha');
    await win.getByRole('button', { name: 'Create' }).click();
    await expect(win.getByText('Project created')).toBeVisible();
    await win.screenshot({ path: `test-results/w-012-projects-${size.width}.png` });
  }
  await app.close();
  expect(errors, errors.join('\n')).toEqual([]);
});
```

Run on headless Linux: `xvfb-run -a npx playwright test e2e/preview/w-012.desktop.spec.ts`.

## 3. Signals

| Channel | Where |
|---|---|
| Main / native process | stderr of the process, app log file (`~/.config/<app>/logs`, `%APPDATA%\<app>\logs`, `~/Library/Logs/<app>`) |
| Renderer / webview | console + page errors (Electron/Tauri) |
| Crashes | non-zero exit, crash dumps (`crashpad`, `.dmp`, macOS crash reports), "app is not responding" |
| Engine | Unity `Player.log`, Godot output; frame time spikes |

## 4. Breadth (desktop specifics)

| Area | Check |
|---|---|
| Window sizes | the declared minimum size and a typical one; maximized; HiDPI scale 150–200 % if supported |
| Lifecycle | quit → reopen restores state; second instance (single-instance lock); close with unsaved changes; sleep/resume if relevant |
| OS integration | menus and shortcuts (Ctrl vs Cmd), file open/save dialogs, drag & drop, clipboard, tray, notifications, file associations / protocol handlers |
| Files and paths | paths with spaces and unicode, read-only folder, missing file, very large file |
| Offline / update | no network on start; auto-update check failing gracefully |
| Packaging | the **packaged** build starts (missing native modules, asar paths, code-signing prompts) |
| Keyboard + a11y | full keyboard operation, focus visible, screen reader names on controls |

Desktop-specific bug rows: `common-bugs.md` section **K**.
