# Turnupz Mobile: Developer Onboarding

Welcome. This gets you from a fresh clone to a running app, explains how the code is laid out, and lists the rules and gotchas that will save you time. Read it top to bottom once; after that, use the headings.

---

## 1. The three repos

Turnupz is three codebases. The backend serves both apps.

| Area    | Repo                                                | Working branch (Oct 2026) |
| ------- | --------------------------------------------------- | ------------------------- |
| Mobile  | `github.com/MultraEmpirehq/NewTurnupzMobile` (this) | `dev`                     |
| Web     | `github.com/MultraEmpirehq/Re-TurnupWeb`            | `feat/mobile-parity`      |
| Backend | `github.com/Multra-Empire/TurnUpAppBE`              | `feat/saved-cards`        |

- The repos sit in **two GitHub orgs** (`MultraEmpirehq` and `Multra-Empire`). You need access to both.
- The backend used to live at `Adesanza/TurnUpAppBE`. GitHub redirects the old URL, so older clones still work.
- `TurnUpMobileApp` and `RE-turnupzweb` are **legacy**. Don't build on them.
- If you can't clone something, you haven't been added yet (or you're on the wrong GitHub account). Ask; don't fork around it.

### What you need on day one

- Access to all three repos. Even if you only touch mobile, you'll read the backend for API shapes and validation rules.
- The team's `.env` values for mobile (and backend, if you'll run it).
- Expo/EAS access, if you'll make device builds.
- For Play Store builds only: the upload keystore and its passwords. These are never committed or shared in chat; ask the lead.

---

## 2. Stack

- **Expo SDK 54**, **React Native 0.81** with the **New Architecture on** (Fabric), React 19, TypeScript
- React Navigation 7 (native stack), though most in-app navigation is plain state (see §6)
- **TanStack React Query** + axios for all server data
- **Zustand** for app state, persisted with `react-native-mmkv`
- **NativeWind 4** (Tailwind classes on RN components)
- react-hook-form + joi for forms
- `react-native-flash-message` for toasts (wrapped; see §7)
- Jest (`jest-expo`) + React Testing Library

Expo Go **does not work**: we use native modules (MMKV/Nitro, Google sign-in, image manipulator). Use a dev build, a simulator build, or the web target.

---

## 3. Environment variables

`.env` in the project root, loaded by `react-native-dotenv` and imported from `@env` (types in `env.d.ts`). It's gitignored; get values from the team.

```env
BASE_URL=https://api.staging.turnupz.com/api/v1
USER_AUTH_STORAGE_ID=turnup-user-store
USER_AUTH_STORAGE_KEY=<ask>
GOOGLE_WEB_CLIENT_ID=<ask>
GOOGLE_IOS_CLIENT_ID=<ask, can be empty>
WEB_APP_URL=<the web app's base URL>
```

| Variable                | Used for                                                                 |
| ----------------------- | ------------------------------------------------------------------------ |
| `BASE_URL`              | axios base URL for every request (`src/api/index.ts`)                    |
| `USER_AUTH_STORAGE_ID`  | MMKV id for the persisted session (`user.store.ts`)                      |
| `USER_AUTH_STORAGE_KEY` | MMKV encryption key (not used on web)                                    |
| `GOOGLE_WEB_CLIENT_ID`  | Audience the backend verifies Google ID tokens against                   |
| `GOOGLE_IOS_CLIENT_ID`  | iOS Google sign-in. Empty hides the Google button on iOS                 |
| `WEB_APP_URL`           | Links that open the website: invite links, share links, email sign-up    |

Gotchas:

- `allowUndefined` is `false`. A missing variable fails the bundle.
- Values are **inlined at build time and cached**. After changing `.env`, restart with `npx expo start -c`. For a native release build, also clear Metro's cache: `rm -rf "$TMPDIR"/metro-cache`.
- It's `BASE_URL`, not `EXPO_PUBLIC_API_BASE_URL`. That older name isn't read anywhere.

### Which `BASE_URL`

| You're running…                 | `BASE_URL`                               |
| ------------------------------- | ---------------------------------------- |
| Against staging (default)       | `https://api.staging.turnupz.com/api/v1` |
| Local backend, iOS sim / web    | `http://localhost:3111/api/v1`           |
| Local backend, Android emulator | `http://10.0.2.2:3111/api/v1`            |

Android **release** builds block plain `http://`, so against a local backend use the **debug** build on Android. **Always put `BASE_URL` back to staging before any store build.**

---

## 4. Backend (only if you need it locally)

For pure UI work, staging is enough. Run the backend locally when you change backend code, need test data, or want to debug a request end to end.

```bash
cd turnupapp_be
cp .env.example .env              # then fill in the values from the team
docker compose up -d              # Postgres 16 on localhost:5436
docker run -d --name turnup-redis -p 6379:6379 redis:7
npm install
npx prisma migrate deploy         # apply migrations
npm run db:seed                   # test users, events, tickets (safe to rerun)
npm run start:dev                 # API on http://localhost:3111/api/v1
```

- **Seed accounts** use the password `Testing@123`: `grace.etim@seed.example.com` (attendee with tickets, credit, saved cards), `segun.ogunleye@seed.example.com`, `yusuf.garba@seed.example.com` (vendor), and admin `admin@test.com`. Local only.
- **Sessions are tied to the user agent.** If you log in with curl and then call the API with a different UA, you'll get `401`. Use `-A "okhttp/4.12.0"` consistently.
- **After a migration that adds a table or enum value, restart `start:dev`.** The watcher keeps the old Prisma client otherwise.
- Backend tests: `npx jest <path>`. A few `"should be defined"` placeholder specs fail on `main` already; ignore those, and don't add new failures.

---

## 5. Running the app

```bash
npm install            # .npmrc sets legacy-peer-deps=true
```

### Web (fastest for UI)

```bash
npm run web            # or: npx expo start --web
```

Good for layout and flows. It is **not** a faithful check for native behaviour: animations, modals, the keyboard and the back button all differ. Confirm on a simulator before calling something done.

### iOS simulator (Xcode 27)

Xcode 27 has no Simulator.app (simulators open in **DeviceHub**), so `npm run ios` fails with *"Can't determine id of Simulator app"*. Build by hand:

```bash
npx expo prebuild -p ios                  # first time, or after native config changes
xcrun simctl list devices available       # pick a UDID
xcrun simctl boot <UDID>
open -a DeviceHub

cd ios && pod install                     # after adding a native package
xcodebuild -workspace Turnup.xcworkspace -scheme Turnup \
  -configuration Release -sdk iphonesimulator \
  -destination "id=<UDID>" -derivedDataPath build/dd build
xcrun simctl install <UDID> build/dd/Build/Products/Release-iphonesimulator/Turnup.app
xcrun simctl launch <UDID> com.turnup.mobile
```

A Release build embeds the JS, so no Metro is needed. A JS-only change means rerunning `xcodebuild` and `install` (1–2 min). `plugins/with-pod-deployment-target.js` raises old pods to iOS 15.1 on every prebuild; don't hand-edit the Podfile for that.

### Android emulator (debug build, live reload)

```bash
export JAVA_HOME=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home
npx expo prebuild -p android --no-install     # after native changes
cd android && ./gradlew assembleDebug -PreactNativeArchitectures=arm64-v8a
adb install -r app/build/outputs/apk/debug/app-debug.apk

cd .. && npx expo start --dev-client --port 8081
adb shell am start -a android.intent.action.VIEW \
  -d "exp+turn-up-mobile://expo-development-client/?url=http%3A%2F%2F10.0.2.2%3A8081"
```

- The first debug build takes 30+ minutes; after that, JS changes reload live.
- To test the older three-button navigation: `adb shell cmd overlay enable com.android.internal.systemui.navbar.threebutton`
- The emulator plus Metro plus a browser will saturate a laptop. If `adb` starts hanging, close something.

### Play Store build (AAB)

```bash
# bump android.versionCode in app.json first (it must increase every upload)
npx expo prebuild -p android --no-install
cd android && ./gradlew bundleRelease
```

Signing reads `TURNUPZ_UPLOAD_*` from `~/.gradle/gradle.properties`. Never commit those or the keystore. Check that `BASE_URL` is staging/production before building.

---

## 6. How the app is put together

```
App.tsx                         Providers (gesture, React Query, safe area), fonts, the root toast
src/
  api/                          axios instance: Bearer token, X-Device-Id, 401 → sign out
  navigation/                   NavigationWrapper picks the signed-in / signed-out stack
  screens/
    landing/ verification/ create-password/ forgot-password/ onboarding/   Sign-in & sign-up
    home/screen/refined-home-feed-design.screen.tsx   The signed-in shell (see below)
    live/        Event detail, explore, checkout, my tickets, chat thread, sheets, live-api.ts
    chat/        Messages tab (inbox)
    notifications/  Notifications tab + its API hooks
    profile/     Profile, edit profile, wallet, settings, invite, follow button
    people/      Find people, someone's profile, followers/following (one global modal)
    search/
  shared/
    components/ hooks/ stores/ utils/ assets/
```

Path aliases (`tsconfig.json`): `@/*` → `src/*`, plus `@screens/*`, `@components/*`, `@utils/*`, `@stores/*`, `@api/*`, `@assets/*`, `@icons/*`, `@images/*`, `@hooks/*`, `@navigation/*`, `@types/*`, `@svg/*`, `@styles/*`.

### The signed-in shell

There is one authenticated route (`tab`), rendered by `RefinedHomeFeedDesignScreen`. It owns:

- `activeTab`: Home, Explore, Messages, Notifications, Profile (`PreviewBottomNav` draws the bar)
- full-screen "pages" as state: `liveEventId`, `livePerformerId`, `liveBookingEvent` (checkout)
- the global `EventOptionsSheet` (the ⋯ menu on event cards) and `PeopleModal`

So "navigating" to an event is `setLiveEventId(id)`, not `navigation.navigate`. Each screen takes callbacks like `onOpenEvent` / `onOpenTickets` / `onBack`. Follow that pattern rather than adding routes.

People pages are a small stack in a Zustand store: `usePeopleNav().openPerson(username)`, `openConnections(...)`, `openSearch()`. Any screen can call it.

### Data

- Server data goes through React Query hooks in `src/screens/live/live-api.ts`, `profile/profile-api.ts`, `notifications/notifications-api.ts` and `people/people-api.ts`. Add new endpoints next to the feature that uses them.
- Invalidate by key after mutations (`["me"]`, `["live-chats"]`, `["notifications"]`, `["saved-cards"]`, `["follows"]`, …).
- The axios instance attaches the token and a per-install `X-Device-Id`. A `401` on an authenticated call clears the user store, which drops the user back to sign-in.

---

## 7. Rules we follow (please read)

**Copy speaks to the user, not to developers.** Anything a person sees (labels, toasts, empty states, errors) is plain language that tells them what happened and what to do: "We couldn't send that. Check your connection and try again." No "API", "request failed", enum names or status codes. If the backend returns a message, it's written for users too; keep it that way.

**Toasts only when they add something.** Use `onError` / `onSuccess` / `onInfo` from `@/shared/components/status/toast`. Show one when an action the user took fails, or when it succeeded in a way they can't otherwise see ("Sent to Tolu…", "Code copied"). Don't toast what's already visible on screen (a button changing to "Following", navigating after login), and never toast background loads. Errors last 6s, everything else 4s.

**Every `<Modal>` gets an `<OverlayToast />`** (from `@/shared/components/status/toast/overlay-toast`) as its last child. On native, a Modal covers the root toast; this makes toasts show on top of it.

**Every page with a back arrow handles Android's back button** with `useHardwareBack(onBack)` from `@/shared/hooks/use-hardware-back`. Return `false` from the handler to let it fall through. Block it mid-payment, and confirm before discarding unsaved edits.

**Don't rely on `Animated` for anything that must be visible.** On the New Architecture, some `Animated` timings never run (the toast library's fade-in left every toast at opacity 0). If an element starts hidden and animates in, it may never appear. Animate decoration, not visibility. Prefer simple timers or no animation, and **test on a simulator**: web won't show this bug.

**Brand colours come from `BRAND`** (`@/shared/utils/brand-colors`): blue `#00B2FF`, deep blue `#0577FA`, ink, black, white, greys. Red and green are for status only (errors, success).

**Rules that live on the server stay on the server.** The app hides a button for convenience (e.g. no "Transfer" on free tickets), but the backend is what enforces it. Never make a rule exist only in the UI.

**Images:** pick photos with `expo-image-picker` and shrink them before upload (see `sendChatPhoto`: 1080px wide, JPEG 0.7). Keep bundled assets small. Nothing over ~100 KB without a reason.

---

## 8. Product rules worth knowing

These come up in code review:

- **Performers:** one record per name (matched ignoring case, spacing, punctuation and accents). Unverified performers have no page of their own. Approved ones get the blue tick.
- **Free tickets can't be transferred.** This is enforced in the backend.
- **Getting a ticket adds you to the event's group chat**, however you got it. An hourly backend job keeps groups in sync, and event chats go read-only 3 days after the event.
- **Messaging people:** two people can message once they **follow each other**. Organisers can always be messaged about their event.
- **Chat cost rules:** no "typing…" indicator, and "Seen" only in one-to-one chats.
- **Profiles** never expose email, phone or birthday. Country shows only if the person turns it on. People can hide their Turnupz Credit balance (stored per device).
- **Payments** go through Flutterwave. Saved cards store only Flutterwave's token (encrypted), never card numbers.

---

## 9. Tests

```bash
npx jest --watchAll=false       # once
npm test                        # watch mode
```

Heads-up: **most mobile test suites currently fail** (10 of 11) because of test-setup problems that predate recent work. Fixing the Jest setup is an open task. Until then, `npx tsc --noEmit` must stay clean, and check your change on a simulator.

---

## 10. Git

- Branch from the working branch (see §1), open a PR, keep commits focused, and write messages that say *why*.
- Never commit `.env`, keystores, `google-services` secrets or service-account JSON.
- The Husky hooks in `.husky/` aren't active (Husky isn't installed, and they call a missing `lint` script). ESLint isn't wired up yet either. Format with Prettier (`.prettierrc`).

---

## 11. When you're stuck

1. Right repo and branch?
2. `.env` has all six variables, and you restarted with a cleared cache (`npx expo start -c`)?
3. `BASE_URL` right for where you're running (§3)?
4. Using a dev or simulator build, not Expo Go?
5. Something invisible or not animating on native? Read the `Animated` rule in §7.
6. Toast not showing over a sheet? Is there an `<OverlayToast />` in that Modal?
7. `401` against a local API? You switched user agents (§4).
8. Backend changes not taking effect after a migration? Restart `start:dev`.

## Open items

- Fix the Jest setup so the existing suites run; then add tests for wallet, chats and people
- Add ESLint and a `lint` script; remove or fix the Husky hooks
- Rename the package (`package.json` `name` is still `to-do-app`)
- Live chat delivery: chats currently poll (5s thread, 20s inbox); the backend has an SSE stream ready to use
- Serve resized images from Cloudinary for lists and thumbnails
