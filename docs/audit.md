# Expert Line-by-Line Engineering & Architectural Audit

This document presents a comprehensive, line-by-line technical audit of the **Glunity Mobile** monorepo codebase. Every critical module, model, middleware, and network configuration has been inspected against production-grade security, scalability, performance, and UX criteria.

---

## 1. Monorepo Workspace & Codebase Health

### 1.1 Unresolved Git Merge Conflicts (monorepo-wide)
* **Finding:** In the workspace `glunity-mobile-y`, multiple configuration and package files contain raw Git merge conflicts.
* **Impact:** Syntactic failures during node package installation and bundling. 
* **Affected Files & Lines:**
  * `api/src/app/app.js` (conflict block containing duplicate route declarations for locations, events, recipes).
  * `api/package.json` (conflict block on nodemon dev-dependencies).
  * `mobile/package.json`
* **Remediation:** Execute `node resolve-merge.js` to automatically parse, clean, and resolve conflict markers before proceeding with any local testing.

### 1.2 Empty Stub Code Files
* **Finding:** Several files are present in the directory tree but contain 0 bytes of code.
* **Impact:** Misleads developers/agents about feature implementation and creates dead-end references in express routing tables.
* **Affected Files:**
  * `api/src/app/modules/events/events.routes.js`
  * `api/src/app/bootstrap/socket.bootstrap.js`
* **Remediation:** Remove stub routing modules or raise explicit "501 Not Implemented" exceptions instead of empty router returns.

---

## 2. Security & Data Protection Audit

### 2.1 Lack of HTTP Security Middleware
* **Finding:** `api/src/app/config/security.js` is empty. Express does not load `helmet`.
* **Impact:** Express responses lack standard HTTP security headers (e.g., `X-DNS-Prefetch-Control`, `X-Frame-Options`, `Strict-Transport-Security`, `X-Download-Options`, `Content-Security-Policy`). This exposes the application to clickjacking, mime-sniffing vulnerabilities, and cross-site scripting (XSS).
* **Remediation:** 
  1. Add `helmet` dependency.
  2. Implement configuration in `security.js`.
  3. Register middleware in `app.js` via `app.use(helmet())`.

### 2.2 Lack of Brute-Force Protection & Rate Limiting
* **Finding:** `api/src/app/config/rate-limit.js` is empty. There is no rate limiter configured.
* **Impact:** Auth endpoints (`/api/auth/login`, `/api/auth/register`, `/api/auth/forgot-password`) are vulnerable to brute-force credential stuffing and denial-of-service (DoS) attacks.
* **Remediation:**
  1. Add `express-rate-limit` dependency.
  2. Define throttling rules (e.g., max 5 requests per 15 minutes for auth, max 100 requests per minute for standard routes).
  3. Mount the rate limiters in `app.js`.

### 2.3 CORS IP Address Resilience in Dev
* **Finding:** [cors.js](file:///c:/Users/yassi/Glu10/glunity-mobile/api/src/app/config/cors.js#L5-L7) uses the following local origin helper:
  ```javascript
  function isAllowedLocalDevOrigin(origin) {
    return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
  }
  ```
* **Impact:** When testing the mobile app on a physical device over a local Wi-Fi network, the device communicates using the developer's local machine IP address (e.g., `http://192.168.1.5:8081`). This origin is rejected by CORS since it does not match the regex, blocking physical device verification.
* **Remediation:** Update the development CORS helper to also permit local subnet IP patterns (e.g., `192.168.x.x` or `10.x.x.x`).

### 2.4 Internal Schema Leakage in Error Handler
* **Finding:** [error.middleware.js](file:///c:/Users/yassi/Glu10/glunity-mobile/api/src/app/common/middleware/error.middleware.js#L13-L16) exposes raw Mongoose keys directly to the client:
  ```javascript
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    err = AppError.conflict(`${field} already exists`, 'DUPLICATE_KEY');
  }
  ```
* **Impact:** On validation failure or duplication, the exact database field names are sent to the client. This exposes schema layout details to malicious actors.
* **Remediation:** Map duplicate keys to user-friendly messages and sanitize output properties.

---

## 3. Network & State Management Audit (Mobile)

### 3.1 Concurrent Token Refresh Race Condition
* **Finding:** [http.client.ts](file:///c:/Users/yassi/Glu10/glunity-mobile/mobile/src/core/network/http.client.ts#L20-L43) uses a basic Axios response interceptor for token refresh handling:
  ```typescript
  if (error.response?.status === 401 && !original._retry) {
    original._retry = true;
    try {
      const refreshToken = await TokenStore.getRefreshToken();
      const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
      await TokenStore.setTokens(data.data.accessToken, data.data.refreshToken);
      original.headers.Authorization = `Bearer ${data.data.accessToken}`;
      return http(original);
    } catch {
      await TokenStore.clearTokens();
    }
  }
  ```
* **Line-by-Line Analysis:** When a screen mounts, it often fires multiple API calls simultaneously (e.g., `getMe()`, `listProducts()`, and `listRecipes()`).
  1. If the access token is expired, all three requests will fail with `401 Unauthorized` at the same time.
  2. Each request will trigger this interceptor.
  3. Because `original` is a local configuration object unique to each request, `!original._retry` evaluates to `true` for all three requests.
  4. Three concurrent `axios.post('/auth/refresh')` calls will be sent to the backend.
  5. The backend, enforcing single-use refresh token constraints or state changes, will reject the second and third requests.
  6. The interceptor catch block will execute, call `TokenStore.clearTokens()`, and immediately force-log the user out.
* **Remediation:** Implement a refresh lock and a request queuing system to serialize refreshes.

---

## 4. UI/UX & Theme System Audit

### 4.1 Theme Forcing Bug on Unauthenticated Screens
* **Finding:** [theme.context.tsx](file:///c:/Users/yassi/Glu10/glunity-mobile/mobile/src/shared/context/theme.context.tsx#L110-L130) forces Light Mode for unauthenticated users:
  ```typescript
  export function useTheme(): ThemeContextValue {
    const context = useContext(ThemeContext);
    let isAuthenticated = false;
    try {
      const auth = useAuth();
      isAuthenticated = auth.isAuthenticated;
    } catch (e) {}
    if (!isAuthenticated) {
      return {
        theme: LIGHT,
        isDark: false,
        setDark: context.setDark,
      };
    }
    return context;
  }
  ```
* **Line-by-Line Analysis:**
  1. The local state `isAuthenticated` controls what theme is returned.
  2. If the user is logging in, registering, resetting a password, or viewing the welcome screen, `isAuthenticated` is `false`.
  3. The hook overrides the actual context values (which contains the user's system preferences or AsyncStorage configuration) and forces `theme: LIGHT`.
  4. Once authentication succeeds, `isAuthenticated` switches to `true`, and the application suddenly snaps to Dark Mode if configured.
  5. This creates severe visual flashes on application boot.
* **Remediation:** Decouple `useTheme()` from `authContext`. The application should render the system/local preference on every screen regardless of the user's login state.

---

## 5. Database & Performance Audit

### 5.1 Geospatial & Text Index Query Incompatibility
* **Finding:** [locations.repository.js](file:///c:/Users/yassi/Glu10/glunity-mobile/api/src/app/modules/locations/locations.repository.js#L13-L25) builds queries containing both `$near` coordinates and `$text` searches:
  ```javascript
  if (typeof lng === 'number' && typeof lat === 'number') {
    query.location = {
      $near: {
        $geometry: { type: 'Point', coordinates: [lng, lat] },
        $maxDistance: radius || 5000,
      },
    };
  }
  if (search && search.trim()) {
    query.$text = { $search: search.trim() };
  }
  ```
* **Line-by-Line Analysis:** MongoDB text searches (`$text`) and geospatial `$near` queries both attempt to dictate index-level sorting/scoring. Combining them in a single query results in a database planner exception: `Cannot combine $near and $text`. 
* **Remediation:** If coordinates are provided alongside a keyword search, replace `$text` with a case-insensitive regex pattern matching the name or address fields:
  ```javascript
  if (search && search.trim()) {
    query.name = { $regex: search.trim(), $options: 'i' };
  }
  ```

### 5.2 Client-Side Filtering with Pagination Limits (Correctness Bug)
* **Finding:** [RecipesScreen.tsx](file:///c:/Users/yassi/Glu10/glunity-mobile/mobile/src/modules/recipes/ui/screens/RecipesScreen.tsx#L321-L337) retrieves recipes with a fixed limit and applies client-side filtering:
  ```typescript
  const fromApi = await recipesApi.list({ limit: 30 });
  ```
  ```typescript
  const filtered = useMemo(() => {
    const source = loaded && items.length > 0 ? items : MOCK_RECIPES;
    return source.filter((r) => r.category === activeCategory);
  }, [activeCategory, items, loaded]);
  ```
* **Line-by-Line Analysis:**
  1. The frontend asks the backend for the first 30 recipes.
  2. The frontend then discards recipes that do not match the active filter tab on the client-side.
  3. If there are 100 recipes in the database, and the first 30 are all under the 'tunisian' category, the 'quick' tab will render as completely empty, even if the database has 70 'quick' recipes.
* **Remediation:** Implement server-side filtering by passing `category` directly in the query parameters to the backend:
  ```typescript
  const fromApi = await recipesApi.list({ category: activeCategory });
  ```

### 5.3 Duplicate Slug Collision (Database Crash)
* **Finding:** [recipe.model.js](file:///c:/Users/yassi/Glu10/glunity-mobile/api/src/database/models/recipe.model.js#L127-L132) uses a pre-validate hook for slug generation:
  ```javascript
  recipeSchema.pre('validate', function preValidate(next) {
    if (!this.slug && this.title) {
      this.slug = slugifyTitle(this.title);
    }
    next();
  });
  ```
* **Line-by-Line Analysis:** Since `slug` is marked as `unique: true`, if two separate users create a recipe with the same title (e.g., "Tunisian Brik"), both will generate the exact same slug. Mongoose validation will succeed, but the database write will crash with a duplicate key error (code 11000).
* **Remediation:** Append a short random alphanumeric string (using `crypto`) to the slug if a collision is detected.

---

## 6. Actionable Remediation Checklist

### Milestone 1: Mobile Client Fixes
* [x] **Axios Lock**: Rewrite `http.client.ts` to implement single-flight request serialization for token refreshes. (Done)
* [x] **Theme Hook Decoupling**: Edit `theme.context.tsx` to remove the `isAuthenticated` check and return the configured theme globally. (Done)
* [x] **Server-side Recipe Filtering**: Modify `RecipesScreen.tsx` to pass the selected category to the API client during fetch. (Done)

### Milestone 2: Backend Security & Query Fixes
* [x] **Express Security Headers**: Install `helmet` and mount it globally in `app.js`. (Done)
* [x] **API Endpoint Rate Limiting**: Configure `express-rate-limit` on `/api/auth` endpoints. (Done)
* [x] **Geo-Text Search Query Fix**: Update `locations.repository.js` to replace `$text` queries with case-insensitive `$regex` matching when geographic search is active. (Done)
* [x] **Recipe Slug Collision Resilience**: Modify the pre-validate hook in `recipe.model.js` to append a unique seed. (Done)
* [x] **Pagination Caps**: Enforce a maximum cap of `100` on list inputs in `locations.schema.js` and `products.schema.js`. (Verified already present)