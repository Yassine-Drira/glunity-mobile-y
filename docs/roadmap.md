# Roadmap

## Goals
- Improve performance across mobile + API.
- Reduce UI latency and jank on list-heavy screens.
- Make dark mode consistent across all components.

## Phase 1: Quick Wins (1–3 days)
### Tasks
1. Cap list limits on API endpoints (events, notifications) to avoid unbounded queries.
2. Add pagination params to mobile API calls for events + notifications.
3. Add FlatList performance props on high-volume lists (Market, Notifications, Events).
4. Start theme fixes: make dark mode propagate to text-scaling and UI overrides.

### Deliverables
- API caps merged and verified.
- Mobile API supports `limit` + `skip` and uses them in lists.
- Reduced list memory footprint and smoother scrolling.

## Phase 2: High Impact (1–2 sprints)
### Tasks
1. Replace global render monkey-patching for Text/TextInput/Alert with explicit i18n wrappers.
2. Add a notifications cache/store with unread count for header usage.
3. Migrate remote images to a cached image component (expo-image) with size-optimized URLs.
4. Standardize list loading states and empty states for consistent UX.

### Deliverables
- Safer render pipeline without global patches.
- Fewer network calls for header indicators.
- Faster image rendering and reduced bandwidth.

## Phase 3: Structural Improvements (2–4 sprints)
### Tasks
1. Unify pagination strategy across events/products/notifications.
2. Convert long ScrollView screens to FlatList or SectionList.
3. Add server-side caching for high-traffic list endpoints.
4. Add a lightweight performance telemetry hook (load time + list render time).

### Deliverables
- Predictable list performance at scale.
- Consistent UX patterns across the app.
- Measurable improvements via basic telemetry.

## Theme Fixes (In Progress)
### Started
- Sync dark mode with text-scaling so color transforms match the active theme.

### Next
- Audit hard-coded colors that bypass theme tokens.
- Replace direct color literals with `T.*` tokens on all screens.
- Confirm status bar + system UI styling per platform.
