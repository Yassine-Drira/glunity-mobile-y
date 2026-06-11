# Messaging Module — UX Audit & Premium Feature Roadmap

> Context: GlUnity community messaging, targeting a premium, WhatsApp/Telegram-quality experience for a health-focused social app.

---

## ✅ What Was Just Fixed (This Session)

| Issue | Fix |
|---|---|
| DM header identical to group header | **Redesigned** — DM shows partner avatar (circular + green ring), name, live online/offline/typing text; Group shows rounded-square icon, name, member count |
| Sender name shown inside DM bubbles | **Removed** — only shown in group conversations (you know who sent in a 1-on-1) |
| Three-dot menu had no DM actions | **Added** — Mute/Unmute, Clear Chat, Delete Conversation (with confirmation) |
| Tapping DM header did nothing | **Fixed** — tapping anywhere on the header name/avatar area in DM opens the `MembersBottomSheet` (partner info); same for group |
| Mute state not visible | **Added** — 🔕 icon appears next to partner name in DM header when muted |
| 500 error on pinning DM messages | **Fixed** — Mongoose schema now accepts `type:'direct'` |

---

## 🔴 Critical Missing Features (Must-Have for Top UX)

### 1. Read Receipts — Double Checkmarks
**Current:** All sent messages show a single `checkmark-done` (blue/green). There is no per-message read tracking.
**Expected:** iMessage/WhatsApp-style:
- ✓ grey = sent to server
- ✓✓ grey = delivered to device
- ✓✓ green/blue = **read** by partner

**How to fix:**
- Backend already has `lastReadAt` per participant in the channel. 
- On message render: compare `message.createdAt` against partner's `lastReadAt`.
- Emit a socket event `message:read:{channelId}` when the user opens the chat, so the sender knows their messages were read.

---

### 2. Typing Indicator in DM Is Not Connected to Partner's State
**Current:** `typingUser` is shown in the input bar below the messages (barely visible). In the header it is now showing — but the socket-side `typing:start` / `typing:stop` events may not be emitted by the other user.
**Expected:** Partner's typing shows in header ("Yassine is typing…" with animated dots).

**Check:** Verify `typing:start` is emitted in the socket handler when the partner types, and that the receiving client updates `typingUser` state.

---

### 3. Avatar in DM Bubbles (Incoming Side) Is Wasted Space
**Current:** In a DM, every incoming message shows the partner's avatar on the left — this is correct for groups but **wastes space** in 1-on-1 chats (iMessage, Telegram, and WhatsApp all hide the avatar in DMs).
**Fix:** Conditionally hide the avatar in `renderItem` when `!!dmPartnerId`.

```tsx
// In renderItem, hide avatar in DM
{!isMe && !dmPartnerId && (
  avatarUrl ? <Image ... /> : <View ... />
)}
```

---

### 4. Message Date Separators (Day Pills)
**Current:** No date separators between messages from different days.
**Expected:** All top apps show a centered pill: "Today", "Yesterday", "Jun 10" between message groups.

**Fix:** In `renderItem`, check if the previous message's date is different and inject a separator view.

---

### 5. Message Grouping / Bubble Tail Suppression
**Current:** Every bubble has a tail (rounded corner cut) regardless of whether consecutive messages are from the same sender.
**Expected:** Telegram/iMessage style: consecutive messages from same sender get flat corners on the sender side; only the last one in a group gets the tail.

**Fix:** Pass `prevItem` and `nextItem` into `renderItem` and conditionally set `borderBottomRightRadius`/`borderBottomLeftRadius`.

---

### 6. Empty State When No Messages
**Current:** The list is just empty white space.
**Expected:** A friendly empty state: "Say hi to {name} 👋" with a small illustration, especially visible on first open of a new DM.

---

### 7. Audio Voice Note — Playback Speed Control
**Current:** Voice notes play at 1x only.
**Expected:** WhatsApp-style 1x → 1.5x → 2x toggle on the playback button. The `Audio` from `expo-av` supports `setRateAsync`.

---

### 8. Pull-to-Load Older Messages (Pagination)
**Current:** The cursor-based API exists (`direction=before`) but the FlatList has no `onEndReached` or pull-up-to-load implementation. Users can only see the last ~50 messages.
**Fix:** Add `onStartReached` (or `onEndReached` with inverted list) to load older pages.

---

## 🟡 UX Improvements (High Impact, Medium Effort)

### 9. Swipe-to-Reply Gesture
**Current:** Long-press → tap reply in the overlay modal.
**Expected:** Swipe right on a bubble to snap it to the reply state (Telegram/WhatsApp gesture).
**Library:** `react-native-gesture-handler` `Swipeable`.

---

### 10. Link Preview Cards
**Current:** URLs in messages are plain text.
**Expected:** Auto-detect URLs and show a rich preview card (title, image, domain).
**Library:** `react-native-link-preview` or a simple backend `/api/link-preview?url=` endpoint.

---

### 11. Image / Media Full-Screen Viewer
**Current:** Tapping an image opens it in the browser via `Linking.openURL`.
**Expected:** In-app full-screen image viewer with pinch-to-zoom, swipe-to-dismiss.
**Library:** `react-native-image-viewing`.

---

### 12. Message Search in Conversation
**Current:** No in-conversation search.
**Expected:** Tap a search icon in the header → search bar slides down, filters messages, highlights matches, scroll-jumps to result.

---

### 13. Haptic Feedback on Reactions / Send
**Current:** No haptic feedback.
**Expected:** Light haptic on emoji react, medium haptic on long-press, heavy haptic on send.
**Library:** `expo-haptics` — `Haptics.impactAsync(ImpactFeedbackStyle.Light)`.

---

### 14. Emoji Keyboard Shortcut / Emoji Drawer
**Current:** Reactions only available via long-press modal.
**Expected:** Tap the `☺` emoji button next to the text input to show a quick-emoji tray (like Messenger's bottom emoji bar).

---

### 15. Unread Message Jump Banner
**Current:** When a new message arrives while scrolled up, nothing happens.
**Expected:** A floating "↓ 3 new messages" pill at the bottom that auto-dismisses when scrolled back down.

---

### 16. "Last Seen" in DM Header
**Current:** Only shows "Online" or "Offline".
**Expected:** When offline, show "Last seen today at 2:34 PM" (requires backend `lastSeenAt` field on User).

---

## 🟢 Polish / Premium Details (Low Effort, High Perceived Quality)

### 17. Bubble Tap to Show Precise Timestamp
**Current:** Timestamp always visible below bubble.
**Expected (iMessage style):** Timestamp hidden by default; tap bubble to briefly reveal "Sent Jun 10 at 2:34 PM".

### 18. Delivered/Sent Checkmark Animation
Single ✓ appearing then morphing to ✓✓ with a smooth spring animation when delivery is confirmed.

### 19. Background Gradient / Chat Wallpaper
**Current:** Solid `T.bg` background.
**Expected:** Subtle gradient or optional chat wallpaper — makes the chat feel warmer and more personal.

### 20. Voice Note Waveform (Real)
**Current:** Static hardcoded bar heights `[6,10,14,20,14,10,8,12]`.
**Expected:** Real waveform sampled from the audio recording using `expo-av`'s metering data during recording.

---

## Backend Gaps to Address

| Feature | Current State | Fix |
|---|---|---|
| `lastSeenAt` on User | ❌ Missing | Add to User model, update on socket disconnect |
| Message delivery confirmation | ❌ Missing | Emit `message:delivered` when receiving client's socket connects and fetches the message |
| Read receipt event on open | ⚠️ Partial | `markRead` API exists but not called on chat open consistently |
| Block/Report user | ❌ Missing | Critical for safety in a community app |
| Message forwarding | ❌ Missing | `POST /channels/:id/messages` with `forwardedFrom` field |

---

## Priority Order

```
CRITICAL  → 1 (read receipts), 2 (typing), 3 (avatar in DM), 4 (date separators), 8 (pagination)
HIGH      → 9 (swipe-reply), 11 (image viewer), 15 (unread jump), 16 (last seen)
MEDIUM    → 5 (bubble grouping), 10 (link preview), 12 (search), 13 (haptics)
POLISH    → 6 (empty state), 7 (voice speed), 14 (emoji drawer), 17–20
```
