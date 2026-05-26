# Sprint 1 Frontend Handoff Guide

This document explains exactly how a teammate can get the same state as the pushed branch.

## Source Of Truth

- Branch: `sprint1-frontend`
- Latest shared commit: `6f8afa4`
- Remote: `origin/sprint1-frontend`

Only committed files on this branch are shared. Your local uncommitted files are not shared.

## Option A: Fresh Clone (Recommended)

```bash
git clone https://github.com/Yassine-Drira/glunity-mobile-y.git
cd glunity-mobile-y
git checkout sprint1-frontend
```

## Option B: Existing Local Repo

1. Save your local work first.

```bash
git stash push -u -m "before-switch-to-sprint1-frontend"
```

2. Fetch and switch.

```bash
git fetch origin
git checkout sprint1-frontend
git pull --ff-only
```

## Install Dependencies

From repo root:

```bash
npm install
```

From mobile folder:

```bash
cd mobile
npm install
```

Notes:
- `@expo-google-fonts/poppins` is required and already in branch dependencies.
- If `package-lock.json` changed remotely, run `npm install` again to sync.

## Run Mobile App

```bash
cd mobile
npx expo start
```

## What Teammates Should See

1. Shared global bottom navbar on Home/Profile/Settings.
2. Center navbar button uses QR symbol (not plus).
3. Profile page visual state matches current Sprint 1 design.
4. Settings page and Profile page use Poppins typography.
5. Home search bar no longer shows the black rectangle artifact.

## Safety Checks

Run before starting work:

```bash
git status
```

Expected: clean working tree (`nothing to commit, working tree clean`) after install.

Check correct branch and commit:

```bash
git branch --show-current
git --no-pager log --oneline -1
```

Expected:
- branch: `sprint1-frontend`
- latest commit starts with `6f8afa4`

## Important Scope Note

This branch handoff is frontend-focused. Auth screens/login/register/forgot-password and startup animation were not modified in this delivery commit.

## If Someone Gets Different UI

1. Confirm they are on `sprint1-frontend`.
2. Confirm latest commit is `6f8afa4`.
3. Delete and reinstall dependencies:

```bash
cd mobile
rm -rf node_modules
npm install
```

4. Restart Expo with cache clear:

```bash
npx expo start -c
```
