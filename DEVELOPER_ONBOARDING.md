# TurnUp Developer Onboarding

## Purpose

This document is for new developers joining the TurnUp project. It answers:

- Which repository should I use?
- Do I need the backend running locally?
- What environment variables do I need?
- How do I run the mobile app and see my changes?
- What access do I need on day one?

## Project Overview

TurnUp has separate repositories for web, mobile and backend. The backend powers both the web app and the mobile app.

| Area            | Repository                                            | Notes                         |
| --------------- | ----------------------------------------------------- | ----------------------------- |
| Mobile frontend | `https://github.com/MultraEmpirehq/NewTurnupzMobile`  | This repo                     |
| Web frontend    | `https://github.com/MultraEmpirehq/Re-TurnupWeb`      | Latest web codebase           |
| Backend         | `https://github.com/Multra-Empire/TurnUpAppBE`        | Shared backend for web/mobile |

Note that the repos are split across two GitHub organizations (`MultraEmpirehq` and `Multra-Empire`). Make sure you have access to both.

### Legacy repositories

Older repos exist and should be treated as legacy unless the lead says otherwise:

- `TurnUpMobileApp` (the previous mobile app; replaced by `NewTurnupzMobile`)
- `RE-turnupzweb` (older web codebase; replaced by `Re-TurnupWeb`)

Do not build on a repo or link that conflicts with the table above. Ask first.

## Access Checklist

A new developer should be granted access to:

- All three repositories above (backend access is useful even for frontend work, to read API contracts and validation rules)
- The Expo / EAS project, if you need to make device builds
- The shared `.env` values for the mobile app
- Deployment or hosting dashboards, if your role needs them

If you cannot clone a repo, you are probably not added yet, or you are signed into the wrong GitHub account. Don't create a new repo to work around it. Ask to be added.

## Backend / API

The shared staging backend is live at `https://api.staging.turnupz.com/api/v1`. Both the web and mobile apps use it for development.

- You do not need to run the backend locally for frontend work
- Run it locally only if you are changing backend code or debugging backend behaviour. It listens on port `3111` (`http://localhost:3111/api/v1`)
- The mobile app never talks to a database directly; everything goes through the API

The old `https://turnupappbe.onrender.com/api/v1` URL from Slack no longer responds. Don't use it.

## Mobile App

### Stack

- Expo SDK 54, React Native 0.81 (New Architecture enabled), React 19, TypeScript
- React Navigation 7 (native stack)
- Zustand for state, persisted with `react-native-mmkv`
- TanStack React Query + axios for data fetching
- NativeWind 4 (Tailwind) for styling
- react-hook-form + joi for forms
- Jest (`jest-expo`) + React Testing Library for tests

### Environment variables

Variables are loaded from a `.env` file in the project root through `react-native-dotenv` and imported from `@env` (types live in `env.d.ts`). `.env` is gitignored, so get the values from the team.

```env
BASE_URL=https://api.staging.turnupz.com/api/v1
USER_AUTH_STORAGE_ID=turnup-user-store
USER_AUTH_STORAGE_KEY=<ask the team>
```

| Variable                | Used in                          | Purpose                                                   |
| ----------------------- | -------------------------------- | --------------------------------------------------------- |
| `BASE_URL`              | `src/api/index.ts`               | axios base URL for every API call                         |
| `USER_AUTH_STORAGE_ID`  | `src/shared/stores/user.store.ts` | MMKV storage id for the persisted user session            |
| `USER_AUTH_STORAGE_KEY` | `src/shared/stores/user.store.ts` | MMKV encryption key (falls back to a default if empty; not used on web) |

Things to know:

- The names are `BASE_URL` etc., **not** `EXPO_PUBLIC_API_BASE_URL`. The `EXPO_PUBLIC_*` name shared in Slack isn't read by this repo.
- `allowUndefined` is `false`, so the bundle fails if a variable is missing from `.env`.
- Env values are inlined by Babel and cached. After editing `.env`, restart with a cleared cache: `npx expo start -c`.

### Running the app

```bash
npm install          # .npmrc sets legacy-peer-deps=true
npm start            # expo start (dev server)
```

This project uses `expo-dev-client` and native modules (`react-native-mmkv` / Nitro), so **Expo Go won't work**. Choose one of these:

- **Web (fastest for UI work):** `npm run web`, or press `w` in the Expo terminal. MMKV runs unencrypted on web.
- **Android emulator/device:** `npm run android` (`expo run:android`). This builds the native app locally and needs Android Studio / SDK.
- **iOS simulator/device:** `npm run ios` (`expo run:ios`). Needs macOS + Xcode.
- **Shared dev build:** install a development-client build from EAS (the `preview3` profile in `eas.json` has `developmentClient: true`), then run `npm start` and open the app on your device.

Other EAS profiles in `eas.json`: `preview` (internal APK), `preview2` (Android release build), `production`.

### Tests

```bash
npx jest             # run once
npm test             # jest --watchAll
```

The live-ticketing rules are covered in `src/screens/live/live-rules.test.ts`.

### Project structure

```
App.tsx                      # Providers: gesture handler, React Query, safe area, flash messages
src/
  api/                       # axios instance (auth header + 401 handling), API functions and types
  navigation/
    navigator-wrapper/       # Picks the authenticated or unauthenticated navigator from the user store
    unauthenticated-navigator/
    authenticated-navigator/
    tab-navigator/           # Older bottom-tab navigator (not currently mounted)
  screens/<feature>/         # One folder per feature: screen/, components/, stores/, service/, ...
    live/                    # Event detail, ticket checkout, my tickets, report event (live API)
  shared/
    assets/  components/  hooks/  stores/  utils/
```

Path aliases (from `tsconfig.json`): `@/*` → `src/*`, plus `@screens/*`, `@components/*`, `@utils/*`, `@stores/*`, `@api/*`, `@assets/*`, `@icons/*`, `@images/*`, `@styles/*`, `@svg/*`, `@hooks/*`, `@navigation/*`, `@types/*`.

### How screens are shown

`NavigationWrapper` reads `user` from the persisted user store:

- **No user → unauthenticated stack:** Landing, Verification, Forgot Password, Create Password, Onboarding
- **User present → authenticated stack:**
  - `tab`: the home feed (`refined-home-feed-design.screen.tsx`). It draws its own bottom bar and tabs, and it opens the live-ticketing screens (event detail, checkout, my tickets).
  - `search`: the search screen.

The older `TabNavigator` (Home / Tickets / Messages / Favorites / Profile) is still in the repo but isn't mounted. The home feed replaced it.

Auth: the session token is stored in the user store, and an axios interceptor attaches it as `Bearer` on every request. A `401` on an authenticated request clears the store, which sends the user back to sign-in.

### Previewing screens quickly

- Use the normal flow where you can. Sign in once and the session persists.
- To force a sign-out during development, the commented-out `clearUserStore()` call in `App.tsx` can be enabled temporarily.
- Do not commit temporary screen-forcing hacks.

### Git workflow

- Default branch: `main`. Work on feature branches (e.g. `feat/live-ticketing`) and open PRs into `main`.
- There are Husky hook scripts in `.husky/`, but they aren't active: Husky isn't installed, and the scripts reference `yarn lint` (no `lint` script exists) and an `origin dev` branch (which doesn't exist). Ignore them until they're fixed.
- Formatting follows `.prettierrc`. The `.eslintrc.js` config is present, but ESLint isn't installed as a dependency yet.

## When You Get Stuck

Check these in order:

1. Am I in `NewTurnupzMobile` (not the old `TurnUpMobileApp`)?
2. Does `.env` exist, with all three variables set?
3. Did I restart with `npx expo start -c` after changing `.env`?
4. Am I using a dev build or web rather than Expo Go?
5. Is `BASE_URL` pointing at staging (`https://api.staging.turnupz.com/api/v1`)?
6. Do I have access to the right GitHub org and repo?

## Open Items

These still need to be confirmed or fixed:

- Official archive status of `TurnUpMobileApp` and `RE-turnupzweb`
- Where shared credentials and `.env` values are stored
- Correct API base URL for local web development
- Backend local setup steps
- Fix or remove the Husky hooks; add ESLint + a `lint` script
- Rename the package (`package.json` `name` is still `to-do-app`)

## Summary

- Mobile: `NewTurnupzMobile` · Web: `Re-TurnupWeb` · Backend: `TurnUpAppBE`
- The backend is live, so frontend work doesn't need a local backend
- Create `.env` with `BASE_URL`, `USER_AUTH_STORAGE_ID` and `USER_AUTH_STORAGE_KEY`, then run `npm install && npm start`
- Use web or a dev-client build; Expo Go isn't supported
