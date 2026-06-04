# Performance and UX Audit Report: Glunity Mobile & API

This audit analyzes the performance bottlenecks causing slow image loading, delayed page transitions, and occasional UI freezes in the Glunity application. It provides concrete diagnoses and actionable optimization strategies across the entire stack.

---

## 1. Executive Summary
During local development and testing, page loading delays and sluggish image rendering arise from a combination of **uncached assets**, **unoptimized API payloads**, **frequent polling loops triggering rate limiters**, and **JS thread blocking during complex render phases**. 

Implementing caching layers, paginated endpoint projections, layout reuse, and throttled network cycles will bring transitions under 100ms and make image loading instantaneous.

---

## 2. Deep Dive: Image Rendering Performance

### The Problems
1. **Fallback to Standard Caching**: 
   In `FastImageWrapper.tsx`, if the native dependency `react-native-fast-image` is missing or fails (common in Expo Go), the component falls back to the standard React Native `<Image />`. Standard `<Image />` on Android does not cache network images on disk aggressively, forcing the device to re-download remote assets on every component mount.
2. **Local Metro Bundler Latency**: 
   When using local image assets (e.g. `require('assets/Logo/image 1.png')`), Expo retrieves files over HTTP from the Metro development server. Each request incurs Metro compiling overhead (100ms–800ms) during dev mode.
3. **High-Resolution Remote URLs**:
   Image assets fetched from external hosts (like Unsplash) are often requested at high resolutions (e.g., `w=600`, `w=800` or raw), forcing the client to download megabytes of uncompressed binary data and spend CPU cycles decoding them in memory.
4. **Lack of Layout Placeholders**:
   Image wrappers render blank spaces while downloading. When the image is finally resolved, it causes visual layout shifts (stuttering) and pops in abruptly.

### Actionable Solutions
* **Leverage Expo Image**: 
  Instead of fallback `<Image />`, use [`expo-image`](https://docs.expo.dev/versions/latest/sdk/image/), which is cross-platform, handles disk caching automatically, supports blurhash placeholders, and has superior memory management on both iOS and Android.
* **Asset Optimization (Dimensions and Format)**:
  Append strict dimension limits to all Unsplash and remote URLs (e.g., `w=200&h=200&fit=crop` for list thumbnails instead of full sizes). Convert static assets to optimized formats like WebP.
* **Preloading Key Media**:
  Preload static screens/assets (e.g., onboarding steps, splash logos, and main tabs icons) during the `SplashScreen` animation phase.

---

## 3. Deep Dive: Page Loading & API Latency

### The Problems
1. **Over-fetching Heavy Payload Fields**:
   In `patient-resources.service.js`, the `listArticles` query requests full documents from MongoDB. This includes the massive clinical `body` text for every single article, despite the list view only displaying the `title`, `excerpt`, and `category`. Transmitting large strings over HTTP increases parse time and payload size.
2. **Missing Database Indexes**:
   Queries inside the database repository search by fields like `category`, `isFeatured`, or `userId`. Without explicit database indexes on these filter criteria in MongoDB, the database must perform full-collection scans, causing queries to slow down exponentially as content grows.
3. **Aggressive Network Polling & CORS Blocks**:
   The notifications component polled `http://localhost:5000/api/notifications` every 5 seconds. In multi-window development, this quickly exceeded the backend's rate limits (`max: 300` per minute), throwing HTTP `429 Too Many Requests`. Since the CORS middleware sat *after* the rate-limiter, the rate-limiting response lacked CORS headers, freezing the browser/client request stack and triggering system-wide delays.

### Actionable Solutions
* **API Fields Projection**:
  Modify the backend queries to select only the fields needed for the list view (e.g., exclude `body` from `findMany` queries for listing cards). 
  ```javascript
  // Example projection in repository:
  db.collection('articles').find({}, { projection: { body: 0 } });
  ```
* **Database Indexing**:
  Create indexes on heavily queried columns:
  ```javascript
  db.collection('articles').createIndex({ category: 1, isFeatured: 1 });
  db.collection('notifications').createIndex({ userId: 1, isRead: 1 });
  ```
* **Optimized Polling & Push Notifications**:
  Increase polling intervals (which we updated to 15s) or replace polling entirely with lightweight WebSocket events or push notification tokens (Firebase Cloud Messaging/Expo Push).

---

## 4. Deep Dive: Frontend Layout & Rendering Thread

### The Problems
1. **Dynamic Parsing on Render**:
   In `PatientResourcesScreen.tsx`, article paragraphs are dynamically split and parsed (`bodyText.split('\n\n')`) directly inside the main component rendering cycle. Re-rendering the list or scrolling causes the parser to re-run synchronously, blocking the JavaScript thread.
2. **ScrollView Overuse**:
   Large lists are rendered inside generic `<ScrollView>` components instead of `<FlatList>`. In React Native, `<ScrollView>` mounts all children immediately, consuming massive memory and causing long initial page load times.
3. **Inline Styles and Arrow Functions**:
   Using inline functions like `onPress={() => navigate(...)` inside listing maps forces React to recreate callback instances on every single render pass, invalidating child components' memoization.

### Actionable Solutions
* **Migrate to FlatList**:
  Replace dynamic mapping in ScrollViews with `<FlatList />` utilizing `getItemLayout` and `windowSize` to ensure only visible items are loaded in memory.
* **Component Memoization**:
  Wrap list items in `React.memo` and use `useCallback` for event handlers so that scroll updates don't trigger cascading renders of unchanged cards.
* **Pre-parse Markdown Content**:
  Cache parsed markdown layouts or do formatting operations once when the data is first received from the API, rather than on every render cycle.

---

## 5. Summary Checklist of Next Steps

| Domain | Issue | Solution | Priority |
| :--- | :--- | :--- | :--- |
| **Frontend** | Uncached Image Fallback | Replace standard React Native `Image` with `expo-image` | High |
| **API** | Huge Payloads | Project out the `body` field from article index queries | High |
| **Database** | Full collection scans | Add MongoDB indexes on `category`, `isFeatured`, and `isRead` | Medium |
| **Frontend** | Slow scroll lists | Convert article lists from `ScrollView` to `FlatList` | Medium |
| **Frontend** | Heavy render parsing | Memoize list cards and offload text split parsing from render loop | Medium |
