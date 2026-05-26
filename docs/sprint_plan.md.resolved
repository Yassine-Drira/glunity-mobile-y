# Glunity Mobile — Sprint 2 Plan
**Duration:** 7 days · **Capacity:** 3 devs × 4h/day = **84 hours total**
**Date:** May 25 – May 31, 2026

---

## Gap Analysis vs README

| Layer | Status |
|---|---|
| BE: Auth module (register/login/refresh/forgot/reset/verify) | ✅ Done |
| BE: Users module (PATCH /api/users/me) | ✅ Done |
| BE: User model (Mongoose, full schema) | ✅ Done |
| BE: Middleware (auth, role, validation, error, requestId) | ✅ Done |
| BE: Email service (SMTP via Nodemailer) | ✅ Done |
| FE: Auth screens (Splash, Intro, Welcome, Login, Register, ForgotPw, ResetPw, EmailVerified) | ✅ Done |
| FE: Auth context + SecureStore token management | ✅ Done |
| FE: Home screen (mock data, no API) | ⚠️ Partial |
| FE: Profile/Settings/EditProfile screens | ✅ Done |
| FE: Bottom Tab Navigator | ❌ Missing |
| BE: Location model + `/api/locations` routes | ❌ Empty stub |
| BE: Recipe model + `/api/recipes` routes | ❌ Empty stub |
| BE: Product model + `/api/products` routes | ❌ Empty stub |
| BE: Events, Channels, Seller, Notifications, Badges, Reviews, Search | ❌ All empty stubs |
| FE: Map screen | ❌ Empty stub |
| FE: Recipe catalog + detail screens | ❌ Empty stub |
| FE: Events, Community, Products, Search, Seller screens | ❌ All empty stubs |
| DB: All models except `user.model.js` | ❌ Empty stubs |
| App.js: Only `/api/auth` and `/api/users` registered | ❌ All other routes unmounted |

> **Conclusion:** Sprint 1 is ~70% complete. Sprint 2 starts now. This sprint delivers the Map and Recipe modules end-to-end with real API integration and replaces all mock data on the Home screen.

---

## Team

| ID | Name | Role | Focus |
|---|---|---|---|
| **YD** | Yassine Drira | Scrum Master + Dev | Backend (Node.js / Mongoose) |
| **D2** | Developer 2 | Developer | React Native screens (Figma) |
| **D3** | Developer 3 | Developer | React Native + API integration |

---

## Sprint Goal

> **"A user can open the app, see their real profile data on the Home screen, discover nearby GF-safe locations on the interactive map, and browse the recipe catalog — all connected to the live API."**

---

## ⚠️ Blockers to Resolve Before Day 1

| # | Blocker | Owner | Action |
|---|---|---|---|
| B-01 | `react-native-maps` not in `mobile/package.json` | D2 | `npm install react-native-maps` inside `mobile/` on Day 1 morning |
| B-02 | `AppNavigator` has no tab navigator — only a stack | D3 | Build tab navigator on Day 1 (SP2-D3-01) |
| B-03 | Home screen uses 100% mock data — no API calls | D3 | Wire to real API on Day 1–2 (SP2-D3-02) |
| B-04 | All new BE routes not registered in `app.js` | YD | Register after implementing each module |

---

## Engineering Standards (non-negotiable on every task)

- **Backend:** Every route must have: Joi/express-validator schema → `validate` middleware → `asyncHandler` → service → repository. No DB queries in controllers.
- **Backend:** Every new model file must export the Mongoose model and define all indexes described in the README.
- **Backend:** All new routes registered in `app.js` immediately after implementation — never left unmounted.
- **Frontend:** No `fetch` or `axios` in screen files — all API calls go through `src/core/services/` or `src/modules/*/api/` layer.
- **Frontend:** Every screen must handle 3 states: **loading** (ActivityIndicator), **error** (user-friendly message), **empty** (meaningful UI).
- **Frontend:** No hardcoded strings — all text via i18n keys (even if translations are FR-only for now).
- **Git:** One branch per task: `feature/SP2-YD-01-location-model`. PR before merging to `develop`. No self-merges.
- **Testing:** Each BE endpoint manually tested in Postman before PR. Screenshot of passing tests in PR description.

---

## YD — Backend (28 hours)

### Day 1 (4h) — Location Model + Schema
**Task SP2-YD-01 · `feature/SP2-YD-01-location-model`**

Implement `api/src/database/models/location.model.js`:
```js
// Fields required per README:
name, type (enum: restaurant|bakery|shop|pharmacy|other),
address, coordinates (GeoJSON Point), phone, openingHours,
isVerified (bool), addedBy (ref: User), averageRating,
reviewCount, views, mapClicks
// Indexes required:
LocationSchema.index({ coordinates: '2dsphere' })
LocationSchema.index({ addedBy: 1 })
LocationSchema.index({ isVerified: 1 })
```
Also implement `api/src/database/models/review.model.js`:
```js
// Fields: locationId (ref), userId (ref), rating (1-5),
// text, isVerified, createdAt
// Indexes: { locationId: 1 }, { userId: 1 }
```

**Acceptance Criteria:**
- [ ] `location.model.js` exports Mongoose model with 2dsphere index
- [ ] `review.model.js` exports Mongoose model with both indexes
- [ ] `mongoose.connection` does not throw on startup

---

### Day 2 (4h) — Locations Module (GET list + GET detail)
**Task SP2-YD-02 · `feature/SP2-YD-02-locations-read`**

Implement full module stack for reading locations:
- `locations.schema.js` — validate `GET /locations` query params: `lat` (float), `lng` (float), `radius` (number, default 5000m), `type` (optional enum)
- `locations.repository.js` — `findNearby({ lat, lng, radius, type })` using `$near` + `$maxDistance`; `findById(id)` with populated reviews
- `locations.service.js` — `getNearby(dto)`, `getById(id)`, update `views` counter on `getById`
- `locations.controller.js` — `list`, `getOne`
- `locations.routes.js` — `GET /` and `GET /:id` both behind `authMiddleware`
- Register in `app.js`: `app.use('/api/locations', locationsRoutes)`

**Acceptance Criteria:**
- [ ] `GET /api/locations?lat=36.8&lng=10.18&radius=3000` returns paginated array
- [ ] `GET /api/locations/:id` returns location + reviews array + increments `views`
- [ ] Invalid lat/lng returns `400` with clear message
- [ ] Missing auth returns `401`

---

### Day 3 (4h) — Locations Write + Reviews Module
**Task SP2-YD-03 · `feature/SP2-YD-03-locations-write-reviews`**

- `POST /api/locations` — create a new location pin (any auth user)
  - Validate: name (required), type (enum), coordinates (`[lng, lat]` array)
- `POST /api/locations/:id/reviews` — submit a review
  - Validate: rating (1–5 int), text (optional, max 500 chars)
  - After saving review: recalculate `averageRating` and `reviewCount` on the location document using `$inc` / aggregation
- Mount reviews routes nested under locations in `app.js`

**Acceptance Criteria:**
- [ ] `POST /api/locations` with valid body → 201 + location object
- [ ] `POST /api/locations` with missing name → 400
- [ ] `POST /api/locations/:id/reviews` → 201 + updates `averageRating` on parent
- [ ] Duplicate review from same user on same location → 409

---

### Day 4 (4h) — Recipe Model + Module (read-only)
**Task SP2-YD-04 · `feature/SP2-YD-04-recipes`**

Implement `api/src/database/models/recipe.model.js`:
```js
// Fields per README:
title, category (enum: tunisian|easy|quick|all),
ingredients (array of strings), steps (array of strings),
nutritionInfo { calories, protein, carbs, fat },
photos (array of Cloudinary image sub-docs),
authorId (ref: User), favoritedBy (array of ref: User),
createdAt/updatedAt (timestamps)
// Indexes: text index on (title), { category: 1 }, { authorId: 1 }
```

Then implement full recipes module:
- `GET /api/recipes?category=&search=&page=&limit=` — filtered, paginated list
- `GET /api/recipes/:id` — full recipe detail
- `POST /api/recipes/:id/favorite` — toggle favorite (add/remove userId from `favoritedBy`)
- Register: `app.use('/api/recipes', recipesRoutes)`

**Acceptance Criteria:**
- [ ] `GET /api/recipes` returns paginated list with `{ data, pagination }` envelope
- [ ] `GET /api/recipes?search=pizza` uses text index
- [ ] `POST /api/recipes/:id/favorite` toggles correctly and is idempotent
- [ ] `GET /api/recipes/:id` returns `isFavorited: true/false` for the requesting user

---

### Day 5 (4h) — Product Model + Module
**Task SP2-YD-05 · `feature/SP2-YD-05-products`**

Implement `api/src/database/models/product.model.js`:
```js
// Fields: name, category, sellerId (ref: User),
// images (Cloudinary array), isGlutenFree (bool),
// certifiedGF (bool), ingredients (string[]), price (number)
// Indexes: text index on (name), { sellerId: 1 }, { certifiedGF: 1 }
```

Implement products module:
- `GET /api/products?category=&certified=&page=&limit=` — filtered list
- `POST /api/products` — create product (role: `pro_commerce` only, use `role.middleware.js`)
- Register in `app.js`

**Acceptance Criteria:**
- [ ] `GET /api/products` returns paginated list
- [ ] `POST /api/products` by non-pro_commerce user → 403
- [ ] `POST /api/products` by pro_commerce user with valid body → 201

---

### Day 6 (4h) — Home Data Endpoint + Notifications Model
**Task SP2-YD-06 · `feature/SP2-YD-06-home-endpoint`**

Create `GET /api/home` — aggregated endpoint for the Home screen:
```js
// Returns:
{
  user: { ...user.toPublic() },       // from req.user
  recentRecipes: [...],               // 3 latest recipes
  upcomingEvents: [...],              // 2 soonest events (stubs ok)
  nearbyLocationsCount: number        // count within 10km of user's last coords
}
```

Also implement `api/src/database/models/notification.model.js`:
```js
// Fields: userId (ref), type (string), title, body,
// data (Mixed), isRead (bool, default false), createdAt
// Indexes: { userId: 1, isRead: 1 }, { createdAt: -1 }
```

And `GET /api/notifications?page=` + `PUT /api/notifications/:id/read` — mount in app.js.

**Acceptance Criteria:**
- [ ] `GET /api/home` returns all 4 keys with correct data
- [ ] `GET /api/notifications` returns paginated list for current user only
- [ ] `PUT /api/notifications/:id/read` flips `isRead` to true, returns 200
- [ ] Trying to read another user's notification → 403

---

### Day 7 (4h) — Code Review + PR Merges + Bug Fixes
**Task SP2-YD-07**

- Review all D2 and D3 PRs, leave inline comments
- Fix any blockers surfaced during sprint
- Write seed script `api/src/database/seeds/locations.seed.js` with 5 Tunisian GF locations for local testing
- Verify all 6 new route groups are mounted and tested end-to-end
- Update `api/README.md` with new endpoints

**Acceptance Criteria:**
- [ ] All 5 PRs reviewed and merged to `develop`
- [ ] Seed script populates DB with test data via `node scripts/seed.js`
- [ ] `GET /health` still returns 200 with all new modules loaded
- [ ] Zero unhandled promise rejections in server logs

---

## D2 — Frontend / Screens (28 hours)

### Day 1 (4h) — Install Maps + Tab Navigator Base
**Task SP2-D2-01 · `feature/SP2-D2-01-tab-navigator`**

```bash
# Inside mobile/
npm install react-native-maps
```

Refactor `AppNavigator.tsx` into a bottom-tab navigator with 5 tabs:

| Tab | Screen | Icon |
|---|---|---|
| Home | HomeScreen | home-outline |
| Map | MapScreen (placeholder View) | map-outline |
| — | FAB (center button, no screen) | qr-code-outline |
| Events | EventsScreen (placeholder View) | calendar-outline |
| Profile | ProfileScreen | person-outline |

Use `BottomNavBar.tsx` (already exists in `shared/components/`) as the `tabBar` renderer.

**Acceptance Criteria:**
- [ ] App launches and shows 5-tab bottom bar
- [ ] All tabs navigate without crash
- [ ] Active tab is highlighted correctly per Figma design tokens

---

### Day 2–3 (8h) — Map Screen
**Task SP2-D2-02 · `feature/SP2-D2-02-map-screen`**

Create `mobile/src/modules/map/ui/screens/MapScreen.tsx`:
- Render `MapView` (react-native-maps) filling the screen with the user's current location as initial region
- Call `GET /api/locations?lat=&lng=&radius=5000` on mount using a `useLocations` hook in `mobile/src/modules/map/api/`
- Render a `Marker` for each location — green if `isVerified`, grey otherwise
- Render a filter bar (FlatList horizontal) with type filters: All / Restaurant / Bakery / Shop / Pharmacy — tapping re-fetches with `?type=`
- Show loading spinner over map while fetching
- Show error snackbar if fetch fails

**Acceptance Criteria:**
- [ ] Map renders with user location on iOS simulator and Android emulator
- [ ] Pins appear from live API data
- [ ] Filter bar changes pins correctly
- [ ] Empty state: "No GF locations found nearby" text if 0 results
- [ ] Tapping a pin navigates to `LocationDetailScreen` (stub screen is fine)

---

### Day 4 (4h) — Location Detail Sheet
**Task SP2-D2-03 · `feature/SP2-D2-03-location-detail`**

Create `mobile/src/modules/map/ui/screens/LocationDetailScreen.tsx`:
- Call `GET /api/locations/:id`
- Show: name, type badge, address, phone (tap to call), opening hours, certified badge if `isVerified`
- Show `averageRating` as star row and `reviewCount`
- Show reviews list (FlatList, max 10)
- Show "Write a Review" button → modal with rating (1–5 star tap) + optional text input → `POST /api/locations/:id/reviews`

**Acceptance Criteria:**
- [ ] Detail screen loads from API (not navigation params)
- [ ] Certified badge only shows when `isVerified === true`
- [ ] Review submission triggers list refresh
- [ ] Phone number is tappable (`Linking.openURL('tel:...')`)

---

### Day 5–6 (8h) — Recipe Catalog + Detail
**Task SP2-D2-04 · `feature/SP2-D2-04-recipes`**

Create `mobile/src/modules/recipes/ui/screens/RecipeCatalogScreen.tsx`:
- Call `GET /api/recipes?page=1&limit=12` with infinite scroll (`FlatList` + `onEndReached`)
- Category filter tabs: Tous / Tunisien / Facile / Rapide
- Search bar → debounced (300ms) `?search=` query
- Recipe card: image, title, category badge, favorite icon

Create `mobile/src/modules/recipes/ui/screens/RecipeDetailScreen.tsx`:
- Call `GET /api/recipes/:id`
- Show: image hero, title, nutrition strip (calories/protein/carbs/fat), ingredients list, steps list with step numbers
- Floating favorite button → `POST /api/recipes/:id/favorite`

**Acceptance Criteria:**
- [ ] Infinite scroll loads next pages correctly
- [ ] Search debounces and does not fire on every keystroke
- [ ] Category filter re-fetches with correct param
- [ ] Favorite button shows filled/outline state based on `isFavorited`
- [ ] All loading / error / empty states handled

---

### Day 7 (4h) — Polish + PR Review
**Task SP2-D2-05**

- Add `react-native-maps` types and fix any TypeScript errors
- Ensure all new screens are registered in navigation types (`types.ts`)
- Connect Map and Recipes tabs in the bottom navigator to the real screens
- Review D3's PRs

**Acceptance Criteria:**
- [ ] Zero TypeScript errors (`tsc --noEmit`)
- [ ] All new screens reachable from tab navigator
- [ ] PR merged to `develop`

---

## D3 — Frontend Integration + Home API (28 hours)

### Day 1 (4h) — Wire Home Screen to Real API
**Task SP2-D3-01 · `feature/SP2-D3-01-home-api`**

Replace all mock data in `AppNavigator.tsx` / `homeData.ts` with real API calls:

1. Create `mobile/src/modules/home/api/home.service.ts`:
```ts
// GET /api/home → HomeData type
export const fetchHomeData = () => http.get<HomeData>('/home');
```
2. Create `mobile/src/modules/home/state/useHome.ts` hook:
```ts
// Returns: { data, isLoading, error, refetch }
```
3. Refactor `HomeScreen.tsx` to consume the hook — remove all mock props from `AppNavigator.tsx`
4. Pass real `navigation.navigate` callbacks from navigator into the screen for quick-access items

**Acceptance Criteria:**
- [ ] Home screen shows the logged-in user's real name and avatar
- [ ] Recipes section shows last 3 recipes from API
- [ ] Events section shows next 2 events (can be empty state if none)
- [ ] Pull-to-refresh works
- [ ] HomeScreen.tsx has no direct reference to `homeData.ts` mock data

---

### Day 2–3 (8h) — Profile API Integration
**Task SP2-D3-02 · `feature/SP2-D3-02-profile-api`**

Wire the existing Profile, Settings, and EditProfile screens to real API:

1. Create `mobile/src/modules/profile/api/profile.service.ts`:
```ts
export const getMe = () => http.get('/auth/me');
export const updateMe = (data: Partial<UpdateMeDto>) => http.patch('/users/me', data);
```
2. Create `useProfile` hook
3. `ProfileScreen` — load real user data from `getMe()`
4. `EditProfileScreen` — submit calls `updateMe()` → on success, refetch auth context user
5. `SettingsScreen` — dark mode toggle persists via `updateMe({ darkMode: true })`

**Acceptance Criteria:**
- [ ] Profile screen displays real name, email, profileType, streakDays
- [ ] Edit profile save calls `PATCH /api/users/me` and reflects changes immediately
- [ ] Dark mode toggle persists across app restarts (stored in backend + re-fetched on login)
- [ ] Avatar upload button exists (can show "coming soon" toast — Cloudinary is Sprint 3)

---

### Day 4 (4h) — Shared API Layer Cleanup
**Task SP2-D3-03 · `feature/SP2-D3-03-api-layer`**

Enforce the service-layer architecture across all modules:

1. Audit all existing screens — ensure zero inline `axios`/`http` calls in `.tsx` files
2. Create base types in `mobile/src/shared/types/api.types.ts`:
```ts
export interface ApiResponse<T> { success: boolean; data: T; message?: string }
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: { page: number; limit: number; total: number; totalPages: number }
}
```
3. Create `mobile/src/shared/hooks/useApiCall.ts` — generic hook wrapping async API calls with `isLoading`, `error`, `data`, `execute`
4. Create `mobile/src/shared/utils/handleApiError.ts` — extracts user-friendly message from Axios error

**Acceptance Criteria:**
- [ ] `useApiCall` is used in at least Home and Profile hooks
- [ ] No direct `axios` or `http` imports in any `Screen.tsx` file
- [ ] `handleApiError` returns localized string for `401`, `403`, `404`, `500`, network error

---

### Day 5–6 (8h) — Events Screen (list + attend)
**Task SP2-D3-04 · `feature/SP2-D3-04-events-screen`**

> Note: This task is frontend-only. YD will deliver the events API by Day 5 EOD if time permits — otherwise use an empty-state placeholder and wire up on Day 6.

Create `mobile/src/modules/events/ui/screens/EventsListScreen.tsx`:
- Tab bar: Meetups / Classes / Webinars
- Call `GET /api/events?type=&page=`
- Event card: image, title, date chip, location, capacity indicator
- "Attend" button → `POST /api/events/:id/attend`

Create `mobile/src/modules/events/api/events.service.ts` and `useEvents` hook.

**Acceptance Criteria:**
- [ ] Three tab filters work
- [ ] Attend button is disabled after registration (optimistic update)
- [ ] Empty state: "No upcoming events" with icon
- [ ] Loading skeleton or ActivityIndicator while fetching

---

### Day 7 (4h) — Notifications Bell + Sprint Review Prep
**Task SP2-D3-05 · `feature/SP2-D3-05-notifications`**

1. Wire the notification bell on HomeScreen:
   - Call `GET /api/notifications?page=1&limit=20` when bell is tapped
   - Show count badge if there are unread notifications
   - Notification list in a bottom sheet / modal
   - Tap notification → `PUT /api/notifications/:id/read`

2. Prepare sprint review demo:
   - Ensure `develop` branch builds without errors
   - Write brief demo script (which flows to show PO)

**Acceptance Criteria:**
- [ ] Unread badge count updates after marking as read
- [ ] Notification list shows `title`, `body`, timestamp
- [ ] `develop` branch: `expo start --web` loads without crash
- [ ] PR merged to `develop`

---

## Daily Standup Template

Each morning (max 15 min), each dev answers:
1. What did I complete yesterday? (reference task ID)
2. What will I do today? (reference task ID)
3. Any blockers?

---

## Sprint Review Checklist (Day 7 EOD)

| Item | Owner |
|---|---|
| Demo: Register → Login → Home (real data) | YD |
| Demo: Navigate to Map → see pins → open detail | D2 |
| Demo: Browse Recipe catalog → open detail → favorite | D2 |
| Demo: Edit profile → see changes on Home | D3 |
| Demo: Notifications bell → mark as read | D3 |
| All PRs merged to `develop` | All |
| Zero critical bugs open | All |
| PO validation sign-off | Sirine |

---

## Sprint 3 Preview (what comes next)

- Community (Socket.io chat channels) — SP3-YD-01–03
- Cloudinary avatar upload — SP3-D2-01
- Seller dashboard (analytics screen) — SP3-D2-02
- Product catalog screen — SP3-D3-01
- Push notifications (Expo FCM setup) — SP3-YD-04
- i18next internationalization setup — SP3-D3-02
