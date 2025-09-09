## Download and Install APK from GitHub Actions

After a successful workflow run:
1. Go to your repo's Actions tab
2. Click the latest run
3. Download the `batsched-apk` artifact
4. On your Android phone, enable "Install from Unknown Sources" for your browser
5. Open the downloaded APK and tap Install

![Build Status](https://github.com/Tous1f/Advising/actions/workflows/android-build.yml/badge.svg)
BatSched — On-device Advising Plan Generator

What I built
- A small, mobile-first static web app (no database) that generates all possible advising plans from your provided course list.
- Dark "Batman"-inspired UI, filter panel, preferred / 4-day / 5-day generation modes, and option to download JSON of results.

Files
- `index.html` — app shell
- `styles.css` — Batman dark styles
- `data.js` — embedded course dataset and preferences
- `app.js` — scheduling logic, UI wiring
 - `icon-192.png`, `icon-512.png` — app icons used by the PWA manifest

How to run (Windows PowerShell)
1. Open PowerShell and change directory to the app folder:

```powershell
cd /d e:\advising\app
```

2. Open `index.html` in your browser (double-click) or run a simple static server, e.g. using Python if available:

```powershell
# if python is installed
python -m http.server 5500; Start-Process "http://localhost:5500"
```

Requirements checklist
- Read the file and parse all courses: Done (data embedded in `data.js`).
- Make mobile app where all possible schedules can be seen with full info: Done (`index.html` + `app.js` render cards showing course/section/faculty/time/days`).
- Include filters and generate preferred + 4-day + 5-day options: Done (buttons + filter panel).
- EEE111 lab must pair with its theory section: Implemented in generator.
- No database: Done (in-memory JS objects only).
- Minimal beautiful Batman-like UI: Implemented via `styles.css`.

Notes & next steps
- Performance: the generator prunes conflicts early; you can increase/decrease `Max results` in the filters.
- Improvements that are safe: add caching of generated plans, export to CSV, or a visual weekly grid view.

PWA & Android APK packaging
--------------------------------
I added PWA support (manifest + service worker). You can turn the app into an Android APK in two main ways.

Option A — Capacitor (recommended if you have Node + Android Studio):
1. Install Node and npm, then from `e:\advising\app` run:

```powershell
npm init -y
npm install @capacitor/cli @capacitor/core --save-dev
npx cap init batsched com.example.batsched --web-dir=.
```

2. Add Android platform and build (requires Android Studio and SDK installed):

```powershell
npx cap add android
npx cap open android
# In Android Studio: Build > Build Bundle(s) / APK(s) > Build APK(s)
```

3. The built APK from Android Studio can be uploaded to Google Drive and downloaded on your phone for installation (enable "Install unknown apps" for your browser).

Option B — PWABuilder / Bubblewrap (no native Java config):
- Use https://pwabuilder.com to generate an Android package from your PWA URL (if hosted) or use their tooling locally.
- Or use Bubblewrap (requires Java/Android SDK) to wrap the PWA into an APK.

Verification & flawless check
--------------------------------
I ran basic static checks and added a tiny service worker. The app is syntactically valid. Real-device runtime checks you should perform:
- Open `index.html` in desktop mobile emulation and test buttons (Preferred / 4-Day / 5-Day).
- Test PWA install on Chrome: the app should be installable when served via HTTPS or local host.
- Build APK via Capacitor and install on device; test schedule generation and timetable rendering.

If you'd like, I can add a small Node script to help run a local HTTPS server and walk you through Capacitor steps interactively.

Option C — Build APK automatically using GitHub Actions (no local Android SDK required)
1. Create a GitHub repository and push the contents of `e:\advising\app` to the repo root (include `android` directory if you already created it locally, otherwise the workflow will run `npx cap add android`).
2. The repository includes a GitHub Actions workflow `.github/workflows/android-build.yml` that installs Node, Android SDK tools, runs Capacitor to add/copy Android, and runs Gradle to build a debug APK.
3. After you push to `main` (or `master`), open the Actions tab for the workflow run. When it finishes, download the artifact named `batsched-apk` which contains `app-debug.apk`.

Security note: the workflow runs on GitHub's hosted runners and builds a debug APK (unsigned). For production releases you must sign the APK/AAB and follow Play Store policies.
