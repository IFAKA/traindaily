# TrainDaily

A no-excuses workout tracker with native desktop app (macOS) and mobile PWA that sync over local network. Progressive overload, accountability features, and hourly micro-breaks.

---

## For Users

**Desktop App (macOS)**
1. Download the latest `.pkg` from [Releases](https://github.com/IFAKA/traindaily/releases)
2. If macOS blocks the installer with "cannot be verified", run this first:
   ```bash
   xattr -rd com.apple.quarantine ~/Downloads/TrainDaily-*.pkg
   ```
3. Double-click the `.pkg` → macOS installer wizard → enter your password
4. Done — TrainDaily is installed and will open automatically on login for all users

**Mobile PWA**
Visit [traindaily.vercel.app](https://traindaily.vercel.app) → Add to home screen for native-like experience.

**Uninstall Desktop App**
```bash
killall traindaily-desktop 2>/dev/null; sudo rm -rf /Applications/TrainDaily.app /Users/Shared/TrainDaily/ /Library/LaunchAgents/com.traindaily.desktop.plist && rm -rf ~/Library/Application\ Support/com.traindaily.desktop ~/Library/LaunchAgents/com.traindaily.desktop.plist ~/Library/Preferences/com.traindaily.desktop.plist ~/Library/Caches/com.traindaily.desktop ~/Library/Logs/com.traindaily.desktop
```

---

## For Developers

### Prerequisites

**Desktop App Development**
1. **Rust** (latest stable)
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   rustc --version  # Verify installation
   ```

2. **Node.js** (v18+) and pnpm
   ```bash
   # Install from https://nodejs.org
   npm install -g pnpm
   node --version && pnpm --version  # Verify
   ```

3. **macOS** (required for desktop app)
   ```bash
   xcode-select --install  # Xcode Command Line Tools
   ```

**PWA Development Only**
- Node.js (v18+)
- Any modern browser

### Quick Start

**Desktop App (Full Features)**
```bash
git clone https://github.com/IFAKA/traindaily.git
cd traindaily
pnpm install
cd packages/desktop
pnpm tauri dev  # Launches desktop app + creates SQLite DB at /Users/Shared/TrainDaily/
```

**Build Production PKG**
```bash
cd packages/desktop
pnpm tauri build
# .pkg is built automatically by CI — see .github/workflows/release-desktop.yml
```

**PWA Development**
```bash
git clone https://github.com/IFAKA/traindaily.git
cd traindaily
pnpm install
pnpm dev  # Open http://localhost:3000
```

**Deploy PWA**
```bash
pnpm build
vercel deploy --prod
```

### Architecture

```
traindaily/
├── packages/
│   ├── core/              # Platform-agnostic business logic (TypeScript)
│   ├── ui/                # Shared React components (used by PWA + desktop)
│   ├── design-system/     # Apple design tokens & sounds
│   └── desktop/           # Tauri app (Rust backend + React frontend)
├── app/                   # Next.js PWA (mobile)
├── components/            # PWA-specific React components
└── lib/                   # PWA-specific utilities
```

**Desktop Features**
- 6-day PPL split: 12 exercises (bodyweight + TRX)
- Progressive overload: 8-12 rep hypertrophy range
- Rest timers: 90-120 seconds between sets
- App blocker: Full-screen overlay on training days until workout logged
- Hourly micro-breaks with mobility exercises (deferred during calls)
- Mic detection: Detects Teams/Zoom/Meet calls, skips breaks automatically
- Local sync server: HTTPS server for syncing with mobile
- Multi-user support: Works across macOS user accounts (personal ↔ work)
- SQLite storage at `/Users/Shared/TrainDaily/`
- Settings: menu bar toggle, open-at-login (enabled by default on first launch)

**Mobile PWA Features**
- Same workout features as desktop (full parity)
- QR code pairing: Scan once, syncs forever
- Offline support: Works without desktop, syncs when connected
- Auto-sync: Bidirectional sync with desktop over local network
- Installable: Add to home screen

**Training Program: 6-Day Push/Pull/Legs Split**

**Schedule**
- Monday: Push (chest, shoulders, triceps)
- Tuesday: Pull (back, biceps)
- Wednesday: Legs (quads, hamstrings, calves)
- Thursday: Push
- Friday: Pull
- Saturday: Legs
- Sunday: Rest

**Push Day (4 exercises)**
1. TRX Push-ups
2. Pike Push-ups
3. TRX Tricep Extensions
4. Regular Push-ups

**Pull Day (4 exercises)**
1. TRX Rows
2. TRX Face Pulls
3. TRX Bicep Curls
4. Inverted Rows

**Legs Day (4 exercises)**
1. Bulgarian Split Squats
2. Pistol Squat Progressions (TRX-assisted)
3. TRX Hamstring Curls
4. Calf Raises

**Progressive Overload System**
- Weeks 1-4: 2 sets per exercise
- Week 5+: 3 sets per exercise
- Rep range: 8-12 reps per set
- When all sets hit 12+ reps → increase difficulty (angle, tempo, ROM)
- Rest: 90-120 seconds between sets
- Session duration: 30-40 minutes
- Streak tracking: consecutive training days

**Progression Paths**
- TRX exercises: Adjust body angle (closer to horizontal = harder)
- Push-ups: Regular → Deficit → One-arm progressions
- Pistol squats: Box-assisted → TRX-assisted → Freestanding
- All exercises: Control tempo (3-1-3) for added difficulty

**Sync Protocol**
- QR code pairing (one-time setup)
- HTTPS with self-signed cert
- Token-based authentication
- Router-agnostic (survives IP changes)
- Bidirectional (both devices can log workouts)

### Tech Stack

**Desktop (Tauri)**
- Rust backend: Axum, Rustls, SQLite, CoreAudio
- React frontend: TypeScript, Vite, Tailwind CSS v4
- 15 Rust crates, 30+ npm packages

**Core Package**
- Pure TypeScript (no platform dependencies)
- Progressive overload algorithm (tested)
- Storage abstraction (works with SQLite, localStorage, AsyncStorage)

**PWA**
- Next.js 16 (App Router) + React 19
- Tailwind CSS v4 with OKLCh colors
- shadcn/ui components
- Web Audio, Wake Lock, Vibration APIs

### Releases

**Automated releases via semantic-release:**
- Every `feat:` commit → new MINOR version (0.1.0 → 0.2.0)
- Every `fix:` commit → new PATCH version (0.1.0 → 0.1.1)
- GitHub Actions builds `.pkg` automatically
- See [`RELEASES.md`](RELEASES.md) for commit message format

```bash
# Example: This commit will trigger v0.2.0 release
git commit -m "feat: add workout history export"
git push origin main
# → Automated: .pkg built, GitHub release created
```

### Development Commands

```bash
# Install all dependencies (root + all packages)
pnpm install

# Desktop app
cd packages/desktop
pnpm tauri dev            # Run in dev mode
pnpm tauri build          # Build production app (.pkg via CI)
pnpm build                # Build frontend only

# Core package (shared logic)
cd packages/core
pnpm test                 # Run 44 unit tests
pnpm test:ui              # Run tests with UI

# PWA
cd ../..                  # Back to root
pnpm dev                  # Run Next.js dev server
pnpm build                # Build for production
```

### Testing

```bash
# Unit tests (core package)
cd packages/core
pnpm test

# E2E tests (PWA)
cd ../..
pnpm dev                  # Start dev server first
npx playwright test       # Run all e2e tests
npx playwright test --ui  # Run with UI
```

### Project Structure

**Rust Backend** (`packages/desktop/src-tauri/src/`)
```
├── lib.rs              # App entry, spawns 3 background tasks
├── commands.rs         # 8 Tauri commands exposed to frontend
├── db/mod.rs          # SQLite wrapper
├── cert/mod.rs        # Self-signed TLS certificate generation
├── sync/mod.rs        # HTTPS server (Axum + Rustls)
├── mic/mod.rs         # CoreAudio mic detection (macOS)
├── blocker/mod.rs     # App blocker (training day enforcement)
└── overlay/mod.rs     # Micro-break system (hourly prompts)
```

**Desktop Frontend** (`packages/desktop/src/`)
```
├── components/        # Desktop-specific screens (BlockerScreen, PairingScreen, etc.)
├── hooks/            # Platform-specific hook wrappers
├── lib/
│   ├── storage-tauri.ts   # SQLite adapter
│   ├── audio.ts          # Web Audio sound engine
│   └── sync-client.ts    # Desktop discovery & sync
└── App.tsx           # Main app entry
```
*Shared UI components live in `packages/ui` and are consumed by both desktop and PWA.*

**Core Package** (`packages/core/`)
```
├── lib/              # Business logic (progression, schedule, utils)
├── hooks/            # Platform-agnostic hooks
└── __tests__/        # 44 unit tests
```

**PWA** (`app/`)
```
├── page.tsx          # Main workout interface
└── pair/page.tsx     # QR code pairing
```

### Troubleshooting

**Desktop App Build Issues**

| Error | Solution |
|-------|----------|
| `cargo: command not found` | Install Rust: `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \| sh` → Restart terminal |
| `missing xcrun` | Install Xcode Command Line Tools: `xcode-select --install` |
| `Failed to initialize database` | Check permissions: `ls -la /Users/Shared/TrainDaily/` (should be readable/writable by all users) |
| Mic detection not working | Grant microphone permission: System Preferences > Security & Privacy > Microphone<br>Check logs: `tail -f /Users/Shared/TrainDaily/logs/daemon.log` |

**PWA Development Issues**

| Error | Solution |
|-------|----------|
| `Port 3000 already in use` | Kill process: `lsof -ti:3000 \| xargs kill`<br>Or change port in `package.json` dev script |
| Sync not working | 1. Verify desktop app is running<br>2. Check both devices on same WiFi<br>3. Re-pair (scan QR again)<br>4. Check browser console for errors |
| QR code doesn't scan | Use phone's default camera app<br>Verify QR URL starts with `https://traindaily.vercel.app/pair?` |

### Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes
4. Run tests: `cd packages/core && pnpm test`
5. Commit with semantic commit messages: `feat:`, `fix:`, `docs:`, `chore:`
6. Push and create a Pull Request

**Useful Documentation**
- [`docs/MIGRATION_COMPLETE.md`](docs/MIGRATION_COMPLETE.md) - Full migration documentation
- [`docs/MIGRATION_PROGRESS.md`](docs/MIGRATION_PROGRESS.md) - Phase-by-phase progress tracker
- [`packages/core/README.md`](packages/core/README.md) - Core package API docs
- [`packages/desktop/README.md`](packages/desktop/README.md) - Desktop app architecture

### License

MIT

---

## Support

If this project is useful to you, you can support my work:

[![Support me on Ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/zfaka)
