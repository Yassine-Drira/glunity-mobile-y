# Glunity Mobile — Setup Guide

This is a clone of [opopoptima/glunity-mobile](https://github.com/opopoptima/glunity-mobile)
with the **Collaborative Map** module fully implemented on both the backend
and the mobile app. Nothing else in the original code base was modified.

The project has two runnable parts:

| Folder    | What it is                                               |
| --------- | -------------------------------------------------------- |
| `api/`    | Node.js + Express + Mongoose (MongoDB Atlas) REST API    |
| `mobile/` | Expo React Native app (iOS + Android)                    |

---

## 1. Prerequisites

Install on your machine:

- **Node.js 18+** (recommended 20 LTS) — <https://nodejs.org>
- **npm** (bundled with Node) or **pnpm** / **yarn**
- **Git** (for cloning if needed)
- **Expo Go** app on your iPhone or Android (App Store / Play Store) — easiest way to test
- *(optional)* **Android Studio** for the Android emulator
- *(optional)* **Xcode** for the iOS Simulator (macOS only)

You do **not** need to install MongoDB locally — the project uses the MongoDB Atlas
cluster URI from the `.env` file.

---

## 2. Configure environment variables

`api/.env` is already included with the values you provided:

```
PORT=5000
NODE_ENV=development
APP_ORIGINS=http://localhost:8081,http://localhost:3000,http://10.0.2.2:8081,http://10.0.2.2:5000
MONGO_URI=mongodb+srv://...@glutenmobile.vxtr1qm.mongodb.net/glunity?appName=GlutenMOBILE
JWT_SECRET=anyrandomsecretkey123
REFRESH_SECRET=anotherrandoSecret456
ACCESS_TOKEN_EXPIRES=15m
REFRESH_TOKEN_EXPIRES=7d
```

The mobile app picks the API base URL from `mobile/src/core/config/api.config.ts`.
**Edit the IP** in `resolveDefaultApiBaseUrl()` to match your machine's LAN IP
(or use `http://10.0.2.2:5000/api` if you run the Android emulator). You can
also set it without code changes:

```bash
# from the mobile/ folder
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.42:5000/api npm start
```

---

## 3. Install dependencies

```bash
# Backend
cd api
npm install

# Mobile (in a separate terminal)
cd mobile
npm install
```

---

## 4. Seed the map with sample data (one-time)

```bash
cd api
node scripts/seed-locations.js
```

This inserts 6 demo gluten-free spots around Tunis (bakery, café, grocery,
restaurant, pharmacy + one with a contamination warning) so the map is not
empty on first launch.

---

## 5. Run the backend

```bash
cd api
npm run dev      # nodemon, auto-reloads on file changes
# ── or ──
npm start        # plain node
```

Expected output:

```
[INFO] MongoDB connected → ...
[INFO] 🚀 GlUnity API running { port: 5000, env: 'development', url: 'http://localhost:5000' }
```

Quick sanity check:

```bash
curl http://localhost:5000/health
curl 'http://localhost:5000/api/locations?limit=3'
curl 'http://localhost:5000/api/locations?lng=10.18&lat=36.80&radius=5000&category=bakery'
```

---

## 6. Run the mobile app

```bash
cd mobile
npm start
```

Expo dev server will print a QR code. Then either:

- Scan the QR code with **Expo Go** on your phone (same Wi-Fi as your computer), **or**
- Press `a` to open the **Android emulator**, **or**
- Press `i` to open the **iOS Simulator** (macOS only)

Log in (or register a new account) and tap the **Events** tab in the bottom
navigation — that opens the new collaborative map screen.

### Choosing the API host

| Where the app runs            | API URL                              |
| ----------------------------- | ------------------------------------ |
| iOS Simulator (Mac)           | `http://localhost:5000/api`          |
| Android Emulator              | `http://10.0.2.2:5000/api`           |
| Physical phone via Expo Go    | `http://<your-LAN-IP>:5000/api`      |

The simplest way is to set `EXPO_PUBLIC_API_BASE_URL` when starting Expo.

---

## 7. What was added (Map module only)

### Backend (`api/`)

- `src/database/models/location.model.js` — Mongoose schema with a GeoJSON
  Point and a 2dsphere index for `$near` queries.
- `src/app/modules/locations/` — full module:
  - `locations.routes.js`      → `GET /api/locations`, `GET /api/locations/:id`,
    `POST /api/locations` (auth-protected)
  - `locations.controller.js`  → request handlers
  - `locations.service.js`     → business logic
  - `locations.repository.js`  → DB queries (geo, category, certified, search)
  - `locations.mapper.js`      → response DTO
  - `locations.schema.js`      → express-validator chains
- `src/app/app.js` — registered `/api/locations` (only line of existing file
  changed).
- `scripts/seed-locations.js` — sample data seeder.

### Mobile (`mobile/`)

- `src/modules/map/api/locations.api.ts`              — typed client
- `src/modules/map/domain/location.types.ts`          — TS types
- `src/modules/map/ui/components/MapWebView.tsx`      — Leaflet inside a WebView
  (works in Expo Go on iOS + Android, no native rebuild needed)
- `src/modules/map/ui/components/FilterPill.tsx`      — floating "Filter" pill
- `src/modules/map/ui/components/PlaceCard.tsx`       — compact + detailed cards
  (matches both screens of the Figma)
- `src/modules/map/ui/screens/MapScreen.tsx`          — the full screen
- `src/navigation/AppNavigator.tsx`                   — added `Map` route
  and wired the existing **Events** tab to navigate there. The `BottomNavBar`
  component itself was **not** modified.
- `src/modules/auth/navigation/types.ts`              — added `Map` to the
  app stack param list.
- `package.json`                                      — added `react-native-webview`.

---

## 8. New REST endpoints

| Method | Path                       | Auth        | Description                                           |
| ------ | -------------------------- | ----------- | ----------------------------------------------------- |
| GET    | `/api/locations`           | public      | List places. Optional query params: `lng`, `lat`, `radius` (m), `category`, `glutenFree`, `certified`, `search`, `limit`, `skip` |
| GET    | `/api/locations/:id`       | public      | Get one place                                         |
| POST   | `/api/locations`           | Bearer JWT  | Create a new place. Body: `{ name, lng, lat, category, glutenFree, certified, contaminationWarning, address, city, country, phone, priceRange, description }` |

Categories: `restaurant`, `bakery`, `grocery`, `pharmacy`, `cafe`, `other`.

---

## 9. Troubleshooting

- **Mobile shows "Network Error"** → the phone cannot reach the API. Check
  the API URL (see section 6) and make sure your computer's firewall allows
  port 5000.
- **MongoDB connection error** → confirm the IP of the machine running the API
  is whitelisted in MongoDB Atlas (Network Access → Add IP).
- **Map is blank** → run the seed script (section 4) so there are markers.
- **"Cannot find module react-native-webview"** → `cd mobile && npm install`.
