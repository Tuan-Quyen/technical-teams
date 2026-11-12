# Mobile app — live preview on an emulator / simulator

Covers React Native (bare and Expo), Flutter, native Android (Kotlin/Java), native iOS (Swift/ObjC), Capacitor/Ionic/Cordova. Use the driver the project already has; with none, **Maestro** is the least invasive (YAML flows, works on every stack, no app code changes) — adding it is the developer's ticket, not yours.

## 1. Can this environment run it?

| Target | Needs | Check |
|---|---|---|
| Android emulator | Android SDK, an AVD / system image, hardware acceleration (KVM on Linux) | `adb devices`, `emulator -list-avds`, `ls /dev/kvm` |
| iOS simulator | **macOS** with Xcode | `xcrun simctl list devices booted` |
| Physical device | connected + authorized | `adb devices` / `xcrun devicectl list devices` — use only if the user provided one |

Cannot run a target → preview the others, report the gap under **Not previewed** (live-preview §3). A cross-platform app previewed only on Android is a partial PASS the main session must record; its web build alone is never enough.

## 2. Build, install, start

| Stack | Build + install (background where it keeps running) | App id |
|---|---|---|
| Expo / RN | `npx expo run:android` / `npx expo run:ios` (dev client), or `npx react-native run-android`; release: `./gradlew assembleRelease` + `adb install -r` | `applicationId` in `android/app/build.gradle`, bundle id in Xcode project / `app.json` |
| Flutter | `flutter build apk --debug && adb install -r build/app/outputs/flutter-apk/app-debug.apk`, or `flutter run -d <device>` | `applicationId` / `PRODUCT_BUNDLE_IDENTIFIER` |
| Android native | `./gradlew installDebug` | `applicationId` |
| iOS native | `xcodebuild -scheme <S> -destination 'platform=iOS Simulator,name=iPhone 15' build` + `xcrun simctl install booted <App.app>` | bundle id |
| Capacitor / Ionic | web build → `npx cap sync` → native build as above | `capacitor.config.*` `appId` |

Boot an emulator in the background: `emulator -avd <name> -no-window -no-audio -no-snapshot` then wait for `adb shell getprop sys.boot_completed` = `1`. Before each run: `adb shell pm clear <appId>` (fresh state) unless the check is about persisted state.

## 3. Drive it

**Maestro** (`e2e/preview/w-012.yaml`):

```yaml
appId: com.example.app
---
- launchApp:
    clearState: true
- assertVisible: "Projects"
- tapOn: "New project"
- tapOn:
    id: "name-input"            # testID / accessibilityIdentifier / Key
- inputText: "Dự án thử nghiệm với tên rất dài để kiểm tra xuống dòng"
- hideKeyboard
- tapOn: "Create"
- assertVisible: "Project created"
- assertVisible: "Dự án thử nghiệm.*"
- takeScreenshot: test-results/w-012-projects-phone-small
- pressKey: back                 # Android back button / gesture
- assertVisible: "Projects"
```

Run: `maestro test e2e/preview/w-012.yaml` (`--format junit` for a summary).

| Other drivers | Same checks with |
|---|---|
| Detox (RN) | `element(by.id(...)).tap()`, `device.takeScreenshot()`, `device.sendToHome()` / `device.launchApp({ newInstance: false })`, `device.setOrientation('landscape')` |
| Flutter `integration_test` / patrol | `tester.tap(find.text(...))`, `binding.takeScreenshot(...)`; run `flutter test integration_test/ -d <device>` |
| Espresso / UI Automator | `onView(withText(...)).perform(click())`; UI Automator for system dialogs (permissions, notifications) |
| XCUITest | `app.buttons["Create"].tap()`, `XCUIScreen.main.screenshot()` |

## 4. Signals

| Channel | Command |
|---|---|
| Android log | `adb logcat -c` before the run; after: `adb logcat -d '*:E' \| grep -i -E "<appId>\|AndroidRuntime\|FATAL\|ANR"` |
| Crashes / ANRs | `FATAL EXCEPTION`, `ANR in <appId>` in logcat; `adb shell dumpsys activity processes` |
| iOS log | `xcrun simctl spawn booted log show --last 5m --predicate 'process == "<App>"' --style compact` |
| RN JS errors | red box / `ReactNativeJS` error lines in logcat; LogBox warnings |
| Flutter | `flutter logs`, `══╡ EXCEPTION CAUGHT` blocks, "RenderFlex overflowed" (= layout bug) |
| Network | the app's dev proxy / interceptor logs, or the backend log for the calls the flow should make |

## 5. Breadth (mobile specifics)

| Area | Check |
|---|---|
| Form factors | small phone (≈ 360×640 dp, e.g. Pixel 4a / iPhone SE) and large phone (Pixel 8 Pro / iPhone 15 Pro Max); tablet only if supported; landscape if not locked |
| System settings | largest font size (`adb shell settings put system font_scale 1.3`), dark mode (`adb shell cmd uimode night yes`), another locale |
| Lifecycle | background → foreground (`adb shell input keyevent KEYCODE_HOME`, relaunch), kill → relaunch with saved state, rotation mid-form, "Don't keep activities" for state restoration |
| Permissions | deny, allow once, deny forever (`adb shell pm revoke <appId> android.permission.CAMERA`) — each with a usable screen |
| Network | airplane mode / offline (`adb shell svc wifi disable; adb shell svc data disable`), slow network, server 500 |
| Input | keyboard covering fields, Next/Done actions, back button/gesture on every screen, double-tap on submit |
| Deep links / push | `adb shell am start -W -a android.intent.action.VIEW -d "<scheme>://path"`, `xcrun simctl openurl booted <url>`; `xcrun simctl push` for notifications |
| Accessibility | TalkBack/VoiceOver labels exist (`accessibilityLabel`, `contentDescription`, `Semantics`), touch targets ≥ 48 dp / 44 pt |

Mobile-specific bug rows: `common-bugs.md` section **M**.
