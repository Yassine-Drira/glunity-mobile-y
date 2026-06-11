# Glunity Messaging & Chat Module: Architecture, Workflows & Technical Audit

This document provides a comprehensive overview of the design, functionalities, and best practices of the Glunity real-time messaging system, followed by a rigorous technical audit identifying bugs, architectural anti-patterns, and performance bottlenecks.

---

## 1. System Architecture Overview

The Glunity messaging module is built upon a modern, decoupled microservice pattern designed to isolate real-time WebSocket traffic from core transactional REST APIs.

### Backend Topology

```mermaid
graph TD
    Client[Mobile / Web Client] -->|REST Requests| CoreAPI[Core API Service: Port 5000]
    Client -->|REST Requests & Uploads| MsgService[Messaging Service: Port 5001]
    Client -->|WebSockets| SocketServer[Socket.io Server: Port 5001]
    
    MsgService -->|Mongoose ODM| Mongo[(MongoDB Database)]
    SocketServer -->|Adapter| Redis[(Redis Pub/Sub)]
    MsgService -->|File Streaming| Cloudinary((Cloudinary CDN))
```

1. **Core API Service (`port 5000`)**: Handles user authentication, profiles, communities, and general business logic.
2. **Messaging Microservice (`port 5001`)**:
   - **HTTP REST API**: Handles channel creation, member updates, role modifications, and media/audio upload streaming.
   - **Real-time Engine (Socket.io)**: Manages message delivery, soft deletions, edits, reaction updates, typing indicators, and presence heartbeats.
   - **Horizontal Scaling (Redis Adapter)**: Integrates `@socket.io/redis-adapter` to distribute socket events across multiple instances, resolving scale issues.
   - **Data Persistence**: Interacts directly with a shared MongoDB instance via Mongoose schemas (`Channel`, `Message`, `User`).

### Frontend/Mobile Stack

- **UI Components**: Built using React Native (`FlatList`, `KeyboardAvoidingView`) styled with a dynamic stylesheet mapped to `useTheme`.
- **State Controller Hook (`useCommunityChat`)**: A central state machine implementing socket subscriptions, audio recording lifecycles, and component actions.
- **Cache-Aside Layer (`ChatCacheService`)**: Uses `AsyncStorage` to persist conversation lists and messages, allowing instant offline rendering.
- **Axios HTTP Clients**: Two specialized client instances (`http` for Core API, `messagingHttp` for Messaging Service) sharing JWT attachment and token-refresh interceptors.

---

## 2. Detailed Functional Workflows

### Channel & Privacy Boundaries
- **Direct Messages (DMs)**: Created via `/channels/dm` with a payload of `{ targetUserId }`. The system guarantees privacy by enforcing `isPrivate: true` and limiting the participants array size strictly to 2.
- **Group Channels**: Configured with a `type: 'group'`. They support owner/admin/member roles with access control trees (e.g., only owners can promote members to admins; admins cannot promote others or change owner roles).

### Real-Time Event Flows
The communication flow utilizes Socket.io events with standard callbacks to confirm database persistence:

```mermaid
sequenceDiagram
    participant C as Mobile Client
    participant S as Socket.io Server
    participant DB as MongoDB
    participant P as Peers (Rooms)

    C->>C: Insert Optimistic Message (status: 'sending')
    C->>S: Emit 'message:send' { channelId, content, type }
    S->>DB: Save new Message document
    S->>DB: Atomically update Channel's lastMessage
    S-->>C: Return callback acknowledgement { ok: true, data: populatedMsg }
    C->>C: Update status to 'sent', replace Temp ID
    S->>P: Broadcast 'message:new' to room channel:{id}
    S->>P: Broadcast 'conversation:updated' to participant IDs
```

- **Reactions**: Emits `reaction:toggle`. Optimistically updates UI counters and rolls back state if the server reports a failure.
- **Typing Indicators**: Emits `message:typing` throttled by a 2000ms cooldown window.
- **Presence Tracking**: On socket connection, the server marks the user `online` in MongoDB, stores the socket ID in Redis under `presence:{userId}` with a Time-To-Live (TTL) matching the heartbeat duration, and alerts peers. If the user disconnects, the system checks if other active sockets for the same user exist; if not, it transitions them to `offline`.

### Media and Voice Uploads
- **Media (Images & Videos)**: Native assets are selected via `expo-image-picker`, compressed on-device using `expo-image-manipulator`, and sent as a `multipart/form-data` payload.
- **Voice Messages**: Recorded using `expo-av` at 22,050Hz to limit payload size.
- **Cloudinary Integration**: The messaging service buffers the files in memory and streams them directly to Cloudinary using its upload API.

---

## 3. UI/UX Design & Aesthetic Patterns

- **Color Palettes**: Sleek HSL dark mode values and accessible light modes. User bubbles use deep brand colors (e.g., `#1E7A4D` / `#2ECC71`) whereas peer bubbles use secondary background surfaces (`T.surfaceAlt`).
- **Layout Animations**: Leveraging `react-native-reanimated`'s `FadeInDown` and `SlideInRight` animations for incoming messages.
- **Voice Player Representation**: Custom-designed waveform simulator with individual bar height rendering, animating progress during audio playback.
- **Interactive Sheets**: Actions like adding reactions, pinning messages, and group editing are integrated using overlays that feature clean transitions.

---

## 4. Identified Best Practices in the Codebase

1. **Token Refresh Synchronization**: Both `http` and `messagingHttp` clients queue failed requests during token refreshes, preventing parallel refresh calls and resolving race conditions.
2. **Graceful Shutdown Routines**: The backend listens to `SIGINT` and `SIGTERM` to close socket connections, disconnect Redis clients, and close the HTTP server securely before shutting down.
3. **Redis Adapter Inclusion**: Standardizes horizontal scalability out-of-the-box by wrapping socket servers in Redis adapters, preventing split-brain states in clustered deployments.
4. **Optimistic UI Updates**: Immediately updates reactions and messages, providing instant feedback while network calls complete.
5. **Cache-Aside Strategy**: Minimizes initial loading states by displaying cached conversations and messages from local storage before fetching updates.

---

## 5. Expert Code Audit: Bugs, Technical Debt & "AI Garbage"

A detailed review of the code reveals several critical issues, architectural flaws, and brittle AI-generated patterns:

### 1. Production Blocker: Brittle Port/URL Replacement
In both `useCommunityChat.ts` and `messaging-http.client.ts`, the messaging service URL is derived using:
```typescript
const MSG_SERVICE_URL = API_BASE_URL.replace(':5000', ':5001');
```
> [!CAUTION]
> **Production Defect**: In staging and production environments, APIs do not run on different ports of the same host (e.g., they map to subdomains like `https://api.glunity.com` and `https://messaging.glunity.com`).
> If `API_BASE_URL` does not contain `:5000`, the replacement fails silently, making `MSG_SERVICE_URL` identical to `API_BASE_URL`. This causes all uploads and messaging microservice requests to route to the main API, breaking the app in production.

### 2. "AI Duct-Tape" Patterns: Schema & Endpoint Guessing
In `fetchMembers` (lines 919–981 of `useCommunityChat.ts`), the code contains guessing routines designed to mask inconsistencies rather than enforce clean data contracts:
```typescript
const candidateKeys = ['participants', 'members', 'userIds', 'participantIds', 'memberIds'];
let raw: any = null;
for (const k of candidateKeys) {
  if (channel[k]) { raw = channel[k]; break; }
}

const membersEndpoints = [`/channels/${channel.id || channel._id}/members`, `/channels/${channel.id || channel._id}/participants`];
```
> [!WARNING]
> This pattern indicates that the API payloads are not standardized. The client is forced to "guess" properties and endpoint URLs. This makes debugging difficult and introduces silent runtime failures if schemas shift.

### 3. Monolithic State Controller Hook
The `useCommunityChat` hook spans **over 1300 lines**.
- It is responsible for socket connection setup, message sending/retrying, audio recording (`expo-av`), photo capturing, photo picking, role updates, pin toggles, and modal displays.
- **Performance Impact**: Any minor state modification (e.g., audio play progress, typing indicators) triggers a full state re-render of this hook, causing UI stuttering and frame drops on lower-end mobile devices.

### 4. Memory Leak Risk: Multer Memory Storage
The upload endpoint on the messaging service uses Multer's `memoryStorage`.
```javascript
const upload = multer({ storage: multer.memoryStorage() });
```
> [!WARNING]
> Buffering files in memory is highly risky for larger assets. The service allows video uploads up to 50MB. If multiple users upload videos simultaneously, the Node.js heap memory usage will spike, potentially triggering Out of Memory (OOM) crashes in cloud container instances.

### 5. Inconsistent Identification Keys (`_id` vs `id`)
Throughout the frontend codebase, variables are accessed using defensive fallbacks:
`channel.id || channel._id` or `item.id || item._id`.
This is a symptom of poor API serialization: Mongoose models return `_id` as their primary key, but the serialization layers fail to convert this consistently to `id`.

### 6. Local Fallback Discrepancy (Dead Code)
While the local uploads static routing was removed from `app.js` in previous commits, the underlying Cloudinary integration client (`cloudinary.client.js`) has duplicate fallback logic. This can create confusion where files might be written locally but remain inaccessible to users because no static file route exists to serve them.

---

## 6. Recommendations & Refactoring Roadmap

### Step 1: Standardize Service URLs
Introduce explicit environment configuration variables instead of using string replacements:
```typescript
// Replace: const MSG_SERVICE_URL = API_BASE_URL.replace(':5000', ':5001');
// With:
import { MESSAGING_SERVICE_URL } from '../config/api.config';
export const MSG_SERVICE_URL = MESSAGING_SERVICE_URL;
```

### Step 2: Decompose the Monolithic Hook
Refactor `useCommunityChat` by splitting its responsibilities into dedicated hooks:
- `useAudioRecorder`: Manages audio recording state, timers, and permissions.
- `useAudioPlayer`: Manages active audio playback progress and playback instances.
- `useMediaPicker`: Wraps image picking, camera capturing, and compression.
- `useChannelMembers`: Manages members sheets, additions, removals, and role updates.

### Step 3: Streamline the Serialization Contract
Implement a serialization mapper in the backend to ensure all JSON responses return `id` as a string instead of `_id`. This eliminates the need for frontend checks like `channel.id || channel._id`.

### Step 4: Secure Upload Pipelines
Configure Multer to use `diskStorage` with a clean temp-file cleanup routine, or leverage direct client-to-Cloudinary signed uploads to bypass routing large media files through the messaging microservice entirely.
