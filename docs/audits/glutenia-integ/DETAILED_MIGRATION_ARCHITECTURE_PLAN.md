# Detailed Migration Architecture Plan: Merging Glutenia into Glunity Mobile

**Document Version**: 4.0 (Updated with Seller Profile UI/Backend Merger Strategy)  
**Target Audience**: Development Team, Technical Leads & Client Decision Makers  
**Objective**: Architectural blueprint and step-by-step migration guide for integrating **Glutenia's AI Vision Scanner, E-Commerce Cart, Onboarding Survey, Gamification Badges, Seller Storefront & Stock Dashboard, Saved Favorites, and Scan History** into **Glunity Mobile** while preserving 100% strict TypeScript safety, Glunity's premium UI aesthetics, and performance integrity.

---

## User Review Required

> [!IMPORTANT]
> - **Core Foundation & UI Integrity**: **Glunity Mobile** remains the root production architecture (`mobile/src/modules/`, strict TypeScript, Socket.IO messaging).
> - **Seller Profile Merger**: Glunity's **`EditStoreScreen.tsx`** is preserved as the master UI for store management (animated cards, image picker, MapWebView). Glutenia's **Operating Hours** and **Store Categories** are merged into it to power `/api/establishments` map markers.
> - **Zero JS Policy**: All JavaScript (`.js`/`.jsx`) files from Glutenia will be converted to strict TypeScript (`.ts`/`.tsx`) during migration.
> - **Performance Guards**:
>   - Client-side image compression (`expo-image-manipulator`) max 1024px before AI OCR upload.
>   - Cart context scoped strictly to shop modules to prevent root component re-render cascades.
>   - Mongoose compound indexes on new `Order`, `ScanHistory`, and `Establishment` collections.

---

## Target Unified Directory & File Mapping

```
glunity-mobile/
├── api/
│   └── src/
│       └── app/
│           ├── modules/
│           │   ├── scan/                     [NEW MODULE - FROM GLUTENIA]
│           │   │   ├── scan.controller.js    (Groq AI Vision & Barcode logic)
│           │   │   ├── scan.routes.js        (POST /api/scan/label, GET /api/scan/history)
│           │   │   └── scan.service.js       (Llama-3-Vision prompt & OCR safety scoring)
│           │   ├── orders/                   [NEW MODULE - FROM GLUTENIA]
│           │   │   ├── order.controller.js   (Cart checkout & order state machine)
│           │   │   ├── order.routes.js       (POST /api/orders, GET /api/orders/my-orders)
│           │   │   └── order.service.js      (Stock reservation & delivery calculations)
│           │   ├── establishment/            [NEW MODULE - FROM GLUTENIA]
│           │   │   ├── establishment.controller.js (Seller store hours, phone, cover image)
│           │   │   └── establishment.routes.js (GET /api/establishments, PUT /api/establishments/my)
│           │   └── gamification/             [MODIFY - MERGE GLUTENIA RULES]
│           │       └── badge.rules.js        (15 predefined Glutenia badge triggers)
│           └── database/
│               └── models/
│                   ├── scan-history.model.js [NEW MODEL]
│                   ├── order.model.js        [NEW MODEL]
│                   └── establishment.model.js[NEW MODEL]
│
└── mobile/
    └── src/
        └── modules/
            ├── scanner/                      [NEW MODULE - FROM GLUTENIA]
            │   ├── api/
            │   │   ├── scanner.api.ts        (TypeScript API client for Groq vision endpoint)
            │   │   └── scanner.types.ts      (ScanResult, IngredientSafety, BarcodeProduct types)
            │   ├── hooks/
            │   │   └── useLabelScanner.ts    (Camera capture & AI analysis hook)
            │   └── ui/
            │       ├── screens/
            │       │   ├── LabelScanScreen.tsx   (AI OCR Ingredient Label Analysis)
            │       │   ├── BarcodeScanScreen.tsx (Camera Barcode Lookup)
            │       │   └── ScanHistoryScreen.tsx (Past Scan Verdicts History Audit)
            │       └── components/
            │           ├── SafetyBadge.tsx       (Safe / Caution / Danger visual pill)
            │           └── TriggerList.tsx       (Highlight detected wheat/barley/malt triggers)
            │
            ├── products/                     [EXTEND EXISTING MODULE]
            │   ├── context/
            │   │   └── CartContext.tsx       (Local cart state management & AsyncStorage cache)
            │   ├── hooks/
            │   │   └── useCart.ts            (AddToCart, RemoveFromCart, ClearCart actions)
            │   └── ui/
            │       ├── screens/
            │       │   ├── CartScreen.tsx        (Interactive Shopping Cart)
            │       │   ├── CheckoutScreen.tsx    (Address, Shipping & Order Summary)
            │       │   └── UserOrdersScreen.tsx  (Order History & Status Tracking)
            │       └── components/
            │           └── CartHeaderIcon.tsx    (Cart badge counter for navigation header)
            │
            ├── seller/                       [ENHANCE EXISTING MODULE]
            │   └── ui/
            │       └── screens/
            │           ├── EditStoreScreen.tsx           (RETAIN GLUNITY UI + Add Glutenia Hours/Category)
            │           └── SellerStatsScreen.tsx         (RETAIN GLUNITY UI + Add Low-Stock Alerts)
            │
            ├── map/                          [EXTEND EXISTING MODULE]
            │   └── ui/
            │       └── screens/
            │           └── FavoritePlacesScreen.tsx (Saved favorite gluten-free spots & routing)
            │
            └── auth/                         [EXTEND EXISTING MODULE]
                └── ui/
                    └── screens/
                        └── OnboardingSurvey.tsx (5-Step Patient Diagnostic & Diet Survey)
```

---

## Detailed Merger Workflows

### 1. Seller Establishment Profile Merger Workflow
* **UI**: Preserve Glunity's **`EditStoreScreen.tsx`** (animated cards, image uploaders, `MapWebView` pin picker).
* **Data Fields**: Add Glutenia's **Weekly Operating Hours** picker and **Store Category** (Supermarket, Bakery, Restaurant, Health Store, Bio Store).
* **Backend**: Save to `/api/establishments/my` so store profiles immediately populate map markers for celiac users.

### 2. Seller Sales & Stock Alert Workflow
* **UI**: Enhance Glunity's **`SellerStatsScreen.tsx`** with Glutenia's **Low-Stock Warning Banner** (alerting when product stock ≤ 5 units) and order revenue counters.

### 3. Products & E-Commerce Cart Workflow
`ProductsMarketScreen` → `ProductDetailScreen` ("Add to Cart") → `CartScreen` → `CheckoutScreen` → Order placed in DB and notified to seller.

### 4. Patient Onboarding Survey Workflow
Registration as Celiac Patient → 5-Step Health Survey (Diagnosis, Journey, Diet Goal, Eating Out, Confidence) → Personalizes Home Feed.

### 5. Scan History Audit Log Workflow
User scans barcode or label image → Verdict saved in `ScanHistory` collection → User accesses `ScanHistoryScreen` to review past safety verdicts without re-scanning.

---

## Verification Plan

### Automated Tests
- `npm --workspace mobile run typecheck` — Verify 0 TypeScript compiler errors across all new modules.
- `npm --workspace api run test` — Run backend integration tests for `/api/scan`, `/api/orders`, and `/api/establishments` endpoints.

### Manual Verification
1. **Seller Store & Stock Alert**: Open `EditStoreScreen.tsx`, edit store hours and category, save to `/api/establishments/my`. Verify store pin appears on map. Lower product stock < 5, confirm low-stock banner appears in `SellerStatsScreen.tsx`.
2. **AI Vision Scan & History**: Snap photo of ingredient label, verify Groq safety verdict, confirm scan appears in `ScanHistoryScreen`.
3. **Favorites Manager**: Save restaurant on map, open `FavoritePlacesScreen`, verify spot appears with emoji and tap to navigate.
