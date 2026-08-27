# AGENTS.md — VANT (Strength OS) Guidelines & Architecture Rules

## 1. Project Overview & Identity
- **App Name**: `VANT` (formerly FORGE — Strength OS)
- **Application ID**: `com.forge.strengthos`
- **Tech Stack**: Single-file Vanilla JS / CSS3 / HTML5 frontend, bundled via Vite (`vite.config.js`), powered by Capacitor 8 Native Android Engine.

---

## 2. Native Mobile Architecture
- **Haptic Engine**: Unified native vibration engine in `src/native/forge-device.js` and `ForgeNativePlugin.java`. Distinct haptics for warm-up, working, failure sets, rest timer ticks, and tab switches.
- **Background Rest Timer**: `AlarmManager`-backed native local notifications in `src/native/rest-timer.js` targeting channel `forge-rest` with white status bar icon `ic_stat_forge`. Survives screen sleep and Doze mode.
- **Keep Awake**: Screen keep-awake enabled during active workout sessions via `FLAG_KEEP_SCREEN_ON` (`src/native/forge-device.js`).
- **Android Back Button**: Native hardware back button listener (`src/native/back-button.js`) dismissing top-layer modals/sheets, navigating back, or double-tap to exit.
- **Status Bar & Insets**: Translucent dark status bar and safe area inset mapping (`--safe-top`, `--safe-bottom`, `--safe-left`, `--safe-right`).

---

## 3. App Icons & Material You Dynamic Fill Rules
- **Vector Drawables**: App launcher icons use vector drawables in `android/app/src/main/res/drawable/` AND `android/app/src/main/res/drawable-v24/`.
- **Material You Dynamic Themed Icons**: `ic_launcher.xml` and `ic_launcher_round.xml` MUST include `<monochrome android:drawable="@drawable/ic_launcher_monochrome" />` so Android 13+ automatically fills the VANT app icon with the user's phone accent color.
- **CRITICAL**: Never re-introduce default Android robot paths into `drawable-v24/ic_launcher_foreground.xml` (it overrides standard `drawable/` on Android API 24+ devices).

---

## 4. Build & CI/CD Pipeline
- **GitHub Repository**: `novachrono09/forge-workout-tracker`
- **GitHub Actions Workflow**: `.github/workflows/build-apk.yml`
- **Runner Requirements**: Node.js `>= 22.0.0` and Java JDK `21`.
- **Capacitor Sync**: Always run `npm run cap:sync` after editing web frontend files (`index.html`, `src/`) to compile web assets into `dist/` and sync with `android/app/src/main/assets/public`.

---

## 5. File Structure Reference
```
forge-workout-tracker/
├── index.html                 # Main single-file app UI & logic
├── logo.svg                   # VANT SVG Monogram Logo
├── capacitor.config.json      # Capacitor 8 config (appName: "VANT")
├── manifest.json              # Web App Manifest
├── vite.config.js             # Vite bundler configuration
├── src/
│   ├── main.js                # JS bridge entry point initializing native chrome & back handler
│   └── native/
│       ├── forge-native.js    # Plugin registration
│       ├── forge-device.js    # Haptic engine & keep-awake controller
│       ├── rest-timer.js      # Background timer & local notification manager
│       ├── back-button.js     # Android back button state handler
│       └── chrome.js          # Translucent system bars & safe area insets
├── android/                   # Generated Native Android Studio project
│   └── app/src/main/
│       ├── java/com/forge/strengthos/
│       │   ├── MainActivity.java
│       │   └── ForgeNativePlugin.java
│       └── res/
│           ├── drawable/      # ic_launcher_background, ic_launcher_foreground, ic_launcher_monochrome, ic_stat_forge
│           └── drawable-v24/  # ic_launcher_foreground (VANT vector)
└── .github/workflows/
    └── build-apk.yml          # Cloud APK compilation workflow
```
