# 🏗️ Glunity Messaging System — Full Architecture & Development Plan

> **Scope**: Backend only (Node.js / Express / MongoDB / Socket.IO)
> **Team**: Yassi + Rayen — parallel sprint plan included
> **Goal**: Production-grade real-time messaging platform with channels, DMs, reactions, reel sharing, and presence

---

## 1. High-Level Architecture

```mermaid
graph TB
    subgraph "Client Layer (Frontend Team)"
        MobileApp["React Native App"]
        WebApp["React Native Web"]
    end

    subgraph "API Gateway Layer"
        NGINX["NGINX Reverse Proxy"]
    end

    subgraph "Application Layer"
        REST["Express REST API<br/>(HTTP :5000)"]
        WS["Socket.IO Server<br/>(WS :5000 /socket.io)"]
        AUTH["Auth Middleware<br/>(JWT verify)"]
    end

    subgraph "Service Layer"
        ChannelSvc["Channel Service"]
        MessageSvc["Message Service"]
        ReactionSvc["Reaction Service"]
        PresenceSvc["Presence Service"]
        MediaSvc["Media/Reel Service"]
        NotifSvc["Notification Service"]
    end

    subgraph "Data Layer"
        MongoDB[(MongoDB 7)]
        Redis[(Redis 7<br/>Pub/Sub + Presence Cache)]
        Cloudinary["Cloudinary CDN<br/>(Media Storage)"]
    end

    MobileApp -->|HTTPS| NGINX
    WebApp -->|HTTPS| NGINX
    NGINX -->|HTTP| REST
    NGINX -->|WS Upgrade| WS
    REST --> AUTH
    WS --> AUTH
    AUTH --> ChannelSvc
    AUTH --> MessageSvc
    AUTH --> ReactionSvc
    AUTH --> PresenceSvc
    AUTH --> MediaSvc
    ChannelSvc --> MongoDB
    MessageSvc --> MongoDB
    MessageSvc --> Redis
    ReactionSvc --> MongoDB
    PresenceSvc --> Redis
    MediaSvc --> Cloudinary
    MessageSvc --> NotifSvc
```

---

## 2. Data Models (MongoDB Schemas)

### 2.1 Channel (enhanced from current)

```js
// database/models/channel.model.js
const channelSchema = new Schema({
  name:        { type: String, trim: true },                        // null for DMs
  type:        { type: String, enum: ['group', 'dm'], required: true, index: true },
  description: { type: String, default: '' },
  icon:        { type: String, default: 'chatbubbles-outline' },
  avatar:      { type: String, default: null },                     // channel avatar URL
  isPrivate:   { type: Boolean, default: false },
  creatorId:   { type: Types.ObjectId, ref: 'User', index: true },
  participants: [{
    userId:   { type: Types.ObjectId, ref: 'User', required: true },
    role:     { type: String, enum: ['owner', 'admin', 'member'], default: 'member' },
    joinedAt: { type: Date, default: Date.now },
    muted:    { type: Boolean, default: false },
  }],
  lastMessage: {
    content:   String,
    senderId:  { type: Types.ObjectId, ref: 'User' },
    sentAt:    Date,
    type:      { type: String, enum: ['text', 'media', 'reel', 'system'], default: 'text' },
  },
  pinnedMessages: [{ type: Types.ObjectId, ref: 'Message' }],
  messageCount:   { type: Number, default: 0 },
}, { timestamps: true, versionKey: false });

// Compound index for fast DM lookup
channelSchema.index({ type: 1, 'participants.userId': 1 });
// Index for listing user's channels sorted by activity
channelSchema.index({ 'participants.userId': 1, updatedAt: -1 });
```

### 2.2 Message (enhanced from current)

```js
// database/models/message.model.js
const messageSchema = new Schema({
  channelId:  { type: Types.ObjectId, ref: 'Channel', required: true, index: true },
  senderId:   { type: Types.ObjectId, ref: 'User', required: true, index: true },
  content:    { type: String, trim: true, default: '' },
  type:       { type: String, enum: ['text', 'media', 'reel', 'system'], default: 'text' },

  // Media attachments (images, videos, files)
  attachments: [{
    url:       { type: String, required: true },
    type:      { type: String, enum: ['image', 'video', 'file'], required: true },
    filename:  String,
    size:      Number,           // bytes
    thumbnail: String,           // pre-generated thumb URL
    duration:  Number,           // seconds (video/reel only)
  }],

  // Reel share reference
  reelRef: {
    reelId:       { type: Types.ObjectId },
    thumbnailUrl: String,
    title:        String,
  },

  // Reply threading
  replyTo: {
    messageId:  { type: Types.ObjectId, ref: 'Message' },
    senderId:   { type: Types.ObjectId, ref: 'User' },
    senderName: String,
    preview:    String,           // first 80 chars of replied message
  },

  // Aggregated reaction counts  { "❤️": 5, "👍": 3, "😂": 1 }
  reactionCounts: { type: Map, of: Number, default: {} },

  // Delivery metadata
  editedAt:  { type: Date, default: null },
  deletedAt: { type: Date, default: null },       // soft delete
  readBy:    [{ type: Types.ObjectId, ref: 'User' }],
}, { timestamps: true, versionKey: false });

// Compound index for paginated message retrieval
messageSchema.index({ channelId: 1, createdAt: -1 });
// Soft-delete filter
messageSchema.index({ deletedAt: 1 });
```

### 2.3 Reaction (new)

```js
// database/models/reaction.model.js
const reactionSchema = new Schema({
  messageId: { type: Types.ObjectId, ref: 'Message', required: true, index: true },
  userId:    { type: Types.ObjectId, ref: 'User', required: true },
  emoji:     { type: String, required: true, trim: true },  // "❤️", "👍", "😂", etc.
}, { timestamps: true, versionKey: false });

// Ensure one reaction per user per emoji per message
reactionSchema.index({ messageId: 1, userId: 1, emoji: 1 }, { unique: true });
```

### 2.4 Read Receipt (new)

```js
// database/models/read-receipt.model.js
const readReceiptSchema = new Schema({
  channelId:     { type: Types.ObjectId, ref: 'Channel', required: true, index: true },
  userId:        { type: Types.ObjectId, ref: 'User', required: true },
  lastReadMsgId: { type: Types.ObjectId, ref: 'Message', required: true },
  lastReadAt:    { type: Date, default: Date.now },
}, { timestamps: false, versionKey: false });

readReceiptSchema.index({ channelId: 1, userId: 1 }, { unique: true });
```

---

## 3. Socket.IO Event Protocol

### 3.1 Connection & Authentication

```
Client → Server:  connect({ auth: { token: "<JWT>" } })
Server → Client:  connect_ack({ userId, channels: [...ids] })
Server → Client:  connect_error({ message: "Unauthorized" })
```

### 3.2 Channel Events

| Direction | Event | Payload |
|-----------|-------|---------|
| C → S | `channel:join` | `{ channelId }` |
| C → S | `channel:leave` | `{ channelId }` |
| S → C | `channel:updated` | `{ channel }` |
| S → C | `channel:member_joined` | `{ channelId, user }` |
| S → C | `channel:member_left` | `{ channelId, userId }` |

### 3.3 Message Events

| Direction | Event | Payload |
|-----------|-------|---------|
| C → S | `message:send` | `{ channelId, content, type, attachments?, reelRef?, replyTo? }` |
| S → C | `message:new` | `{ message }` (full populated message) |
| C → S | `message:edit` | `{ messageId, content }` |
| S → C | `message:edited` | `{ messageId, content, editedAt }` |
| C → S | `message:delete` | `{ messageId }` |
| S → C | `message:deleted` | `{ messageId, channelId }` |
| C → S | `message:typing` | `{ channelId }` |
| S → C | `message:typing` | `{ channelId, userId, fullName }` |

### 3.4 Reaction Events

| Direction | Event | Payload |
|-----------|-------|---------|
| C → S | `reaction:toggle` | `{ messageId, emoji }` |
| S → C | `reaction:updated` | `{ messageId, emoji, count, action: 'added'│'removed', userId }` |

### 3.5 Presence Events

| Direction | Event | Payload |
|-----------|-------|---------|
| S → C | `presence:online` | `{ userId }` |
| S → C | `presence:offline` | `{ userId, lastSeen }` |
| C → S | `presence:ping` | `{}` (heartbeat) |

### 3.6 Read Receipt Events

| Direction | Event | Payload |
|-----------|-------|---------|
| C → S | `read:mark` | `{ channelId, messageId }` |
| S → C | `read:receipt` | `{ channelId, userId, messageId }` |

---

## 4. REST API Endpoints (Enhanced)

### Channels
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/channels` | List current user's channels (sorted by last activity) |
| `POST` | `/api/channels` | Create group channel `{ name, participants[], isPrivate }` |
| `POST` | `/api/channels/dm` | Get or create DM channel `{ userId }` |
| `GET` | `/api/channels/:id` | Get channel details + participant list |
| `PATCH` | `/api/channels/:id` | Update channel (name, description, avatar) — admin only |
| `DELETE` | `/api/channels/:id` | Archive channel — owner only |
| `POST` | `/api/channels/:id/participants` | Add participants `{ userIds[] }` |
| `DELETE` | `/api/channels/:id/participants/:userId` | Remove/leave participant |
| `PATCH` | `/api/channels/:id/participants/:userId/role` | Change role — owner only |
| `PATCH` | `/api/channels/:id/mute` | Toggle mute for self |

### Messages
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/channels/:id/messages` | Paginated messages `?cursor=<msgId>&limit=50` |
| `POST` | `/api/channels/:id/messages` | Send message (fallback for non-socket clients) |
| `PATCH` | `/api/messages/:id` | Edit message content |
| `DELETE` | `/api/messages/:id` | Soft-delete message |
| `POST` | `/api/channels/:id/messages/:msgId/pin` | Pin message |
| `DELETE` | `/api/channels/:id/messages/:msgId/pin` | Unpin message |

### Reactions
| Method | Path | Description |
|--------|------|-------------|
| `PUT` | `/api/messages/:id/reactions` | Toggle reaction `{ emoji }` |
| `GET` | `/api/messages/:id/reactions` | List users who reacted with each emoji |

### Media
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/channels/:id/upload` | Upload media (image/video), returns `{ url, thumbnail }` |

### Read Receipts
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/channels/:id/read` | Mark channel as read up to `{ messageId }` |
| `GET` | `/api/channels/unread` | Get unread counts per channel |

---

## 5. Infrastructure Changes

### 5.1 New Dependencies

```json
{
  "socket.io": "^4.8.x",
  "ioredis": "^5.6.x",
  "@socket.io/redis-adapter": "^8.3.x",
  "multer-storage-cloudinary": "^4.0.0",
  "uuid": "^11.x"
}
```

### 5.2 Docker Compose Addition

```yaml
# docker-compose.yml — add Redis service
  redis:
    image: redis:7-alpine
    command: ["redis-server", "--maxmemory", "128mb", "--maxmemory-policy", "allkeys-lru"]
    volumes:
      - redis_data:/data
    restart: unless-stopped
    networks:
      - glunity_net

volumes:
  redis_data:
```

### 5.3 NGINX WebSocket Proxy

```nginx
# deploy/nginx/default.conf — add upstream for WS
location /socket.io/ {
    proxy_pass http://api:5000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_read_timeout 86400;
}
```

---

## 6. Backend Folder Structure (New Modules)

```
api/src/
├── app/
│   ├── modules/
│   │   ├── channels/                    # ENHANCED (already exists)
│   │   │   ├── channels.controller.js   # REST handlers
│   │   │   ├── channels.service.js      # Business logic
│   │   │   ├── channels.repository.js   # DB queries
│   │   │   ├── channels.mapper.js       # DTO transformations
│   │   │   ├── channels.schema.js       # Validation schemas
│   │   │   └── channels.routes.js       # Express routes
│   │   │
│   │   ├── messages/                    # NEW MODULE
│   │   │   ├── messages.controller.js
│   │   │   ├── messages.service.js
│   │   │   ├── messages.repository.js
│   │   │   ├── messages.mapper.js
│   │   │   ├── messages.schema.js
│   │   │   └── messages.routes.js
│   │   │
│   │   └── reactions/                   # NEW MODULE
│   │       ├── reactions.controller.js
│   │       ├── reactions.service.js
│   │       ├── reactions.repository.js
│   │       └── reactions.routes.js
│   │
│   ├── realtime/                        # NEW — Socket.IO layer
│   │   ├── socket.bootstrap.js          # Socket.IO server init + Redis adapter
│   │   ├── socket.auth.js               # JWT handshake middleware
│   │   ├── handlers/
│   │   │   ├── message.handler.js       # message:send, edit, delete, typing
│   │   │   ├── reaction.handler.js      # reaction:toggle
│   │   │   ├── channel.handler.js       # channel:join, leave
│   │   │   ├── presence.handler.js      # online/offline tracking
│   │   │   └── read-receipt.handler.js  # read:mark
│   │   └── emitters/
│   │       └── channel.emitter.js       # Broadcast helpers
│   │
│   └── bootstrap/
│       └── redis.bootstrap.js           # NEW — Redis client singleton
│
├── database/models/
│   ├── channel.model.js                 # ENHANCED
│   ├── message.model.js                 # ENHANCED
│   ├── reaction.model.js                # NEW
│   └── read-receipt.model.js            # NEW
```

---

## 7. Parallel Development Plan — Yassi & Rayen

> **Methodology**: Feature branches off `develop`, PRs with code review, 3 sprints of ~3 days each.

### Sprint 1 — Foundation (Days 1–3)

| Task | Owner | Branch | Dependencies |
|------|-------|--------|-------------|
| **Redis bootstrap** — `redis.bootstrap.js`, env config, Docker Compose addition | Yassi | `feat/redis-infra` | None |
| **Enhanced Channel model** — new schema fields (`type`, `participants.role`, `lastMessage`, `creatorId`) + migration script for existing data | Rayen | `feat/channel-model-v2` | None |
| **Socket.IO bootstrap** — `socket.bootstrap.js`, attach to HTTP server, Redis adapter, JWT auth handshake (`socket.auth.js`) | Yassi | `feat/socket-bootstrap` | `feat/redis-infra` |
| **Enhanced Message model** — new schema (`type`, `attachments`, `reelRef`, `replyTo`, `reactionCounts`, `editedAt`, `deletedAt`) | Rayen | `feat/message-model-v2` | None |
| **Reaction model + Read-Receipt model** — new schemas with indexes | Rayen | `feat/reaction-read-models` | None |
| **NGINX WS proxy config** — update `default.conf` for `/socket.io/` upgrade | Yassi | `feat/socket-bootstrap` | — |

> **Merge checkpoint**: Both merge to `develop` at end of Sprint 1. Both models and Socket.IO infra ready.

---

### Sprint 2 — Core Messaging (Days 4–6)

| Task | Owner | Branch | Dependencies |
|------|-------|--------|-------------|
| **Channel Service v2** — create group, get/create DM, add/remove participants, update channel, list user channels with unread counts | Rayen | `feat/channel-service-v2` | Sprint 1 models |
| **Channel REST routes v2** — all new endpoints (`POST /dm`, `PATCH /:id`, participant management, mute) | Rayen | `feat/channel-routes-v2` | `feat/channel-service-v2` |
| **Message handler** — `message.handler.js` socket events: `message:send`, `message:edit`, `message:delete`, `message:typing` with broadcast | Yassi | `feat/socket-message-handler` | Sprint 1 socket + models |
| **Message Service** — `messages.service.js` with cursor-based pagination, soft-delete, edit, pin/unpin | Yassi | `feat/message-service` | Sprint 1 models |
| **Message REST routes** — `GET /:id/messages` (cursor pagination), `PATCH /messages/:id`, `DELETE /messages/:id`, pin/unpin | Yassi | `feat/message-routes` | `feat/message-service` |
| **Channel socket handler** — `channel.handler.js`: join rooms, leave, member events broadcast | Rayen | `feat/socket-channel-handler` | Sprint 1 socket |

> **Merge checkpoint**: Full text messaging working end-to-end via both REST and WebSocket.

---

### Sprint 3 — Reactions, Media, Presence & Polish (Days 7–9)

| Task | Owner | Branch | Dependencies |
|------|-------|--------|-------------|
| **Reaction Service + Handler** — toggle reaction, update `reactionCounts` on Message atomically (`$inc`), broadcast `reaction:updated` | Yassi | `feat/reactions` | Sprint 2 |
| **Reaction REST** — `PUT /messages/:id/reactions`, `GET /messages/:id/reactions` | Yassi | `feat/reactions` | Sprint 2 |
| **Media upload endpoint** — `POST /channels/:id/upload` with Multer + Cloudinary, thumbnail generation, size validation (10MB img, 50MB video) | Rayen | `feat/media-upload` | Sprint 2 |
| **Reel sharing in messages** — `reelRef` population, validate reel ID exists, attach thumbnail/title metadata | Rayen | `feat/reel-share` | `feat/media-upload` |
| **Presence handler** — track online/offline in Redis SET, heartbeat ping, broadcast `presence:online`/`presence:offline` with `lastSeen` | Yassi | `feat/presence` | Sprint 1 Redis |
| **Read receipts** — `read-receipt.handler.js` + `POST /channels/:id/read` + `GET /channels/unread` aggregation | Rayen | `feat/read-receipts` | Sprint 2 |
| **Integration tests** — Socket.IO + REST end-to-end tests for core flows | Both | `feat/messaging-tests` | All above |

> **Final merge**: Full messaging microservice ready for frontend integration.

---

## 8. Key Engineering Decisions

### 8.1 Why Socket.IO over raw WebSockets?
- **Automatic reconnection** with exponential backoff — critical for mobile networks
- **Room abstraction** maps perfectly to channel IDs
- **Fallback to long-polling** for environments that block WS
- **Redis adapter** for horizontal scaling across multiple API pods
- **Acknowledgements** — built-in callback pattern for delivery confirmation

### 8.2 Cursor-Based Pagination (not offset)
Messages use `cursor` (last message `_id`) instead of `skip/limit`:
```
GET /api/channels/:id/messages?cursor=<lastMsgId>&limit=50&direction=before
```
- **O(1) performance** regardless of conversation length (vs O(n) with `skip`)
- **No missed messages** when new messages arrive during pagination
- **Natural infinite scroll** UX for the frontend team

### 8.3 Denormalized `lastMessage` on Channel
Embedding `lastMessage` in the Channel document avoids an expensive `$lookup` aggregation when listing the user's channel inbox. Updated atomically in the message service.

### 8.4 Denormalized `reactionCounts` on Message
Instead of querying the `Reaction` collection for every message render, we maintain a `Map<emoji, count>` directly on the Message document. Updated via `$inc` atomic operations on toggle.

### 8.5 Soft Deletes for Messages
Messages are never physically removed. `deletedAt` is set, and the content is replaced with a system placeholder. This preserves conversation continuity and reply threading.

### 8.6 Redis for Presence + Pub/Sub
- **Presence**: `SADD/SREM` on `presence:<userId>` keys with TTL for heartbeat expiry
- **Pub/Sub**: `@socket.io/redis-adapter` ensures socket events reach all API instances

---

## 9. Security Considerations

| Concern | Mitigation |
|---------|------------|
| **WebSocket Auth** | JWT verified on handshake; invalid token → immediate disconnect |
| **Channel Authorization** | Every socket event checks `participants.userId` membership before processing |
| **Rate Limiting** | Socket events throttled: max 10 messages/sec per user, 5 typing events/sec |
| **Input Sanitization** | All message content trimmed, HTML-stripped, max 4000 chars |
| **File Upload** | Multer fileFilter whitelist (jpg/png/gif/mp4/webm), max size enforced |
| **DM Privacy** | DM channels only accessible to the two participants — enforced at repository level |
| **Admin Escalation** | Only channel `owner` can change roles or delete the channel |

---

## 10. Environment Variables (New)

```env
# Redis
REDIS_URL=redis://redis:6379

# Socket.IO
SOCKET_CORS_ORIGINS=http://localhost:8081,http://localhost:3000

# Media Upload
MAX_IMAGE_SIZE=10485760        # 10MB
MAX_VIDEO_SIZE=52428800        # 50MB
CLOUDINARY_UPLOAD_PRESET=glunity_chat

# Presence
PRESENCE_HEARTBEAT_INTERVAL=30000   # 30s
PRESENCE_TIMEOUT=90000              # 90s before marking offline
```

---

## 11. Frontend Integration Contract

The frontend team needs these from us:

1. **Socket.IO client connection URL**: `ws://localhost:5000` (dev) or `wss://api.glunity.app` (prod)
2. **Auth**: Pass JWT in `socket.connect({ auth: { token } })`
3. **Event protocol table** (Section 3 above)
4. **REST endpoint docs** (Section 4 above) — we'll generate an OpenAPI spec
5. **Message DTO shape**:
```ts
interface MessageDTO {
  id: string;
  channelId: string;
  senderId: string;
  senderName: string;
  senderAvatarUrl: string | null;
  content: string;
  type: 'text' | 'media' | 'reel' | 'system';
  attachments: Array<{ url: string; type: string; thumbnail?: string; duration?: number }>;
  reelRef?: { reelId: string; thumbnailUrl: string; title: string };
  replyTo?: { messageId: string; senderName: string; preview: string };
  reactionCounts: Record<string, number>;
  myReactions: string[];  // emojis current user has reacted with
  editedAt: string | null;
  deletedAt: string | null;
  createdAt: string;
}
```

---

> [!IMPORTANT]
> This plan is designed so **Yassi focuses on the real-time/socket layer** (Socket.IO bootstrap, message handler, reactions, presence) and **Rayen focuses on the data/REST layer** (models, channel service, media upload, read receipts). The two tracks merge cleanly because they share the same models and service contracts.
