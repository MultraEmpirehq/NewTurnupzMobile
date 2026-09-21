# TurnUp Developer Onboarding

## Purpose

This document is for new developers joining the TurnUp project.

It exists to prevent wasted time during onboarding and to answer the common questions:

- Which repository should I use?
- Which codebase is current and which one is old?
- Do I need the backend running locally?
- How do I view my frontend changes?
- What environment variables do I need?
- What access do I need on day one?

This guide is based on the current team understanding captured from the Slack thread and local project inspection.

## Project Overview

TurnUp currently has separate repositories for:

- Web frontend
- Mobile frontend
- Backend

The backend powers both the web app and the mobile app.

## Active Repositories

Use these repositories as the current working set:

- Web frontend: `https://github.com/MultraEmpirehq/Re-TurnupWeb`
  Latest TurnUp web codebase
- Mobile frontend: `https://github.com/Multra-Empire/TurnUpMobileApp`
  TurnUp mobile app frontend codebase
- Backend: `https://github.com/Multra-Empire/TurnUpAppBE`
  Shared backend for web and mobile

## Old Code / Archive Note

There is mention of another older `RE-turnupzweb` codebase that should have been archived or deleted but was left around "just in case".

Important:

- Do not assume every repo or link shared historically is current
- The active web repo is `Re-TurnupWeb`
- If you find another similarly named older web repo, treat it as legacy until the lead confirms otherwise
- When in doubt, ask which repo is the source of truth before building on top of it

## Source Of Truth

For current development, use:

- `Re-TurnupWeb` for web frontend work
- `TurnUpMobileApp` for mobile frontend work
- `TurnUpAppBE` for backend/API behavior

If a link or repo conflicts with these, assume it is outdated until confirmed.

## Access Checklist

A new developer should be granted access to all of the following:

- Web frontend repository
- Mobile frontend repository
- Backend repository
- Deployment or hosting dashboards if needed
- Shared environment variable values for frontend
- Backend access if they need to inspect how data is collected or shaped

Notes:

- Even if a developer is primarily working on frontend, backend repository access is still useful for understanding API contracts and data flow
- Access to the correct GitHub organization and repository matters more than trying to recreate a repo locally from a random old link

## GitHub Access Notes

If you cannot clone or open a repository:

- You may not have been added as a collaborator yet
- You may be logged into the wrong GitHub account
- The repository may belong to a different GitHub organization than expected

Do not create a new repository to work around missing access.

The correct fix is:

- Get added to the existing repository as a collaborator or team member
- Confirm you are using the correct GitHub account
- Confirm whether access is via HTTPS credentials, a personal access token, or SSH keys

## Backend / API Reality

The backend is live.

Current team understanding:

- You do not need to run the backend locally just to work on frontend
- Frontend development can use the live backend API
- Backend local setup is optional unless you are actively changing backend code

Frontend developers may still want backend access to:

- Inspect endpoints
- Understand request and response shapes
- Trace where data is coming from
- Check validation rules and business logic

## Known Frontend Environment Variables

Shared in Slack:

```env
EXPO_PUBLIC_API_BASE_URL="https://turnupappbe.onrender.com/api/v1"

NEXT_PUBLIC_BASE_URL=http://localhost:3333/api
NEXT_PUBLIC_API_VERSION=v1
```

Interpretation:

- `EXPO_PUBLIC_API_BASE_URL` is for the mobile frontend
- `NEXT_PUBLIC_BASE_URL` and `NEXT_PUBLIC_API_VERSION` are for the web frontend

Important:

- `NEXT_PUBLIC_BASE_URL=http://localhost:3333/api` implies the web frontend may expect a local backend-style base URL in some setups
- If web is actually meant to hit live backend in your environment, confirm the correct current value with the lead before changing anything
- Do not assume old Slack snippets are still the full production truth

## Mobile App Notes

This repository is the mobile frontend:

- `TurnUpMobileApp`

From local inspection, this is an Expo + React Native + TypeScript app.

It uses:

- Expo
- React Native
- TypeScript
- React Navigation
- Zustand
- React Query
- NativeWind

## Does Mobile Connect Directly To A Database?

No.

The mobile app does not connect directly to a database from the frontend code.
It talks to the backend API, and the backend is responsible for database access.

## Do I Need To Run Backend Locally?

Usually no, if your task is frontend-only.

Use the live backend unless:

- You are changing backend code
- You need to test backend-only fixes locally
- The live API is unavailable
- You need local debugging for backend behavior

## How To View Frontend Changes

### Mobile App

To view changes in the mobile app:

1. Install dependencies
2. Add the required environment variables
3. Start the Expo app
4. Open it on web, emulator, or device

Typical commands:

```powershell
npm install
npm start
```

Then from Expo:

- Press `w` for web
- Press `a` for Android
- Press `i` for iOS if on a supported macOS setup
- Or scan the QR code with Expo Go / a dev client

### Web App

Use the web frontend repository and run its local dev server according to that repo's scripts and env setup.

## Mobile Environment Setup

This mobile app expects environment variables through `@env`.

From local code inspection, the mobile app expects:

```env
BASE_URL=
USER_AUTH_STORAGE_ID=
USER_AUTH_STORAGE_KEY=
```

Important:

- This is the variable naming used by the local mobile source code
- It does not currently match the Slack variable name `EXPO_PUBLIC_API_BASE_URL`
- Before onboarding others, the team should standardize and document which variable format is actually correct for this repo

## Recommended Mobile `.env` Example

Use this only as a starting point and confirm with the lead:

```env
BASE_URL=https://turnupappbe.onrender.com/api/v1
USER_AUTH_STORAGE_ID=turnup-user-store
USER_AUTH_STORAGE_KEY=replace-with-team-value
```

## Mobile Run Steps

Inside `TurnUpMobileApp`:

```powershell
npm install
npm start
```

If the app fails on startup:

- Check whether `.env` exists
- Check whether `BASE_URL` is defined
- Check whether you are in the correct repo
- Check whether dependencies were installed

## How Screen Display Works In Mobile

The mobile app shows different screens based on auth state.

High level:

- If no authenticated user exists, the app shows unauthenticated screens
- If a user is already in the local auth store, the app shows authenticated tabs

### Unauthenticated Flow

Screens include:

- Landing
- Verification
- Forgot Password
- Create Password
- Onboarding

### Authenticated Flow

Screens include:

- Home
- Tickets
- Messages
- Favorites
- Profile
- Search

## How To Quickly Preview Screens

If you are working on frontend and only want to preview screens:

- Start the mobile app
- Use the normal navigation flow where possible
- If auth state blocks you, temporarily seed or clear the local user store for development
- For focused UI work, a developer can temporarily change the initial route or navigator rendering locally

Do not commit temporary screen-forcing hacks unless the team agrees on a proper dev-only preview pattern.

## When A New Developer Gets Stuck

Before spending hours jumping between broken links, verify these in order:

1. Am I in the correct repository?
2. Is this the current codebase or old code?
3. Do I actually need backend local setup for my task?
4. Do I have the correct `.env` values?
5. Do I have access to the correct GitHub organization and repository?
6. Am I supposed to use the live backend instead of running one locally?

## Recommended Onboarding Flow

Every new developer should be given the following on day one:

1. A list of the active repositories
2. A note identifying any old or legacy repositories
3. The minimum required environment variables
4. Clear instructions on whether backend is live or needs local setup
5. Instructions for viewing frontend changes locally
6. GitHub access to all relevant repositories
7. One team contact for unresolved setup issues

## Current Gaps In Documentation

These areas should still be confirmed and documented more formally:

- Which old repository is officially archived
- The exact correct mobile `.env` variable names
- The correct current web API base URL for local development
- Backend local setup steps for developers who need BE access
- Deployment environments and ownership
- Where shared credentials or passkeys are stored

## Recommended Team Decision

To avoid repeated onboarding pain, the team should maintain one short source-of-truth document per repository that includes:

- What this repo is for
- Whether it is current or legacy
- How to run it
- Required environment variables
- External services it depends on
- Who to ask when blocked

## Summary

If you are new to TurnUp, start here:

- Web latest code: `Re-TurnupWeb`
- Mobile latest code: `TurnUpMobileApp`
- Backend for both: `TurnUpAppBE`
- The backend is live, so frontend work usually does not require local backend setup
- Do not trust old links or similarly named repos without confirmation
- Ask for access to all active repositories early

