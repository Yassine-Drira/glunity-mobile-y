# Admin Home Dashboard — Complete Audit, Architecture & Redesign Specification

> **Phase:** 1 — Audit & Documentation Only  
> **Scope:** Admin Home Dashboard (`AdminHomeScreen.tsx`)  
> **Date:** 2026-07-21  
> **Status:** Awaiting Implementation Approval

---

## Table of Contents

1. [Part 1 — Complete Audit Report](#part-1--complete-audit-report)
2. [Part 2 — Architecture Recommendations](#part-2--architecture-recommendations)
3. [Part 3 — UX Recommendations](#part-3--ux-recommendations)
4. [Part 4 — UI Redesign Recommendations](#part-4--ui-redesign-recommendations)
5. [Part 5 — Database Mapping Recommendations](#part-5--database-mapping-recommendations)
6. [Part 6 — API Preparation Documentation](#part-6--api-preparation-documentation)
7. [Part 7 — Homepage Functional Specification](#part-7--homepage-functional-specification)
8. [Part 8 — Complete Widget Catalog](#part-8--complete-widget-catalog)
9. [Part 9 — Detailed KPI Catalog](#part-9--detailed-kpi-catalog)
10. [Part 10 — Charts & Visualizations Catalog](#part-10--charts--visualizations-catalog)
11. [Part 11 — Navigation Improvements](#part-11--navigation-improvements)
12. [Part 12 — Future Endpoint Specifications](#part-12--future-endpoint-specifications)
13. [Part 13 — Final Implementation Prompt](#part-13--final-implementation-prompt)

---

## Part 1 — Complete Audit Report

### 1.1 Current State Overview

The existing `AdminHomeScreen.tsx` is **757 lines** rendering a single flat `ScrollView` with no sectioning, no code-splitting, and no component architecture. It is essentially a single monolithic function component with inline styles.

---

### 1.2 Critical Issues Found

#### 🔴 Issue 1 — Hardcoded Sparkline Path (Fake Data)
**Location:** `AdminHomeScreen.tsx` L196–203  
**Problem:** The sparkline SVG path `d="M0,20 Q20,5 40,15 T80,8 T120,18 T160,5"` is a static hardcoded bezier curve. It does not represent any real data from the database. Regardless of how many users are registering, the chart always shows the exact same shape.  
**Why It Matters:** This actively misleads administrators. The chart appears analytical but provides zero information value.  
**Fix Required:** Replace with a computed path from real `registrations per day/week` data returned by the API.

---

#### 🔴 Issue 2 — Hardcoded Progress Bar Width for Seller Verification
**Location:** `AdminHomeScreen.tsx` L226  
**Problem:** `width: '85%'` is hardcoded as a string literal. It never changes.  
**Why It Matters:** If there are 0 verified sellers and 100 pending, the bar still shows 85% full — a complete fabrication.  
**Fix Required:** `width: \`${Math.round((verifiedSellersCount / Math.max(verifiedSellersCount + pendingSellersCount, 1)) * 100)}%\``

---

#### 🔴 Issue 3 — Approval Rate KPI Is Computed from Nonexistent Data
**Location:** `AdminHomeScreen.tsx` L74  
**Problem:** `qualityScore = stats?.approvalRatePercentage ?? 100`. The fallback is `100`, meaning if the API fails or returns no moderation history, the UI claims a perfect 100% quality score.  
**Why It Matters:** An admin seeing 100% approval rate assumes everything is fine. The fallback should be `null` with an empty state rendered.  
**Fix Required:** Null-guard with a meaningful empty state: `"Aucune donnée de modération disponible"`.

---

#### 🔴 Issue 4 — Weekly Activity Chart Uses Static/Fake Bar Heights
**Location:** `AdminHomeScreen.tsx` — Weekly Activity section  
**Problem:** The bar chart renders bars whose heights are computed from `weeklyActivity` data, but the bar chart logic clamps everything and there is no minimum/maximum normalization guard. An empty `weeklyActivityList` causes bars to render at height `0` or crash.  
**Why It Matters:** The chart collapses silently when no data is present.  
**Fix Required:** Add explicit empty state + safe normalization (`maxBarVal = Math.max(...values, 1)`).

---

#### 🔴 Issue 5 — Content Pipeline Uses Hardcoded Percentages
**Location:** `AdminHomeScreen.tsx` — "Pipeline des Contenus Soumis"  
**Problem:** The percentages shown (Événements 45%, Reels 30%, Produits 15%, Recettes 10%) come from `contentCategories` but the rendering logic maps them to static bar widths without ensuring they sum to 100 or match actual moderation queue data.  
**Why It Matters:** Content type percentages may be pulled from total published content, not from pending moderation queue — the section title says "submitted pipeline" but the data source is content totals.  
**Fix Required:** Ensure the API clearly distinguishes between `totalPublished.byCategory` and `pendingModeration.byCategory`.

---

#### 🟡 Issue 6 — No Auto-Refresh Mechanism
**Problem:** The dashboard only refreshes on user pull-to-refresh. There is no `setInterval` or auto-refresh.  
**Why It Matters:** An admin dashboard should show near-real-time data (e.g., moderation queue draining, users registering). Stale data can cause missed moderation actions.  
**Fix Required:** Implement a 60-second auto-refresh using `useEffect` cleanup with `setInterval`.

---

#### 🟡 Issue 7 — No Last Sync Timestamp
**Problem:** The UI never shows when data was last fetched. After a pull-to-refresh the admin has no confirmation.  
**Fix Required:** Add `lastSyncAt: Date` state, display `"Mis à jour il y a X min"` below the period selector.

---

#### 🟡 Issue 8 — No Error State UI
**Problem:** On API failure (L40), the error is only `console.error`-logged. The screen renders blank with no feedback to the admin.  
**Fix Required:** Add `error` state → render a full-screen error card with retry button.

---

#### 🟡 Issue 9 — Loading Skeleton Is a Spinner Only
**Problem:** A centered `ActivityIndicator` blocks the entire viewport during load. No skeleton loaders.  
**Why It Matters:** The transition from loading to content is jarring. Premium dashboards use skeleton placeholders that mirror the real layout, reducing perceived latency.  
**Fix Required:** Implement skeleton cards matching the 2-column KPI grid and chart area.

---

#### 🟡 Issue 10 — Zero Moderation Actions Available on Homepage
**Problem:** The "Moderation Queue" KPI card shows a count but has no quick-action shortcuts. Admins must navigate to `AdminModerationScreen` to act.  
**Fix Required:** Add a "Voir la file" shortcut CTA inside the moderation card + a preview of the 3 oldest pending items.

---

#### 🟡 Issue 11 — XP & Gamification Analytics Completely Absent
**Problem:** The `User` model contains `points`, `streakDays`, `lastCheckInAt`, `badges` — none of these appear in the dashboard.  
**Why It Matters:** XP is a core engagement mechanic of the platform. Administrators need to see XP distribution, top performers, streak trends, and badge attribution.  
**Fix Required:** Add XP analytics section.

---

#### 🟡 Issue 12 — No User Activity / Engagement Metrics
**Problem:** The `User` model has `lastActiveAt`, `lastSeenAt`, `onlineStatus` — none are surfaced.  
**Fix Required:** Add DAU/WAU/MAU widgets + activity timeline.

---

#### 🟡 Issue 13 — No Geographical Distribution
**Problem:** The `User` model has `location: String` and `Event` has `location.city/country`. No geographic visualization exists.  
**Fix Required:** Add a city/region breakdown bar chart or heatmap summary.

---

#### 🟡 Issue 14 — No Reel / Community Analytics
**Problem:** The `Reel` model has `viewsCount`, `likesCount`, `commentsCount`, `sharesCount`, `savedCount`, `playsCount`, `totalWatchTime`, `completionsCount`, `trendingScore`. None appear in the dashboard.  
**Fix Required:** Add a Reels performance summary section.

---

#### 🟡 Issue 15 — Single-File Monolith Architecture
**Problem:** All 757 lines live in one file. Styles, business logic, API calls, and presentation are all co-located.  
**Why It Matters:** Impossible to unit test, reuse, or maintain. Adding one new widget means adding 50+ more lines to an already bloated file.  
**Fix Required:** Extract into reusable components: `KpiCard`, `DonutChart`, `SparklineChart`, `BarChart`, `ActivityTimeline`, `SkeletonCard`, `SectionHeader`, etc.

---

#### 🟡 Issue 16 — No Seller Verification Queue Preview
**Problem:** Sellers pending verification are counted but not previewed. Admin cannot see who is waiting without leaving the homepage.  
**Fix Required:** Add a "Vendeurs en attente" preview list widget.

---

#### 🟡 Issue 17 — No Recent Registrations Feed
**Problem:** New user registrations are not surfaced anywhere on the homepage.  
**Fix Required:** Add a "Dernières inscriptions" timeline widget.

---

#### 🟡 Issue 18 — No Growth Trend Chart (Real Data)
**Problem:** The growth percentage badge (`+14.2%`) appears on the KPI card but there is no accompanying trend line chart with real data points.  
**Fix Required:** Add a proper `registrations over time` area chart.

---

#### 🟡 Issue 19 — Missing Platform Health / System Alerts Section
**Problem:** No section for system-level health: total notifications sent, emails dispatched, error rates, queue depth.  
**Fix Required:** Add a compact "Santé de la Plateforme" widget row.

---

#### 🔵 Issue 20 — Donut Chart Has No Interactivity
**Problem:** The SVG Donut is static. Tapping a slice does nothing.  
**Fix Required:** Make segments tappable with a selection state showing detailed breakdown.

---

### 1.3 Summary Scorecard

| Dimension | Current Score | Target Score |
|---|---|---|
| Data Accuracy | 3/10 | 10/10 |
| Information Density | 3/10 | 9/10 |
| Visual Quality | 5/10 | 9/10 |
| UX Fluency | 4/10 | 9/10 |
| Reusability | 1/10 | 9/10 |
| Testability | 1/10 | 8/10 |
| Real-time Capability | 2/10 | 8/10 |
| Error Handling | 1/10 | 9/10 |
| Analytics Completeness | 2/10 | 9/10 |

---

## Part 2 — Architecture Recommendations

### 2.1 Component Architecture

```
mobile/src/modules/admin/
├── api/
│   ├── admin.api.ts                  ← Extend with new endpoints
│   └── admin.types.ts               ← [NEW] Shared DTOs & interfaces
├── hooks/
│   ├── useAdminDashboard.ts         ← [NEW] Data-fetching hook with auto-refresh
│   ├── useAutoRefresh.ts            ← [NEW] Generic 60s refresh hook
│   └── useModerationQueue.ts        ← [NEW] Moderation preview hook
├── ui/
│   ├── components/
│   │   ├── KpiCard.tsx              ← [NEW] Reusable KPI tile
│   │   ├── SectionHeader.tsx        ← [NEW] Section title + subtitle
│   │   ├── DonutChart.tsx           ← [NEW] Animated SVG donut
│   │   ├── SparklineChart.tsx       ← [NEW] Real-data sparkline
│   │   ├── BarChart.tsx             ← [NEW] Normalized bar chart
│   │   ├── AreaChart.tsx            ← [NEW] Trend area chart
│   │   ├── SkeletonCard.tsx         ← [NEW] Loading placeholder
│   │   ├── SkeletonGrid.tsx         ← [NEW] 2-col grid skeleton
│   │   ├── EmptyState.tsx           ← [NEW] No-data empty state
│   │   ├── ErrorState.tsx           ← [NEW] API error + retry
│   │   ├── ModerationPreview.tsx    ← [NEW] Pending items preview
│   │   ├── RecentRegistrations.tsx  ← [NEW] Latest user cards
│   │   ├── TopPerformers.tsx        ← [NEW] XP leaderboard strip
│   │   ├── ActivityTimeline.tsx     ← [NEW] Recent events feed
│   │   └── PlatformHealth.tsx       ← [NEW] System health row
│   └── screens/
│       ├── AdminHomeScreen.tsx      ← [REFACTOR] Composition shell only
│       ├── AdminModerationScreen.tsx
│       ├── AdminUsersScreen.tsx
│       ├── AdminSellerVerificationScreen.tsx
│       └── AdminResourcesScreen.tsx
```

### 2.2 State Management Pattern

- Each section uses its own `useX` hook (not one god-state object).
- `useAdminDashboard` returns `{ stats, loading, error, refresh, lastSyncAt }`.
- `AdminHomeScreen` is a thin composition shell — **no logic, only layout**.
- Hooks are independently testable.

### 2.3 Data Fetching Pattern

```typescript
// Pattern for every data hook
function useAdminDashboard(period: Period) {
  const [state, setState] = useState<DashboardState>(INITIAL_STATE);
  
  const fetch = useCallback(async () => {
    setState(s => ({ ...s, loading: true, error: null }));
    try {
      // [ENDPOINT] GET /api/admin/stats?period={period}
      const data = await adminApi.getDashboardStats(period);
      setState({ data, loading: false, error: null, lastSyncAt: new Date() });
    } catch (err) {
      setState(s => ({ ...s, loading: false, error: err }));
    }
  }, [period]);

  // Auto-refresh every 60 seconds
  useAutoRefresh(fetch, 60_000);
  
  useEffect(() => { fetch(); }, [fetch]);
  
  return { ...state, refresh: fetch };
}
```

---

## Part 3 — UX Recommendations

### 3.1 Navigation & Information Architecture

**Current Problem:** The homepage dumps all sections vertically with no hierarchy. There is no way to jump to a section, no sticky section summary, and no shortcuts to adjacent admin modules.

**Recommended UX Flow:**

```
[Header: Admin Identity + Last Sync + Refresh]
  ↓
[Period Selector — sticky, floats on scroll]
  ↓
[Executive KPI Row — 4 most critical numbers]
  ↓
[Growth & Registrations Area Chart]
  ↓
[User Breakdown — Donut + Demographics Bar]
  ↓
[XP & Engagement Leaderboard]
  ↓
[Content Activity — Weekly Bars by Category]
  ↓
[Moderation Queue Preview — top 3 pending]
  ↓
[Seller Verification Queue Preview]
  ↓
[Recent Registrations Feed]
  ↓
[Platform Health Row]
```

### 3.2 Refresh & Sync UX

- Period selector should remain **sticky** while scrolling.
- After any refresh, show a `"Données synchronisées à HH:MM"` toast banner for 2 seconds.
- Auto-refresh should NOT interrupt the user if they are scrolled deep — use a silent background refresh with a subtle indicator in the header (pulsing dot).

### 3.3 Empty States

Every widget must define three states:
1. **Loading** → Skeleton matching the widget's shape.
2. **Empty** → Illustration + `"Aucune donnée disponible pour cette période"`.
3. **Error** → Icon + message + "Réessayer" button.

### 3.4 Micro-Interactions

- KPI cards: Press → brief scale-down (0.97) with spring back.
- Period pills: Animated background slide between pills.
- Donut chart: Animated stroke-dasharray on mount (500ms ease-in-out).
- Bar chart: Bars animate up from 0 height on first render.
- Moderation items: Swipe-right gesture for "Approve" (green), swipe-left for "Reject" (red).

---

## Part 4 — UI Redesign Recommendations

### 4.1 Design System (Preserve Existing Tokens)

Maintain all existing tokens from `theme.ts`:

```typescript
// Existing — DO NOT CHANGE
Colors.primaryRed   = '#C8102E'
Colors.green        = '#8BC34A'
Colors.greenLight   = 'rgba(139,195,74,0.12)'
Font.family         = 'Poppins'

// Extend with semantic aliases
Colors.accent1      = '#3B82F6'   // Blue  (Users)
Colors.accent2      = '#F59E0B'   // Amber (Moderation)
Colors.accent3      = '#8B5CF6'   // Violet (XP/Gamification)
Colors.accent4      = '#EC4899'   // Pink  (Reels)
Colors.accent5      = '#10B981'   // Emerald (Growth)
Colors.accentRed    = '#EF4444'   // System red (Alerts)
```

### 4.2 Layout Grid

- **Horizontal padding:** 16px (`Spacing.md`)
- **KPI grid:** 2-column, gap 12px
- **Chart cards:** Full width, 16px padding, `Radius.lg` corners
- **Section headers:** `Poppins SemiBold 15px` + muted subtitle `Poppins Regular 12px`
- **Card elevation:** `shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 3`

### 4.3 Card Visual Hierarchy

```
Level 1 (Critical KPIs):   white card, colored left border 3px, bold value 32px
Level 2 (Charts):          white card, section title 15px semibold, chart fills card
Level 3 (List Previews):   white card, rows with avatar + name + badge, dividers
Level 4 (System Health):   horizontal scrollable pill row
```

### 4.4 Typography Scale

```
KPI Value:       Poppins Bold    32px
Section Title:   Poppins SemiBold 15px  
Card Title:      Poppins Medium   13px
Body/Label:      Poppins Regular  12px
Caption/Muted:   Poppins Regular  11px
Badge:           Poppins Medium   10px uppercase
```

### 4.5 Color Coding by Domain

| Domain | Color | Usage |
|---|---|---|
| Users / Platform | `#3B82F6` Blue | User counts, registrations |
| Growth / Success | `#10B981` Emerald | Positive trends, approvals |
| Moderation / Warning | `#F59E0B` Amber | Pending queue, alerts |
| XP / Gamification | `#8B5CF6` Violet | Points, levels, badges |
| Reels / Community | `#EC4899` Pink | Video content, engagement |
| Sellers / Commerce | `#8BC34A` Lime | Seller stats, store data |
| Danger / Rejection | `#EF4444` Red | Blocked users, rejections |

---

## Part 5 — Database Mapping Recommendations

### 5.1 User Collection — Computable Metrics

From `user.model.js`:

| Field | Metric | Chart Type |
|---|---|---|
| `createdAt` | Registrations over time | Area chart |
| `profileType` | User type distribution | Donut chart |
| `isActive` | Active vs suspended | KPI badge |
| `emailVerified` | Verification rate | Progress bar |
| `gender` | Gender breakdown | Horizontal bar |
| `birthDate` | Age group distribution | Bar chart |
| `location` | Geographic distribution | Bar chart |
| `dietaryPreference` | Diet preference breakdown | Pie / donut |
| `points` | XP distribution | Histogram |
| `points` | Top users leaderboard | Ranked list |
| `streakDays` | Streak distribution | Bar chart |
| `lastActiveAt` | DAU / WAU / MAU | Line chart |
| `onlineStatus` | Real-time online count | KPI pill |
| `pushEnabled` | Push notification opt-in rate | KPI |
| `emailEnabled` | Email opt-in rate | KPI |
| `celiacQuestionnaire.severity` | Celiac severity breakdown | Donut |
| `celiacQuestionnaire.clinicalDiagnosis` | Clinical vs self-diagnosed | Ratio bar |
| `storeInfo.storeName` | Sellers with complete profiles | KPI |
| `googleId` / `facebookId` | OAuth vs email sign-up | Donut |
| `consentTimestamp` | GDPR consent timeline | Trend |

---

### 5.2 Reel Collection — Computable Metrics

From `reel.model.js`:

| Field | Metric | Chart Type |
|---|---|---|
| `viewsCount` | Total platform views | KPI |
| `likesCount` | Total likes | KPI |
| `commentsCount` | Total comments | KPI |
| `sharesCount` | Total shares | KPI |
| `trendingScore` | Top trending reels | Ranked list |
| `category` | Content category split | Bar chart |
| `completionsCount / playsCount` | Completion rate | KPI |
| `totalWatchTime` | Total watch hours | KPI |
| `createdAt` | Reels published over time | Area chart |
| `status` | Processing / Ready / Failed | Status pills |

---

### 5.3 Event Collection — Computable Metrics

From `event.model.js`:

| Field | Metric | Chart Type |
|---|---|---|
| `type` | Event type split | Donut |
| `format` | Online vs in-person | Ratio |
| `location.city` | Cities with most events | Bar |
| `attendees.length` | Attendance stats | KPI |
| `price > 0` | Paid vs free events | Ratio |
| `isCancelled` | Cancellation rate | KPI |
| `createdAt` | Events created over time | Area |
| `startsAt` | Upcoming events count | KPI |

---

### 5.4 Recipe Collection — Computable Metrics

| Field | Metric | Chart Type |
|---|---|---|
| `category` | Recipe type distribution | Donut |
| `favoritedBy.length` | Most favorited recipes | Ranked list |
| `isPublished` | Published vs draft | KPI |
| `createdAt` | Publications over time | Area |
| `nutritionInfo.calories` | Avg calories tracked | KPI |

---

### 5.5 Product Collection — Computable Metrics

| Field | Metric | Chart Type |
|---|---|---|
| `category` | Product category split | Bar |
| `certifiedGF` | Certified GF rate | KPI |
| `price` | Price range distribution | Histogram |
| `views` | Most viewed products | Ranked list |
| `createdAt` | Products added over time | Area |

---

### 5.6 Notification Collection — Computable Metrics

| Field | Metric | Chart Type |
|---|---|---|
| `type` | Notification type breakdown | Bar |
| `isRead` | Read rate | KPI |
| `createdAt` | Notifications sent over time | Line |

---

## Part 6 — API Preparation Documentation

### 6.1 Existing Endpoint (Already Implemented)

```
GET /api/admin/stats?period={7d|30d|3m|1y}
Auth: Bearer JWT (role: admin)
Response: AdminDashboardStats DTO
```

**Current DTO gaps** — the following fields are referenced in the UI but NOT returned by `admin.service.js`:
- `pendingSellersCount` → missing (verified sellers count exists, but not pending)
- `approvalRatePercentage` → missing (approval rate not computed)
- `weeklyActivity[].patients` / `weeklyActivity[].moderations` → field names unclear
- `contentCategories[].pct` → undefined behavior when no content exists

### 6.2 Required New Endpoints (Commented Placeholders)

```typescript
// ─── ENDPOINT PLACEHOLDER ──────────────────────────────────────────────────
// GET /api/admin/users/insights?period={7d|30d|3m|1y}
// Auth: Bearer (admin)
// Returns:
//   registrationsByDay: Array<{ date: string; count: number }>
//   byProfileType: { celiac: number; seller: number; health: number; admin: number }
//   byGender: { male: number; female: number; other: number; unknown: number }
//   byAgeGroup: { '18-25': number; '26-35': number; '36-50': number; '51+': number }
//   byDietaryPref: { strict: number; reduced: number; seeking: number }
//   byLocation: Array<{ city: string; count: number }>
//   activeUsers: { dau: number; wau: number; mau: number }
//   topByXp: Array<{ userId: string; fullName: string; points: number; level: number }>
//   averageXp: number
//   xpDistribution: Array<{ range: string; count: number }>
//   oauthVsEmail: { oauth: number; email: number }
//   verifiedEmails: number
// ─────────────────────────────────────────────────────────────────────────────

// ─── ENDPOINT PLACEHOLDER ──────────────────────────────────────────────────
// GET /api/admin/content/insights?period={7d|30d|3m|1y}
// Auth: Bearer (admin)
// Returns:
//   reels: { total: number; views: number; likes: number; avgCompletionRate: number; byCategory: Record<string,number> }
//   recipes: { total: number; favorites: number; byCategory: Record<string,number> }
//   events: { total: number; upcoming: number; byType: Record<string,number>; avgAttendance: number }
//   products: { total: number; certifiedGF: number; byCategory: Record<string,number> }
//   publishedOverTime: Array<{ date: string; reels: number; recipes: number; events: number; products: number }>
// ─────────────────────────────────────────────────────────────────────────────

// ─── ENDPOINT PLACEHOLDER ──────────────────────────────────────────────────
// GET /api/admin/moderation/queue?page={n}&limit={10}&status={pending|approved|rejected}&type={all|recipe|event|product|reel}
// Auth: Bearer (admin)
// Returns:
//   total: number
//   items: Array<{
//     _id: string; type: 'recipe'|'event'|'product'|'reel';
//     title: string; authorName: string; authorAvatar: string;
//     submittedAt: string; status: 'pending'|'approved'|'rejected';
//     thumbnail?: string;
//   }>
//   pagination: { page: number; totalPages: number; hasNext: boolean }
//   stats: { pendingTotal: number; approvedToday: number; rejectedToday: number; avgProcessingTimeHrs: number }
// ─────────────────────────────────────────────────────────────────────────────

// ─── ENDPOINT PLACEHOLDER ──────────────────────────────────────────────────
// GET /api/admin/sellers/verification?status={pending|verified|rejected|blocked}
// Auth: Bearer (admin)
// Returns:
//   total: number
//   items: Array<{
//     _id: string; fullName: string; email: string; avatar: string;
//     storeName: string; storeAddress: string; registeredAt: string;
//     verificationStatus: 'unverified'|'verified'|'rejected'|'blocked';
//   }>
//   stats: { pending: number; verified: number; rejected: number; blocked: number; avgVerificationTimeHrs: number }
// ─────────────────────────────────────────────────────────────────────────────

// ─── ENDPOINT PLACEHOLDER ──────────────────────────────────────────────────
// GET /api/admin/platform/health
// Auth: Bearer (admin)
// Returns:
//   notificationsSentToday: number
//   emailsSentToday: number
//   activeSessionsNow: number
//   databaseStatus: 'healthy'|'degraded'|'down'
//   errorRatePct: number
//   avgApiLatencyMs: number
//   storageUsedMb: number
// ─────────────────────────────────────────────────────────────────────────────

// ─── ENDPOINT PLACEHOLDER ──────────────────────────────────────────────────
// GET /api/admin/users/recent?limit={10}
// Auth: Bearer (admin)
// Returns:
//   items: Array<{
//     _id: string; fullName: string; email: string; avatar: string;
//     profileType: string; registeredAt: string; location: string;
//   }>
// ─────────────────────────────────────────────────────────────────────────────
```

---

## Part 7 — Homepage Functional Specification

### 7.1 Screen Anatomy

```
┌─────────────────────────────────┐
│  HEADER                         │
│  [Avatar + Title + Sync Badge]  │
│  [Dark Mode] [Refresh] [Logout] │
├─────────────────────────────────┤
│  STICKY PERIOD SELECTOR         │
│  [7j] [30j] [3m] [1an]         │
│  "Mis à jour il y a 2 min"     │
├─────────────────────────────────┤
│  EXECUTIVE KPI ROW (4 cards)    │
│  [Total Users]  [Online Now]    │
│  [Pending Mod]  [Approval Rate] │
├─────────────────────────────────┤
│  GROWTH CHART                   │
│  "Inscriptions au fil du temps" │
│  [Area Chart — real data]       │
├─────────────────────────────────┤
│  DEMOGRAPHICS                   │
│  "Répartition des profils"      │
│  [Donut + Legend + Age Bars]    │
├─────────────────────────────────┤
│  ENGAGEMENT / XP                │
│  "Engagement & Gamification"    │
│  [DAU/WAU/MAU pills]           │
│  [XP Leaderboard Top 5]        │
├─────────────────────────────────┤
│  CONTENT ANALYTICS              │
│  "Activité des Contenus"        │
│  [Weekly bar chart by type]     │
│  [Category split]               │
├─────────────────────────────────┤
│  MODERATION PREVIEW             │
│  "File de Modération"           │
│  [3 pending items + CTA]        │
├─────────────────────────────────┤
│  SELLER VERIFICATION PREVIEW    │
│  "Vérification Vendeurs"        │
│  [Status row + 3 pending]       │
├─────────────────────────────────┤
│  RECENT REGISTRATIONS           │
│  "Nouvelles Inscriptions"       │
│  [5 recent users + profile]     │
├─────────────────────────────────┤
│  PLATFORM HEALTH                │
│  [Notifs sent] [Emails] [Latency│
└─────────────────────────────────┘
```

### 7.2 Period Selector Behavior

- Persists selection in `AsyncStorage` key `admin_dashboard_period`.
- On period change: triggers loading skeleton for all sections, then replaces with data.
- All sections must re-fetch when period changes.

### 7.3 Auto-Refresh Behavior

- Interval: 60 seconds.
- On background refresh: data updates silently, no skeleton shown.
- Last sync timestamp updates.
- A 2px pulsing green dot appears in the header corner during the background fetch.
- If user is pulling-to-refresh, interval timer resets.

---

## Part 8 — Complete Widget Catalog

### Row 1: Executive KPI Cards (4 cards, 2×2 grid)

| Widget | Description | Data Source |
|---|---|---|
| `TotalUsersKpi` | Count + growth % + sparkline | `stats.totalUsers + stats.usersGrowth + registrationsByDay` |
| `OnlineNowKpi` | Real-time online count + status | `onlineStatus == 'online'` count |
| `PendingModerationKpi` | Total pending items + by type | `pendingModeration.total + .byType` |
| `ApprovalRateKpi` | Approval % + quality score | `approved / (approved + rejected) * 100` |

### Row 2: Growth Area Chart

| Widget | Description |
|---|---|
| `RegistrationsAreaChart` | Area chart: X = date, Y = new registrations per day. Line per profile type (Celiac, Seller, Health). |

### Row 3: Demographics

| Widget | Description |
|---|---|
| `ProfileDonutChart` | Animated SVG donut: Celiac / Seller / Health Pro / Admin |
| `GenderBreakdownBar` | Horizontal bar: Male / Female / Other / Unknown |
| `AgeDistributionBar` | Grouped bars: 18-25 / 26-35 / 36-50 / 51+ |
| `LocationTopCities` | Top 5 cities ranked list |

### Row 4: Engagement & XP

| Widget | Description |
|---|---|
| `DauWauMauPills` | 3 pills: DAU / WAU / MAU with % change vs previous period |
| `XpLeaderboard` | Top 5 users by XP: avatar + name + points + level badge |
| `StreakDistribution` | Bar histogram: 0–7 / 8–30 / 31–60 / 60+ streak days |

### Row 5: Content Analytics

| Widget | Description |
|---|---|
| `WeeklyContentBar` | Grouped bar per day: Reels / Events / Recipes / Products |
| `ContentCategoryDonut` | Split of total published content by type |
| `ReelEngagementKpis` | Total views, avg completion rate, total watch hours |

### Row 6: Moderation Preview

| Widget | Description |
|---|---|
| `ModerationQueuePreview` | 3 oldest pending items: thumbnail + title + type + "depuis X heures" + "Voir tout" CTA |
| `ModerationTrendLine` | Line chart: pending / approved / rejected per day |

### Row 7: Seller Verification Preview

| Widget | Description |
|---|---|
| `SellerStatusPills` | 4 pills: Vérifiés / En attente / Rejetés / Bloqués |
| `SellerVerificationList` | Top 3 pending sellers: avatar + store name + "depuis X jours" |

### Row 8: Recent Registrations

| Widget | Description |
|---|---|
| `RecentRegistrationsFeed` | Last 5 users: avatar + name + profileType badge + location + relative time |

### Row 9: Platform Health

| Widget | Description |
|---|---|
| `PlatformHealthRow` | Horizontal scrollable pills: Notifs sent today / Emails today / Avg API latency / DB status |

---

## Part 9 — Detailed KPI Catalog

### User KPIs

| KPI | Formula | Unit |
|---|---|---|
| Total Registered Users | `User.countDocuments({ isActive: true })` | count |
| New Users (Period) | `User.countDocuments({ createdAt: { $gte: periodStart } })` | count |
| User Growth Rate | `(newUsers / totalUsers) * 100` | % |
| Active Users Today (DAU) | `User.countDocuments({ lastActiveAt: { $gte: today } })` | count |
| Active Users This Week (WAU) | `User.countDocuments({ lastActiveAt: { $gte: weekStart } })` | count |
| Active Users This Month (MAU) | `User.countDocuments({ lastActiveAt: { $gte: monthStart } })` | count |
| Online Right Now | `User.countDocuments({ onlineStatus: 'online' })` | count |
| Suspended Users | `User.countDocuments({ isActive: false })` | count |
| Email Verified Rate | `verified / total * 100` | % |
| Push Opt-In Rate | `pushEnabled:true / total * 100` | % |
| Average XP per User | `User.aggregate avg(points)` | pts |
| Median Streak | `median(streakDays)` | days |
| Celiac Users | `profileType: 'celiac'` | count |
| Pro Commerce Users | `profileType: 'seller'` | count |
| Health Pro Users | `profileType: 'health'` | count |
| OAuth Users | `googleId != null OR facebookId != null` | count |

### Moderation KPIs

| KPI | Formula | Unit |
|---|---|---|
| Total Pending | `pending recipes + events + products + reels` | count |
| Approved Today | content decisions today with `approved` | count |
| Rejected Today | content decisions today with `rejected` | count |
| Approval Rate | `approved / (approved + rejected) * 100` | % |
| Avg Processing Time | `mean(decision.createdAt - content.createdAt)` | hours |
| Moderation Backlog | items pending > 48 hours | count |

### Seller KPIs

| KPI | Formula | Unit |
|---|---|---|
| Verified Sellers | `profileType:'seller', verificationStatus:'verified'` | count |
| Pending Verification | `profileType:'seller', verificationStatus:'unverified'` | count |
| Blocked Sellers | `isActive:false, profileType:'seller'` | count |
| Store Completion Rate | sellers with `storeInfo.storeName != ''` / total sellers | % |
| Map Clicks Total | `sum(storeInfo.mapClicks)` | count |

### Content KPIs

| KPI | Formula | Unit |
|---|---|---|
| Total Reels | `Reel.countDocuments({ status:'ready' })` | count |
| Total Views (All Reels) | `Reel.aggregate sum(viewsCount)` | count |
| Total Watch Hours | `sum(totalWatchTime) / 3600` | hours |
| Avg Completion Rate | `sum(completionsCount) / sum(playsCount) * 100` | % |
| Total Recipes | `Recipe.countDocuments({ isPublished: true })` | count |
| Total Events | `Event.countDocuments({ isPublished: true })` | count |
| Upcoming Events | `startsAt > now` | count |
| Total Products | `Product.countDocuments({})` | count |
| GF Certified Products | `certifiedGF: true` | count |

---

## Part 10 — Charts & Visualizations Catalog

| Chart | Type | X Axis | Y Axis | Color |
|---|---|---|---|---|
| Registrations Over Time | Area | Date | New users | Blue `#3B82F6` |
| Profile Distribution | Donut | — | % by type | Multi-color |
| Gender Breakdown | Horizontal Bar | Count | Gender | Blue/Pink/Neutral |
| Age Distribution | Grouped Bar | Age range | Count | Violet `#8B5CF6` |
| Weekly Content Activity | Grouped Bar | Day | Count by type | Multi-color |
| Reel Engagement Trend | Line | Date | Views/Likes/Comments | Pink `#EC4899` |
| XP Distribution | Histogram | XP range | User count | Violet `#8B5CF6` |
| Moderation Trend | Multi-line | Date | Pending/Approved/Rejected | Amber/Green/Red |
| Seller Status | Stacked Bar | Month | V/P/R/B | Multi |
| Content Category Split | Donut | — | % by category | Multi |
| Streak Distribution | Bar | Streak range | Users | Green `#8BC34A` |
| DAU/WAU/MAU | Multi KPI Pills | — | Absolute + % | Blue/Teal/Navy |
| Platform Notifications | Line | Date | Sent count | Purple |

---

## Part 11 — Navigation Improvements

### 11.1 Quick-Action Shortcuts

Every major section widget should include a direct navigation shortcut:

| Section | Shortcut Target |
|---|---|
| Moderation Queue Preview | `AdminModerationScreen` |
| Seller Verification Preview | `AdminSellerVerificationScreen` |
| Total Users KPI | `AdminUsersScreen` |
| XP Leaderboard | `AdminUsersScreen` (filtered: top XP) |
| Platform Health | Expandable inline panel |

### 11.2 Tab Bar Improvements (AdminNavigator)

Current tabs:
- Accueil, Modération, Vérification, Ressources, Utilisateurs

**Recommended improvements:**
- Add badge counts on `Modération` tab (pending count) and `Vérification` tab (pending sellers).
- Badges should be computed from the same stats hook used in the homepage.
- Tab bar uses same color palette: active = `#8BC34A`, inactive = `rgba(46,46,46,0.4)`.

---

## Part 12 — Future Endpoint Specifications

### Moderation Workflow Endpoints (Phase 2)

```typescript
// POST /api/admin/moderation/:contentType/:id/approve
// POST /api/admin/moderation/:contentType/:id/reject
// Body: { reason?: string }
// Effect: Updates content status → triggers in-app + email notifications to author

// GET /api/admin/moderation/stats
// Returns: pending/approved/rejected totals, avg processing time, by-type breakdown

// GET /api/admin/moderation/queue?type=all&status=pending&page=1&limit=10
// Returns: paginated content items awaiting review
```

### User Management Endpoints (Phase 3)

```typescript
// GET  /api/admin/users?page=1&limit=20&profileType=&search=&sortBy=createdAt
// GET  /api/admin/users/:id                  — Full user profile
// PUT  /api/admin/users/:id/suspend          — Toggle isActive
// DELETE /api/admin/users/:id               — Soft delete
// POST /api/admin/users                     — Create user with role
// PUT  /api/admin/users/:id/role            — Assign role
```

### Seller Verification Endpoints (Phase 3)

```typescript
// PUT /api/admin/sellers/:id/verify
// PUT /api/admin/sellers/:id/reject
// PUT /api/admin/sellers/:id/block    — Mark as scammer
// GET /api/admin/sellers?status=pending|verified|rejected|blocked
```

### Resource Management Endpoints (Phase 4)

```typescript
// GET    /api/admin/resources
// POST   /api/admin/resources          — Create article or video resource
// PUT    /api/admin/resources/:id
// DELETE /api/admin/resources/:id
// PUT    /api/admin/resources/:id/publish
// PUT    /api/admin/resources/:id/unpublish
```

---

## Part 13 — Final Implementation Prompt

> **This is the AI agent implementation directive. Execute only after user approval.**

---

You are a **Senior Frontend Engineer** building the Admin Home Dashboard for GlUnity, a health-tech mobile application built with **React Native + Expo**.

### Constraints — ABSOLUTE

1. **Preserve the existing design system** — `Colors`, `Font`, `Radius`, `Spacing` from `mobile/src/shared/utils/theme.ts` must not change.
2. **Do NOT modify** any user-facing screens, backend routes, or database models.
3. **Do NOT import any new charting library** — use native `react-native-svg` (already installed) for all SVG charts.
4. **Do NOT hardcode any value** that represents a real data point — every number displayed must come from state, with null/empty fallback.
5. **Maintain TypeScript strict mode** — no `any` except `navigation` prop.

---

### Architecture

Decompose `AdminHomeScreen.tsx` into the following structure:

```
mobile/src/modules/admin/
├── api/admin.api.ts                ← Extend with typed DTOs
├── hooks/
│   ├── useAdminDashboard.ts       ← Main stats hook with auto-refresh
│   └── useAutoRefresh.ts          ← Generic 60s interval hook
└── ui/
    ├── components/
    │   ├── KpiCard.tsx
    │   ├── SectionHeader.tsx
    │   ├── DonutChart.tsx
    │   ├── SparklineChart.tsx
    │   ├── BarChart.tsx
    │   ├── AreaChart.tsx
    │   ├── SkeletonCard.tsx
    │   ├── EmptyState.tsx
    │   ├── ErrorState.tsx
    │   ├── ModerationPreview.tsx
    │   ├── RecentRegistrations.tsx
    │   ├── TopXpLeaderboard.tsx
    │   └── PlatformHealth.tsx
    └── screens/
        └── AdminHomeScreen.tsx    ← Thin composition shell only
```

---

### Sections to Implement (in order)

1. **Header** — Admin identity, last sync timestamp, auto-refresh pulse dot, dark-mode toggle, logout.
2. **Sticky Period Selector** — 7j / 30j / 3m / 1an pills, persisted in AsyncStorage.
3. **Executive KPI Grid** — 4 cards: Users + Growth, Online Now, Pending Moderation, Approval Rate. Each card has: icon, value, label, trend badge, sparkline or progress. All values from API state — null guarded.
4. **Registrations Area Chart** — SVG area chart using `registrationsByDay` from API. Graceful empty state if array empty.
5. **Profile Demographics** — Animated SVG donut (celiac/seller/health), gender bars, age group bars. All from API.
6. **DAU/WAU/MAU Strip** — Three metric pills. All from API `activeUsers`.
7. **XP Leaderboard** — Top 5 users by points. Avatar (initials fallback), name, points, level computed from points (Level = Math.floor(points / 100) + 1).
8. **Weekly Content Bar Chart** — Grouped bars per day of week, one color per content type. From `weeklyActivity` API data. Normalized to max bar height 64dp.
9. **Moderation Queue Preview** — Top 3 oldest pending items. Title, type badge, author, relative time ("il y a 3h"). CTA button to navigate to `AdminModerationScreen`.
10. **Seller Verification Preview** — Status pills (count per status) + top 3 pending sellers list.
11. **Recent Registrations** — Last 5 users: avatar initials, name, profileType badge, location, relative time.
12. **Platform Health Row** — Horizontal scroll row with system health pills (notifs sent, emails, latency, DB status). **These are placeholder values with `// [ENDPOINT] GET /api/admin/platform/health`** commented above.

---

### Data & State Rules

- Every section uses `stats?.field ?? null` or `stats?.field ?? []` — never `?? 0` unless it is genuinely zero-safe.
- Show `<SkeletonCard />` while `loading && !refreshing`.
- Show `<ErrorState onRetry={refresh} />` when `error !== null`.
- Show `<EmptyState />` when array is `[]` or value is `null`.
- Auto-refresh every 60 seconds via `useAutoRefresh(fetch, 60_000)`.
- `lastSyncAt` displayed as `"Mis à jour il y a X min"` below period selector.

---

### Commented API Placeholders

Every hook and every fetch function must include:
```typescript
// [ENDPOINT] GET /api/admin/users/insights?period={period}
// [ENDPOINT] GET /api/admin/content/insights?period={period}
// [ENDPOINT] GET /api/admin/moderation/queue?status=pending&limit=3
// [ENDPOINT] GET /api/admin/sellers/verification?status=pending&limit=3
// [ENDPOINT] GET /api/admin/users/recent?limit=5
// [ENDPOINT] GET /api/admin/platform/health
```

---

### Visual Quality Bar

- Cards must have `shadowOpacity: 0.06, shadowRadius: 8, elevation: 3` — no flat borderless cards.
- Section headers: `Poppins SemiBold 15px` title + `Poppins Regular 12px` muted subtitle.
- KPI values: `Poppins Bold 30px`.
- All charts have animated entry (strokeDasharray animation or height-from-zero).
- Donut chart animates on mount (500ms).
- Bar chart bars animate up from height 0 on first render (300ms staggered).
- Use `Colors.accent1..5` semantic aliases (defined in the design tokens extension) for domain color coding.
- All touch targets minimum 44×44dp.
- Period pills: animated background slide (using `Animated.Value` translating the active pill background).

---

### TypeScript Interfaces Required

```typescript
// In admin.types.ts
export interface AdminDashboardStats {
  // Existing
  totalUsers: number;
  usersGrowth: number;
  verifiedSellers: number;
  pendingSellersCount: number;          // [FIX REQUIRED — currently missing]
  approvalRatePercentage: number | null; // [FIX — fallback null, not 100]
  pendingModeration: {
    total: number;
    products: number;
    events: number;
    recipes: number;
    reels: number;
  };
  weeklyActivity: Array<{
    day: string;
    patients: number;
    moderations: number;
    reels: number;
    events: number;
  }>;
  contentCategories: Array<{
    label: string;
    count: number;
    color: string;
  }>;
  userDistribution: {
    celiac: number;
    seller: number;
    health: number;
  };

  // [NEW — requires endpoint: GET /api/admin/users/insights]
  registrationsByDay?: Array<{ date: string; count: number }>;
  activeUsers?: { dau: number; wau: number; mau: number };
  onlineNow?: number;
  topByXp?: Array<{ _id: string; fullName: string; points: number; avatar?: string }>;

  // [NEW — requires endpoint: GET /api/admin/moderation/queue]
  moderationPreview?: Array<{
    _id: string;
    type: 'recipe' | 'event' | 'product' | 'reel';
    title: string;
    authorName: string;
    submittedAt: string;
    thumbnail?: string;
  }>;

  // [NEW — requires endpoint: GET /api/admin/users/recent]
  recentRegistrations?: Array<{
    _id: string;
    fullName: string;
    profileType: string;
    location: string;
    createdAt: string;
    avatar?: string;
  }>;
}
```

---

### Verification Checklist (Post-Implementation)

- [ ] `npx tsc --noEmit` — Zero TypeScript errors
- [ ] No hardcoded numeric values representing real metrics
- [ ] Every widget renders correctly in empty state
- [ ] Every widget renders correctly in error state
- [ ] Every widget renders correctly with mock data
- [ ] Auto-refresh fires every 60 seconds (verify with console.log timestamp)
- [ ] Period selector persists across app restarts
- [ ] Last sync timestamp updates on every refresh
- [ ] No `console.warn` or `console.error` during normal operation
- [ ] Dark mode renders correctly for all new components
- [ ] All chart animations play on first mount
- [ ] Skeleton cards match the layout of real content

---

*End of Specification. Awaiting user approval to begin Phase 1 implementation.*
