# Glunity Mobile — Workspace Customizations & Engineering Rules

## 1. Glunity Graphic Identity & Visual Design Preservation Directive

When integrating code, API routes, or features from external repositories (e.g., Glutenia):

* **Preserve Glunity's Graphic Identity**: Always enforce Glunity's premium visual design system, color tokens (`useTheme()`), typography, dark mode support, and UI scaffolding (`AppScaffold`).
* **Zero Hardcoded Color Constants**: Never use raw hex colors (e.g., `#ffffff`, `#10B981`, `#000000`) inside component styles. All color values must reference `colors` from `useTheme()`.
* **Dark Mode & Light Mode Compliance**: Every new or migrated screen must adapt seamlessly to Light and Dark mode using Glunity's theme context (`useTheme()`).
* **RTL & Localization Compliance**: Use `useLanguage()` for internationalized text (`t(...)`) and RTL layout direction checks (`isRTL`).
* **UI Scaffolding**: Wrap all top-level screen components with `<AppScaffold>` or Glunity's standardized header bar to maintain uniform padding, status bar spacing, and safe area handling.

---

## 2. Feature Migration & Logic Extraction Protocol

* **Logic-Only Import**: Extract business logic, Mongoose models, Express controllers, state hooks, and API clients from external projects, but **discard external inline styles, raw layouts, and low-level JSX views**.
* **Strict TypeScript Standard (Zero JS Leakage)**:
  - All incoming JavaScript files (`.js`/`.jsx`) must be refactored into strict TypeScript (`.ts`/`.tsx`).
  - Declare explicit TypeScript interfaces for all component props, API request/response payloads, state objects, and navigation params.
  - Ban implicit `any` types in domain models and API handlers.
* **Feature Modularity**: Place migrated features inside Glunity's modular domain structure (`mobile/src/modules/<feature_name>/` and `api/src/app/modules/<feature_name>/`). Never create flat screen folders.

---

## 3. Performance, Memory & Architectural Guards

* **Client-Side Image Optimization**:
  - Before transmitting photo payloads to AI endpoints (e.g., Groq OCR Vision), compress and resize images to max 1024px width via `expo-image-manipulator`.
  - Prevents mobile memory bloat and keeps upload latency under 1.5 seconds.
* **Context State Isolation**:
  - Keep state providers scoped to relevant navigation sub-trees (e.g., `CartContext` scoped to `ProductsNavigator` and `ShopScreen`).
  - Prevent root-level context updates from causing re-render cascades in Home, Reels, or Socket.IO Messaging screens.
* **Database Query Performance**:
  - Enforce compound indexes on all new Mongoose schemas (e.g., `{ userId: 1, createdAt: -1 }` on `Order` and `ScanHistory`).
  - Avoid unindexed queries or unbounded `.find()` calls without pagination (`limit`).

---

## 4. Code Quality & Pre-Commit Verification Protocol

Before declaring any feature integration or bug fix complete:
1. Run `npm --workspace mobile run typecheck` to confirm **0 TypeScript compiler errors**.
2. Verify screen rendering in both **Light Mode** and **Dark Mode**.
3. Verify zero runtime warnings or unhandled promise rejections.
