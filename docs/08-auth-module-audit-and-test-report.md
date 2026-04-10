# Auth Module Audit And Test Report

Date: 2026-04-10
Branch: auth-module-audit-and-test
Scope: API auth module, mobile auth module, environment templates, and auth test readiness.

## 1. Executive Summary

Overall status: WARNING

- Strengths:
  - Clear backend auth layering: routes -> controller -> service -> repository.
  - Password hashing and JWT signing are in place.
  - Enumeration-safe behavior is implemented for forgot-password and resend-verification responses.
  - Frontend has centralized auth state and token storage abstraction.
- Critical risks:
  - No refresh token revocation/rotation persistence (stateless refresh replay risk).
  - No rate limiting active for auth endpoints.
  - Sensitive credentials were committed in SMTP template before this audit fix.
- Medium risks:
  - Mobile fallback to localStorage for tokens on web (XSS exposure surface).
  - Hardcoded API LAN IP in mobile default API config.

## 2. Backend Code Review Findings

### PASS

- Validation middleware is consistently applied to auth endpoints.
  - File: api/src/app/modules/auth/auth.routes.js
  - File: api/src/app/common/middleware/validation.middleware.js
- Password reset and email verification tokens are stored hashed.
  - File: api/src/app/modules/auth/auth.service.js
- Token verification includes issuer/audience checks.
  - File: api/src/app/common/utils/token.js

### WARNING

- Logout endpoint clears cookie but does not invalidate refresh token server-side.
  - File: api/src/app/modules/auth/auth.controller.js
- Refresh token flow does not track jti/session/device in DB and cannot revoke compromised tokens.
  - File: api/src/app/modules/auth/auth.service.js
- Email verification failure redirects without exposing details, but catches all errors broadly.
  - File: api/src/app/modules/auth/auth.controller.js

### FAIL

- Rate-limiting/security modules exist but are empty, and no limiter is mounted in app middleware.
  - File: api/src/app/config/rate-limit.js
  - File: api/src/app/config/security.js
  - File: api/src/app/app.js

## 3. Frontend Code Review Findings

### PASS

- Auth context restores session and clears tokens on restore failure.
  - File: mobile/src/modules/auth/state/auth.context.tsx
- Login/register normalize user emails before API calls.
  - File: mobile/src/modules/auth/ui/screens/LoginScreen.tsx
  - File: mobile/src/modules/auth/ui/screens/RegisterScreen.tsx

### WARNING

- Mobile HTTP client refresh flow retries once and clears tokens on failure (good), but no explicit forced redirect flow is triggered there.
  - File: mobile/src/core/network/http.client.ts
- API base URL defaults to a hardcoded LAN IP for non-web platforms.
  - File: mobile/src/core/config/api.config.ts

### FAIL

- Web token storage fallback uses localStorage which is vulnerable to XSS token theft.
  - File: mobile/src/core/storage/secure-store.ts

## 4. Security Checklist (PASS/FAIL/WARNING)

- Password hashing with bcrypt: PASS
- Access token signature and claims validation: PASS
- Refresh token rotation/revocation strategy: FAIL
- Auth endpoint brute-force rate limiting: FAIL
- Email/password reset account enumeration resistance: PASS
- Sensitive secret hygiene in committed templates: WARNING (fixed in this branch)
- Token storage on web client: WARNING
- Secure cookie usage for refresh token: WARNING (enabled, but frontend still also handles refresh token body)

## 5. Environment And Configuration Audit

### Fixes applied in this branch

- Sanitized API env template and aligned keys with runtime config usage:
  - APP_ORIGINS corrected and APP_URL/CLIENT_URL added.
  - Removed real DB URI and replaced with local placeholder.
  - Added MAIL_FROM placeholder.
  - File: api/.env.example

- Removed exposed SMTP credential values from SMTP env template.
  - File: api/.env.smtp

- Aligned mobile env example with consumed variable name.
  - File: mobile/.env.example

### Remaining recommendation

- Replace hardcoded default non-web API URL with environment-only resolution in production builds.
  - File: mobile/src/core/config/api.config.ts

## 6. Tests Added In This Branch

### Backend

- Unit tests for core AuthService behavior:
  - register success and duplicate-email rejection
  - login invalid-password rejection
  - refresh missing-token rejection and valid-token reissue
  - forgot-password enumeration safety
  - reset-password invalid-token rejection
  - File: api/src/tests/unit/auth.service.test.js

- Integration-style route validation tests using Supertest and mocked controller:
  - validation failures for invalid payloads
  - route/controller reachability for valid payloads
  - protected route middleware path
  - File: api/src/tests/integration/auth.routes.test.js

- Jest setup for required auth env variables in test runtime.
  - File: api/jest.setup.cjs

### Frontend

- Auth reducer unit tests for SET_USER and CLEAR_USER transitions.
  - File: mobile/tests/unit/auth.reducer.test.ts
  
- Auth API integration tests with mocked network + token store:
  - login stores tokens correctly
  - register stores tokens correctly
  - logout clears tokens
  - File: mobile/tests/integration/auth.api.test.ts

- Jest config for TypeScript auth tests + alias mapping.
  - File: mobile/jest.config.cjs

## 7. SMTP Integration Test Utility

A standalone SMTP verifier + send test script was added.

- File: api/scripts/test-smtp-auth.js
- Command: npm --workspace api run test:smtp
- Required env:
  - SMTP_HOST
  - SMTP_PORT
  - SMTP_USER
  - SMTP_PASS
  - optional MAIL_FROM
  - optional SMTP_TEST_TO

## 8. Remediation Plan (Prioritized)

1. Implement refresh token session store and revocation.
   - Store hashed refresh tokens with jti, device metadata, and expiry.
   - Rotate refresh token on every refresh.
   - Invalidate token/session on logout and password reset.

2. Add auth rate limiters.
   - login, forgot-password, reset-password, resend-verification, refresh.
   - Use stricter thresholds for login and forgot-password.

3. Harden frontend token strategy.
   - On web: avoid persistent localStorage for long-lived refresh tokens.
   - Consider memory-only access token + backend refresh cookie if web is a target.

4. Remove hardcoded API endpoint fallback.
   - Require EXPO_PUBLIC_API_BASE_URL for all non-dev builds.

5. Expand test coverage.
   - Add refresh replay and logout invalidation tests once session store is implemented.
   - Add end-to-end auth flow tests with mocked email links.
