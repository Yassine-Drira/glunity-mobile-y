# Dev Action Checklist: Auth Module Fixes And Additions

Date: 2026-04-10
Audience: Backend + Mobile developers
Based on: docs/08-auth-module-audit-and-test-report.md

## Goal

Ship a secure, testable, production-ready auth flow by addressing high-risk gaps first.

## Priority 0 (Do First)

### 1. Add refresh token session store + rotation + revocation

Status: must add

Why:
- Current refresh tokens are stateless and replayable if stolen.
- Logout currently clears cookie but does not revoke token server-side.

What to implement:
- Add a dedicated token/session model (example: RefreshSession):
  - userId
  - tokenHash (hash refresh token, never store raw)
  - jti
  - deviceInfo / ip / userAgent
  - expiresAt
  - revokedAt
- Include jti in refresh token payload.
- On login/register:
  - create session record
  - issue refresh token with jti
- On refresh:
  - validate token signature + jti
  - ensure session exists and not revoked/expired
  - rotate token (revoke old session, create new one)
- On logout:
  - revoke current refresh session
- On password reset:
  - revoke all active refresh sessions for that user

Files to update:
- api/src/app/modules/auth/auth.service.js
- api/src/app/modules/auth/auth.controller.js
- api/src/app/common/utils/token.js
- api/src/database/models/ (add new refresh session model)
- api/src/app/modules/auth/auth.repository.js (or add dedicated repository)

Acceptance criteria:
- Reusing an old refresh token after rotation returns 401.
- Logging out invalidates the current refresh token.
- Resetting password invalidates all refresh sessions.
- Unit/integration tests cover replay and revocation.

### 2. Add auth endpoint rate limiting

Status: must add

Why:
- Login/reset endpoints currently have no active brute-force protection.

What to implement:
- Install and configure express-rate-limit.
- Add specific limiters:
  - /api/auth/login
  - /api/auth/forgot-password
  - /api/auth/reset-password
  - /api/auth/resend-verification
  - /api/auth/refresh
- Use stricter window on login and forgot-password.
- Return consistent 429 JSON format.

Files to update:
- api/src/app/config/rate-limit.js
- api/src/app/config/security.js
- api/src/app/app.js

Acceptance criteria:
- Repeated failed login attempts trigger 429.
- 429 payload is stable and documented.
- Rate-limiter tests added for login path.

## Priority 1 (Immediately After P0)

### 3. Harden web token storage strategy

Status: must refine

Why:
- Web fallback currently stores tokens in localStorage, increasing XSS risk.

What to implement:
- Avoid storing long-lived refresh token in localStorage.
- Preferred approach for web:
  - keep refresh token in secure httpOnly cookie only
  - keep access token in memory (or short-lived store) and refresh silently
- If localStorage remains temporary, document risk explicitly and scope to dev only.

Files to update:
- mobile/src/core/storage/secure-store.ts
- mobile/src/core/network/http.client.ts

Acceptance criteria:
- Web flow does not persist refresh token in localStorage.
- Session recover/refresh behavior remains functional.

### 4. Remove hardcoded API host fallback

Status: must clean

Why:
- Hardcoded non-web LAN IP creates environment drift and deployment mistakes.

What to implement:
- Require EXPO_PUBLIC_API_BASE_URL for non-dev builds.
- Keep safe localhost defaults only in explicit dev mode.

Files to update:
- mobile/src/core/config/api.config.ts
- mobile/.env.example

Acceptance criteria:
- Production/staging builds fail fast if API base URL is missing.
- Dev and CI env setup docs updated.

## Priority 2 (Quality + CI)

### 5. Expand auth test suite

Status: add more coverage

Add tests for:
- Refresh token replay detection (old token after rotation).
- Logout invalidation behavior.
- Password reset revokes all active sessions.
- Rate limiting response behavior.

Current test baseline already available:
- api/src/tests/unit/auth.service.test.js
- api/src/tests/integration/auth.routes.test.js
- mobile/tests/unit/auth.reducer.test.ts
- mobile/tests/integration/auth.api.test.ts

Acceptance criteria:
- All new tests green in CI.
- No regression on existing auth tests.

### 6. CI auth gate

Status: should add

What to implement:
- Ensure CI runs both auth suites:
  - npm --workspace api run test:auth
  - npm --workspace mobile run test:auth

Suggested workflow location:
- .github/workflows/ci.yml

Acceptance criteria:
- PR blocked if auth tests fail.

## Security/Config Hygiene

### 7. Keep templates sanitized

Status: done in current branch, keep enforced

Rules:
- Never commit real credentials in:
  - api/.env.example
  - api/.env.smtp
  - mobile/.env.example
- Add secret scanning in CI if available.

## Quick Commands For Dev

- Install deps:
  - npm install --include=dev
- Run backend auth tests:
  - npm --workspace api run test:auth
- Run mobile auth tests:
  - npm --workspace mobile run test:auth
- SMTP check (with env configured):
  - npm --workspace api run test:smtp

## Definition Of Done

- P0 and P1 tasks completed.
- New tests added and passing locally + CI.
- No sensitive secrets committed.
- Auth report updated with final PASS/FAIL results.
