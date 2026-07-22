# Comprehensive Comparative Analysis: Glunity Mobile vs. Glutenia

**Document Version**: 3.0 (Updated with Seller Profile Merger Architecture)  
**Target Audience**: Executive Stakeholders, Technical Leads & Client Decision Makers  
**Objective**: Provide an empirical, objective, and detailed evaluation of **Glunity Mobile** and **Glutenia** across all architectural, technical, functional, and operational axes to establish the optimal blueprint for the **Ultimate Unified Platform**.

---

## Executive Summary

Both **Glunity Mobile** and **Glutenia** address the same core mission: empowering celiac patients and gluten-intolerant individuals to navigate dietary safety, connect with community, find verified establishments, and buy certified gluten-free products.

* **Glunity Mobile** represents a **production-grade enterprise architecture** with strict TypeScript type safety, a modular domain-driven architecture (`modules/`, `core/`, `shared/`), real-time Socket.IO messaging microservices, TikTok-style Reels video feed, a feature-rich Super Admin Analytics Dashboard, and a beautifully designed **`EditStoreScreen.tsx`** with embedded Map pin pickers.
* **Glutenia** excels in **specialized AI domain features**, offering a functional **Groq AI Vision label scanner** (Llama-Vision OCR ingredient safety detection), an **interactive 5-step patient onboarding journey**, a complete **E-commerce cart & checkout system**, an expanded **gamification badge collection**, and structured establishment operating hours.

| Project Axis | Glunity Mobile | Glutenia | Winner / Advantage |
| :--- | :--- | :--- | :--- |
| **Language & Type Safety** | 100% Strict TypeScript | JavaScript (JSX) | **Glunity** (Zero runtime type errors) |
| **Architecture** | Feature Domain Modules (`modules/*`) | Screen-based flat layout (`screens/*`) | **Glunity** (Enterprise scalable) |
| **Real-time Engine** | Socket.IO Microservice (Port 5002) | Rest Polling / Basic Sockets | **Glunity** (Production ready) |
| **Seller Business Manager** | **Beautiful `EditStoreScreen.tsx` UI** | Basic Form | **Merged** (Glunity UI + Glutenia Hours/Map API) |
| **AI & Label Scanning** | Barcode Lookup mock | **Groq Llama-Vision Label Scanner** | **Glutenia** (High AI value) |
| **E-Commerce Flow** | Catalog display (no cart/checkout) | **Full Cart, Checkout & Orders API** | **Glutenia** (Complete buyer flow) |
| **Social Content** | **Reels Video Engine** (Capture/Feed) | Static image & text feeds | **Glunity** (Modern social engagement) |
| **Admin & Health Analytics**| **Super Admin Dashboard** (DAU/WAU/MAU, Clinical Insights) | Basic CRUD Tables | **Glunity** (Superior governance) |
| **Gamification & Badges** | XP System & Leaderboard | **15 Badges + Streak engine** | **Glutenia** (Broader badge library) |

---

## Seller Establishment & Business Profile Merger Strategy

> [!TIP]
> **UI & Frontend**: Retain Glunity's **`EditStoreScreen.tsx`** as the master interface. It features superior design aesthetics, animated inputs, cover/logo photo pickers, and an embedded `MapWebView` for pin positioning.  
> **Backend & Map Integration**: Enrich Glunity's `EditStoreScreen` with Glutenia's structured **Operating Hours (`open`, `close`, `daysClosed`)** and **Store Categories (`Supermarket`, `Bakery`, `Restaurant`, `Health Store`, `Bio Store`)** to feed establishment markers directly onto the interactive patient map.

```
┌────────────────────────────────────────────────────────────────────────┐
│                   GLUNITY `EditStoreScreen.tsx` UI                     │
│    (Beautiful animated cards, logo/cover upload, MapWebView pin picker) │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ├─── Enriched with Glutenia's:
                                    ├── 1. Weekly Operating Hours Picker
                                    ├── 2. Map Establishment Categories
                                    └── 3. /api/establishments Mongoose Persistence
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│             ULTIMATE SELLER STOREFRONT & MAP PROFILE SYSTEM            │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Complete Feature Integration Matrix (Glutenia Assets -> Glunity Integration)

| Feature | Glunity Mobile | Glutenia | Merger Implementation Strategy |
| :--- | :---: | :---: | :--- |
| **1. Seller Store Profile Manager** | ✅ **Superior UI (`EditStoreScreen`)** | ✅ Functional API | **Merged**: Keep Glunity UI + add Glutenia hours & categories to `/api/establishments`. |
| **2. Groq AI Label Scanner** | ❌ | ✅ **Implemented** | Port `scan.controller.js` and `LabelScanScreen.js` into `mobile/src/modules/scanner/`. |
| **3. E-Commerce Cart & Checkout** | ❌ (Catalog only) | ✅ **Implemented** | Port `CartScreen`, `CheckoutScreen`, and `Order` models into `modules/products/`. |
| **4. Onboarding Journey Survey**| ⚠️ Static | ✅ **Implemented** | Convert 5-step questionnaire into `modules/auth/ui/screens/OnboardingSurvey.tsx`. |
| **5. Gamification & Badges** | ✅ XP Leaderboard | ✅ **15 Badges Engine** | Merge 15 badge rules into Glunity's XP engine & profile badge wall. |
| **6. Seller Sales & Stock Dashboard** | ❌ | ✅ **Implemented** | Add low-stock alerts (stock ≤ 5) and sales metrics into Glunity's `SellerStatsScreen.tsx`. |
| **7. Saved Favorite Places ("Mes Lieux")** | ❌ | ✅ **Implemented** | Add `FavoritePlacesScreen.tsx` into `modules/map/` for one-tap spot bookmarking. |
| **8. Scan History Audit Log** | ❌ | ✅ **Implemented** | Add `ScanHistoryScreen.tsx` into `modules/scanner/` for past verdict reviews. |

---

## Strategic Recommendation

* **UI Preservation**: Never discard Glunity's custom UI components (`AppScaffold`, `InputCard`, `MapWebView`).
* **Backend Enrichment**: Connect Glutenia's Mongoose endpoints (`/api/establishments`, `/api/orders`, `/api/scan`) directly to Glunity's existing screens and data models.
