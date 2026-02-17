# Sellvio Chat WebSocket API Documentation

## Table of Contents

- [Connection](#connection)
- [Channel Types](#channel-types)
- [REST Endpoints (File Uploads)](#rest-endpoints-file-uploads)
- [Server Events](#server-events)
- [Channel Events](#channel-events)
- [Message Events](#message-events)
- [Reaction Events](#reaction-events)
- [Feedback Channel Events](#feedback-channel-events)
- [Verification Channel Events](#verification-channel-events)
- [Presence Events](#presence-events)
- [Error Handling](#error-handling)
- [Typical Flows](#typical-flows)

---

## Connection

**Namespace:** `/chat`

**Transport:** Socket.IO

**CORS:** All origins allowed

### Authentication

Provide a JWT token via one of the following methods:

1. **Handshake auth** (recommended):
   ```js
   const socket = io('https://api.example.com/chat', {
     auth: { token: 'your-jwt-token' }
   });
   ```

2. **Authorization header:**
   ```js
   const socket = io('https://api.example.com/chat', {
     extraHeaders: { authorization: 'Bearer your-jwt-token' }
   });
   ```

### On Successful Connection

The server emits `connected` to the client:

```json
{ "userId": 123 }
```

### On Failed Connection

The socket is immediately disconnected (no error event — the client receives a `disconnect` event).

---

## Channel Types

Each chat channel has a `channel_type_id` that determines its behavior:

| ID | Type           | Description                                                                 |
|----|----------------|-----------------------------------------------------------------------------|
| 1  | **General**    | Regular chat. All server members can read and write messages.               |
| 2  | **Rules**      | Read-only for members. Only the server admin (business) can send messages.  |
| 3  | **Feedback**   | Video submission & threaded review. No regular `message:send` allowed. Use `feedback:*` events. |
| 4  | **Verification** | Social post verification. No manual messages allowed. Use `verification:*` events. |

---

## REST Endpoints (File Uploads)

Binary file uploads are handled via REST before referencing URLs in WebSocket events.

### Upload Chat Images

```
POST /chat-servers/:serverId/channels/:channelId/images
```

- **Auth:** Bearer JWT
- **Content-Type:** `multipart/form-data`
- **Field:** `images` (array, max 5 files)
- **Max file size:** 10 MB per image
- **Allowed MIME types:** `image/jpeg`, `image/png`, `image/gif`, `image/webp`
- **Response:**
  ```json
  {
    "imageUrls": [
      "https://res.cloudinary.com/...",
      "https://res.cloudinary.com/..."
    ]
  }
  ```

Use the returned URLs in `message:send` or `feedback:reply` via the `imageUrls` field.

### Upload Feedback Video

```
POST /chat-servers/:serverId/channels/:channelId/feedback-video
```

- **Auth:** Bearer JWT
- **Content-Type:** `multipart/form-data`
- **Field:** `video` (single file)
- **Max file size:** 100 MB
- **Allowed MIME types:** `video/mp4`, `video/webm`, `video/quicktime`, `video/x-msvideo`
- **Response:**
  ```json
  {
    "videoUrl": "https://res.cloudinary.com/..."
  }
  ```

Use the returned URL in `feedback:submit` via the `videoUrl` field.

---

## Server Events

### `server:open` — Join a Chat Server

Join a server room to receive presence updates and channel events.

**Emit:**
```json
{ "serverId": 1 }
```

**Server behavior:**
- Validates membership or campaign ownership
- Joins the client to the server room
- Broadcasts updated online/offline presence to all server members
- Broadcasts channel-level presence for all channels

**No direct response.** You will receive `server:online` and `channel:online` broadcasts.

---

### `server:close` — Leave a Chat Server Room

Leave the server room (stops receiving presence updates). Does **not** remove membership.

**Emit:**
```json
{ "serverId": 1 }
```

**Server behavior:**
- Removes client from the server room
- Broadcasts updated presence

---

### `server:leave` — Leave a Chat Server (Permanently)

Remove yourself from the server. Deletes your server membership and all channel memberships. Admins cannot leave.

**Emit:**
```json
{ "serverId": 1 }
```

**Listen — `server:left`:**
```json
{ "serverId": 1 }
```

**Errors:**
- `"You are not a member of this server"`
- `"Admins cannot leave the server"`

---

### `server:kick` — Kick a Member (Admin Only)

Remove another user from the server. Admins cannot be kicked.

**Emit:**
```json
{ "serverId": 1, "userId": 42 }
```

**Listen — `server:kick:ok`** (sent to the admin who kicked):
```json
{ "serverId": 1, "userId": 42 }
```

**Listen — `server:kicked`** (sent to the kicked user):
```json
{ "serverId": 1 }
```

**Errors:**
- `"Forbidden: admin only"`
- `"User is not in this server"`
- `"Cannot kick another admin"`

---

## Channel Events

### `channel:open` — Join a Channel

Join a channel room. Loads the latest 50 messages with images, reactions, and reply info.

**Emit:**
```json
{ "serverId": 1, "channelId": 10 }
```

**Listen — `joined`:**
```json
{ "channelId": 10 }
```

**Listen — `message:history`** (initial batch):
```json
{
  "channelId": 10,
  "messages": [
    {
      "id": 100,
      "channelId": 10,
      "senderId": 5,
      "content": "Hello!",
      "createdAt": "2025-01-15T10:30:00.000Z",
      "images": ["https://res.cloudinary.com/..."],
      "reactions": [
        {
          "emojiId": 1,
          "emoji": "thumbsup",
          "emojiUrl": "https://example.com/thumbsup.png",
          "users": [
            { "id": 5, "firstName": "John" }
          ]
        }
      ],
      "replyToId": null,
      "replyTo": null,
      "senderFirstName": "John",
      "senderLastName": "Doe",
      "senderImageUrl": "https://res.cloudinary.com/..."
    }
  ],
  "nextBeforeId": 51,
  "hasMore": true
}
```

**Also triggers:** `channel:online` broadcast to channel members.

---

### `channel:close` — Leave a Channel Room

Leave the channel room (stops receiving messages). Does **not** remove channel membership.

**Emit:**
```json
{ "serverId": 1, "channelId": 10 }
```

**Listen — `left`:**
```json
{ "channelId": 10 }
```

---

## Message Events

### `message:send` — Send a Message

Send a message to a general or rules channel. Supports text, images, and replies.

**Restrictions:**
- **General (type 1):** All server members can send
- **Rules (type 2):** Admin only
- **Feedback (type 3):** Blocked — use `feedback:reply` instead
- **Verification (type 4):** Blocked — no manual messages

**Emit:**
```json
{
  "channelId": 10,
  "content": "Hello everyone!",
  "imageUrls": ["https://res.cloudinary.com/..."],
  "replyToId": 99
}
```

| Field       | Type       | Required | Description                              |
|-------------|------------|----------|------------------------------------------|
| `channelId` | `number`   | Yes      | Target channel ID                        |
| `content`   | `string`   | Yes*     | Message text (* can be empty if images)  |
| `imageUrls` | `string[]` | No       | Cloudinary URLs (max 5, upload via REST) |
| `replyToId` | `number`   | No       | Message ID to reply to (same channel)    |

**Listen — `message:ack`** (sent only to sender):
```json
{ "id": 101 }
```

**Listen — `message`** (broadcast to all channel members):
```json
{
  "id": 101,
  "channelId": 10,
  "senderId": 5,
  "content": "Hello everyone!",
  "createdAt": "2025-01-15T10:35:00.000Z",
  "pinned": false,
  "images": ["https://res.cloudinary.com/..."],
  "reactions": [],
  "replyToId": 99,
  "replyTo": {
    "id": 99,
    "content": "Original message text",
    "senderId": 3,
    "senderFirstName": "Jane"
  },
  "senderFirstName": "John",
  "senderLastName": "Doe",
  "senderImageUrl": "https://res.cloudinary.com/..."
}
```

**Errors:**
- `"Maximum 5 images per message"`
- `"Invalid image URL"` — only `https://res.cloudinary.com/` URLs are accepted
- `"Only admins can write in this channel"` — rules channel
- `"Use feedback:reply to send messages in feedback channels"` — feedback channel
- `"Messages cannot be sent in verification channels"` — verification channel
- `"Reply target not found in this channel"`

---

### `message:history` — Load Older Messages

Paginated message loading with cursor-based pagination.

**Emit:**
```json
{
  "channelId": 10,
  "beforeId": 51,
  "limit": 50
}
```

| Field       | Type     | Required | Description                            |
|-------------|----------|----------|----------------------------------------|
| `channelId` | `number` | Yes      | Channel ID                             |
| `beforeId`  | `number` | No       | Load messages before this ID (cursor)  |
| `limit`     | `number` | No       | Number of messages (1–200, default 50) |

**Listen — `message:history`:**
```json
{
  "channelId": 10,
  "messages": [ /* same shape as channel:open messages */ ],
  "nextBeforeId": 1,
  "hasMore": false
}
```

Use `nextBeforeId` as the `beforeId` for the next page. Stop when `hasMore` is `false`.

---

### `message:pin` — Pin/Unpin a Message (Admin Only)

Toggle the pinned state of a message.

**Emit:**
```json
{
  "channelId": 10,
  "messageId": 100,
  "pinned": true
}
```

| Field       | Type      | Required | Description                |
|-------------|-----------|----------|----------------------------|
| `channelId` | `number`  | Yes      | Channel ID                 |
| `messageId` | `number`  | Yes      | Message ID to pin/unpin    |
| `pinned`    | `boolean` | Yes      | `true` to pin, `false` to unpin |

**Listen — `message:pin:ok`** (sent to the admin):
```json
{ "messageId": 100, "pinned": true }
```

**Listen — `message:pinned`** (broadcast to all channel members):
```json
{
  "id": 100,
  "channelId": 10,
  "senderId": 5,
  "content": "Important announcement",
  "createdAt": "2025-01-15T10:30:00.000Z",
  "pinned": true,
  "images": [],
  "reactions": [],
  "replyToId": null,
  "replyTo": null
}
```

**Errors:**
- `"Forbidden: admin only"`
- `"Message not found in this channel"`

---

### `message:delete` — Delete a Message

Delete a message. Users can delete their own messages. Admins can delete any message.

**Emit:**
```json
{
  "channelId": 10,
  "messageId": 100
}
```

**Listen — `message:delete:ok`** (sent to the requester):
```json
{ "messageId": 100 }
```

**Listen — `message:deleted`** (broadcast to all channel members):
```json
{ "channelId": 10, "messageId": 100 }
```

**Errors:**
- `"Message not found in this channel"`
- `"You can only delete your own messages"` — non-admin trying to delete another user's message

---

## Reaction Events

### `reaction:add` — Add Emoji Reaction

Add an emoji reaction to a message. If the same user already reacted with the same emoji, the action is idempotent (no error, no duplicate).

**Emit:**
```json
{
  "channelId": 10,
  "messageId": 100,
  "emojiId": 1
}
```

**Listen — `message:reaction`** (broadcast to all channel members):
```json
{
  "channelId": 10,
  "messageId": 100,
  "emojiId": 1,
  "emoji": "thumbsup",
  "emojiUrl": "https://example.com/thumbsup.png",
  "userId": 5,
  "action": "add"
}
```

**Errors:**
- `"Message not found in this channel"`
- `"Emoji not found"`

---

### `reaction:remove` — Remove Emoji Reaction

Remove your emoji reaction from a message.

**Emit:**
```json
{
  "channelId": 10,
  "messageId": 100,
  "emojiId": 1
}
```

**Listen — `message:reaction:removed`** (broadcast to all channel members):
```json
{
  "channelId": 10,
  "messageId": 100,
  "emojiId": 1,
  "userId": 5
}
```

---

## Feedback Channel Events

Feedback channels (`channel_type_id = 3`) are used for video submission and review. Regular `message:send` is blocked in these channels.

### Workflow

1. **Creator** uploads video file via REST (`POST .../feedback-video`) to get a Cloudinary URL
2. **Creator** submits video metadata via `feedback:submit`
3. Both parties load video list via `feedback:videos`
4. Both parties load/send threaded messages via `feedback:thread` and `feedback:reply`
5. **Admin** approves or rejects via `feedback:review`

---

### `feedback:submit` — Submit a Video (Creator Only)

Submit a video for review. Only creators (non-admin members) can submit.

**Emit:**
```json
{
  "channelId": 10,
  "videoUrl": "https://res.cloudinary.com/...",
  "coverUrl": "https://res.cloudinary.com/...",
  "title": "Product Review Video",
  "description": "30 second product review",
  "durationSeconds": 30,
  "fileSize": 15000000
}
```

| Field             | Type     | Required | Description                           |
|-------------------|----------|----------|---------------------------------------|
| `channelId`       | `number` | Yes      | Feedback channel ID                   |
| `videoUrl`        | `string` | Yes      | Cloudinary URL from REST upload       |
| `coverUrl`        | `string` | No       | Video cover/thumbnail URL             |
| `title`           | `string` | Yes      | Video title                           |
| `description`     | `string` | No       | Video description                     |
| `durationSeconds` | `number` | No       | Video duration in seconds             |
| `fileSize`        | `number` | No       | File size in bytes                    |

**Listen — `feedback:submitted`** (broadcast to all channel members):
```json
{
  "channelId": 10,
  "video": {
    "id": 50,
    "title": "Product Review Video",
    "description": "30 second product review",
    "videoUrl": "https://res.cloudinary.com/...",
    "coverUrl": "https://res.cloudinary.com/...",
    "status": "under_review",
    "creatorId": 5,
    "creatorFirstName": "John",
    "creatorLastName": "Doe",
    "creatorImageUrl": "https://res.cloudinary.com/...",
    "createdAt": "2025-01-15T10:30:00.000Z",
    "messageCount": 0
  }
}
```

**Errors:**
- `"This is not a feedback channel"`
- `"Only creators can submit videos"` — admins cannot submit

---

### `feedback:videos` — List Submitted Videos

Load all videos submitted for this campaign's feedback channel.

**Emit:**
```json
{ "channelId": 10 }
```

**Listen — `feedback:videos`:**
```json
{
  "channelId": 10,
  "videos": [
    {
      "id": 50,
      "title": "Product Review Video",
      "description": "30 second product review",
      "videoUrl": "https://res.cloudinary.com/...",
      "coverUrl": "https://res.cloudinary.com/...",
      "status": "under_review",
      "creatorId": 5,
      "creatorFirstName": "John",
      "creatorLastName": "Doe",
      "creatorImageUrl": "https://res.cloudinary.com/...",
      "messageCount": 3,
      "createdAt": "2025-01-15T10:30:00.000Z"
    }
  ]
}
```

**Video status values:** `under_review`, `approved`, `rejected`

---

### `feedback:thread` — Load Video Thread Messages

Load threaded discussion messages for a specific video. Supports cursor-based pagination.

**Emit:**
```json
{
  "channelId": 10,
  "campaignVideoId": 50,
  "beforeId": 200,
  "limit": 50
}
```

| Field             | Type     | Required | Description                            |
|-------------------|----------|----------|----------------------------------------|
| `channelId`       | `number` | Yes      | Feedback channel ID                    |
| `campaignVideoId` | `number` | Yes      | Video ID to load thread for            |
| `beforeId`        | `number` | No       | Load messages before this ID (cursor)  |
| `limit`           | `number` | No       | Number of messages (1–200, default 50) |

**Listen — `feedback:thread`:**
```json
{
  "channelId": 10,
  "campaignVideoId": 50,
  "messages": [
    {
      "id": 150,
      "channelId": 10,
      "senderId": 5,
      "content": "Here's the updated version",
      "createdAt": "2025-01-15T11:00:00.000Z",
      "images": [],
      "reactions": [],
      "replyToId": null,
      "replyTo": null,
      "senderFirstName": "John",
      "senderLastName": "Doe",
      "senderImageUrl": "https://res.cloudinary.com/..."
    }
  ],
  "nextBeforeId": 150,
  "hasMore": false
}
```

---

### `feedback:reply` — Send a Thread Message

Send a message in a video's discussion thread. Only the video's creator and the server admin can reply.

**Emit:**
```json
{
  "channelId": 10,
  "campaignVideoId": 50,
  "content": "Please adjust the intro",
  "imageUrls": ["https://res.cloudinary.com/..."],
  "replyToId": 150
}
```

| Field             | Type       | Required | Description                              |
|-------------------|------------|----------|------------------------------------------|
| `channelId`       | `number`   | Yes      | Feedback channel ID                      |
| `campaignVideoId` | `number`   | Yes      | Video ID for this thread                 |
| `content`         | `string`   | Yes*     | Message text (* can be empty if images)  |
| `imageUrls`       | `string[]` | No       | Cloudinary URLs (max 5, upload via REST) |
| `replyToId`       | `number`   | No       | Message ID to reply to                   |

**Listen — `feedback:reply:ack`** (sent to the sender):
```json
{ "id": 151 }
```

**Listen — `feedback:message`** (broadcast to all channel members):
```json
{
  "id": 151,
  "channelId": 10,
  "senderId": 1,
  "content": "Please adjust the intro",
  "createdAt": "2025-01-15T11:05:00.000Z",
  "images": ["https://res.cloudinary.com/..."],
  "reactions": [],
  "replyToId": 150,
  "replyTo": {
    "id": 150,
    "content": "Here's the updated version",
    "senderId": 5,
    "senderFirstName": "John"
  },
  "campaignVideoId": 50,
  "senderFirstName": "Acme Corp",
  "senderLastName": null,
  "senderImageUrl": "https://res.cloudinary.com/..."
}
```

**Errors:**
- `"Video not found"`
- `"Only the video creator or admin can reply"`

---

### `feedback:review` — Approve/Reject Video (Admin Only)

Admin approves or rejects a submitted video. Updates the `campaign_videos` status.

**Emit:**
```json
{
  "channelId": 10,
  "campaignVideoId": 50,
  "status": "approved",
  "comment": "Looks great!"
}
```

| Field             | Type     | Required | Description                                |
|-------------------|----------|----------|--------------------------------------------|
| `channelId`       | `number` | Yes      | Feedback channel ID                        |
| `campaignVideoId` | `number` | Yes      | Video ID to review                         |
| `status`          | `string` | Yes      | `"approved"` or `"rejected"`               |
| `comment`         | `string` | No       | Review comment (also posted as thread msg) |

**Listen — `feedback:review:ok`** (sent to the admin):
```json
{ "campaignVideoId": 50, "status": "approved" }
```

**Listen — `feedback:reviewed`** (broadcast to all channel members):
```json
{
  "channelId": 10,
  "campaignVideoId": 50,
  "status": "approved",
  "comment": "Looks great!",
  "reviewedBy": 1
}
```

**Errors:**
- `"Invalid review data (status must be approved or rejected)"`
- `"This is not a feedback channel"`
- `"Forbidden: admin only"`
- `"Video not found in this campaign"`

---

## Verification Channel Events

Verification channels (`channel_type_id = 4`) are used to verify that approved videos have been posted to social media platforms. No manual messaging is allowed.

### Workflow

1. After a video is approved in the feedback channel, the creator posts it to social media (TikTok, Instagram, etc.)
2. Social post records are created in the system (`video_social_posts`)
3. Both parties view the list via `verification:videos`
4. **Admin** verifies or rejects each social post via `verification:review`

---

### `verification:videos` — List Videos with Social Posts

Load approved videos that have associated social media posts.

**Emit:**
```json
{ "channelId": 15 }
```

**Listen — `verification:videos`:**
```json
{
  "channelId": 15,
  "videos": [
    {
      "id": 50,
      "title": "Product Review Video",
      "videoUrl": "https://res.cloudinary.com/...",
      "coverUrl": "https://res.cloudinary.com/...",
      "creatorId": 5,
      "creatorFirstName": "John",
      "creatorLastName": "Doe",
      "creatorImageUrl": "https://res.cloudinary.com/...",
      "createdAt": "2025-01-15T10:30:00.000Z",
      "socialPosts": [
        {
          "id": 10,
          "platform": "tiktok",
          "postUrl": "https://tiktok.com/@user/video/123",
          "postedAt": "2025-01-16T09:00:00.000Z",
          "isVerified": false
        },
        {
          "id": 11,
          "platform": "instagram",
          "postUrl": "https://instagram.com/p/abc123",
          "postedAt": "2025-01-16T09:30:00.000Z",
          "isVerified": true
        }
      ]
    }
  ]
}
```

**Errors:**
- `"This is not a verification channel"`

---

### `verification:review` — Verify/Reject Social Post (Admin Only)

Admin marks a social media post as verified or not verified.

**Emit:**
```json
{
  "channelId": 15,
  "socialPostId": 10,
  "verified": true
}
```

| Field          | Type      | Required | Description                              |
|----------------|-----------|----------|------------------------------------------|
| `channelId`    | `number`  | Yes      | Verification channel ID                  |
| `socialPostId` | `number`  | Yes      | Social post ID to verify                 |
| `verified`     | `boolean` | Yes      | `true` to verify, `false` to un-verify   |

**Listen — `verification:review:ok`** (sent to the admin):
```json
{ "socialPostId": 10, "verified": true }
```

**Listen — `verification:reviewed`** (broadcast to all channel members):
```json
{
  "channelId": 15,
  "socialPostId": 10,
  "verified": true,
  "reviewedBy": 1
}
```

**Errors:**
- `"This is not a verification channel"`
- `"Forbidden: admin only"`
- `"Social post not found in this campaign"`

---

## Presence Events

Presence events are automatically broadcast when users join/leave server or channel rooms.

### `server:online` — Server Presence

Broadcast to the server room whenever a user joins, leaves, or disconnects.

**Listen — `server:online`:**
```json
{
  "serverId": 1,
  "onlineUsers": [
    {
      "users": {
        "id": 5,
        "email": "john@example.com",
        "user_type_id": 2,
        "first_name": "John",
        "last_name": "Doe",
        "company_name": null,
        "profile_image_url": "https://res.cloudinary.com/..."
      }
    }
  ],
  "offlineUsers": [
    {
      "users": {
        "id": 3,
        "email": "jane@example.com",
        "user_type_id": 2,
        "first_name": "Jane",
        "last_name": "Smith",
        "company_name": null,
        "profile_image_url": null
      }
    }
  ]
}
```

---

### `channel:online` — Channel Presence

Broadcast to the channel room when presence changes.

**Listen — `channel:online`:**
```json
{
  "serverId": 1,
  "channelId": 10,
  "permitedUsers": [
    {
      "users": {
        "id": 5,
        "email": "john@example.com",
        "user_type_id": 2,
        "first_name": "John",
        "last_name": "Doe",
        "company_name": null,
        "profile_image_url": "https://res.cloudinary.com/..."
      }
    }
  ],
  "onlineUsers": [ /* same shape as permitedUsers */ ],
  "offlineUsers": [ /* same shape as permitedUsers */ ]
}
```

`permitedUsers` includes all users who can see the channel (for private channels, only members + admins).

---

## Error Handling

All errors are emitted on the `error` event:

```json
{ "message": "Human-readable error description" }
```

**Listen:**
```js
socket.on('error', (data) => {
  console.error('Chat error:', data.message);
});
```

### Common Error Messages

| Error Message                                        | Cause                                              |
|------------------------------------------------------|-----------------------------------------------------|
| `"Unauthorized"`                                     | Missing or invalid auth token / not authenticated    |
| `"Forbidden"`                                        | No access to the server or channel                   |
| `"Forbidden: admin only"`                            | Action requires admin role                           |
| `"Invalid server id"`                                | Missing or invalid `serverId`                        |
| `"Invalid channel id"`                               | Missing or invalid `channelId`                       |
| `"Invalid message"`                                  | Empty content with no images                         |
| `"Maximum 5 images per message"`                     | Too many images                                      |
| `"Invalid image URL"`                                | Non-Cloudinary URL provided                          |
| `"Only admins can write in this channel"`            | Non-admin trying to write in rules channel           |
| `"Use feedback:reply to send messages in feedback channels"` | Using `message:send` in a feedback channel  |
| `"Messages cannot be sent in verification channels"` | Using `message:send` in a verification channel      |
| `"Reply target not found in this channel"`           | `replyToId` doesn't exist in the channel             |
| `"Admins cannot leave the server"`                   | Admin trying to `server:leave`                       |
| `"Cannot kick another admin"`                        | Trying to kick an admin user                         |
| `"Only creators can submit videos"`                  | Admin trying to use `feedback:submit`                |
| `"Only the video creator or admin can reply"`        | Unauthorized user trying `feedback:reply`            |
| `"Emoji not found"`                                  | Invalid `emojiId`                                    |

---

## Typical Flows

### Flow 1: Open Server & Channel, Send Messages

```
Client                          Server
  |                                |
  |-- server:open {serverId}------>|
  |<-- server:online --------------|  (presence broadcast)
  |<-- channel:online (per ch) ----|  (for each channel)
  |                                |
  |-- channel:open {serverId, ---->|
  |       channelId}               |
  |<-- joined {channelId} --------|
  |<-- message:history ------------|  (last 50 messages)
  |<-- channel:online ------------|  (channel presence)
  |                                |
  |-- message:send {channelId, --->|
  |       content, imageUrls}      |
  |<-- message:ack {id} ----------|  (to sender only)
  |<-- message {full message} ----|  (to all in channel)
  |                                |
  |-- message:history {beforeId}-->|  (load older)
  |<-- message:history ------------|
```

### Flow 2: Feedback Video Submission & Review

```
Creator                         Server                          Admin
  |                                |                               |
  |-- POST /feedback-video ------->|                               |
  |<-- { videoUrl } ---------------|                               |
  |                                |                               |
  |-- feedback:submit {videoUrl,-->|                               |
  |       title, channelId}        |                               |
  |                                |-- feedback:submitted -------->|
  |<-- feedback:submitted ---------|                               |
  |                                |                               |
  |-- feedback:videos ------------>|                               |
  |<-- feedback:videos ------------|                               |
  |                                |                               |
  |-- feedback:reply {content, --->|                               |
  |       campaignVideoId}         |                               |
  |<-- feedback:reply:ack ---------|                               |
  |                                |-- feedback:message ---------->|
  |<-- feedback:message -----------|                               |
  |                                |                               |
  |                                |<-- feedback:reply {content}---|
  |                                |-- feedback:reply:ack -------->|
  |<-- feedback:message -----------|                               |
  |                                |                               |
  |                                |<-- feedback:review {approved}-|
  |                                |-- feedback:review:ok -------->|
  |<-- feedback:reviewed ----------|                               |
```

### Flow 3: Verification

```
Admin                           Server                          Creator
  |                                |                               |
  |-- verification:videos -------->|                               |
  |<-- verification:videos --------|  (approved videos with        |
  |                                |   social post links)          |
  |                                |                               |
  |-- verification:review -------->|                               |
  |       {socialPostId, true}     |                               |
  |<-- verification:review:ok -----|                               |
  |                                |-- verification:reviewed ----->|
  |<-- verification:reviewed ------|                               |
```

### Flow 4: Reactions

```
Client                          Server
  |                                |
  |-- reaction:add {channelId, --->|
  |       messageId, emojiId}      |
  |<-- message:reaction -----------|  (broadcast to channel)
  |                                |
  |-- reaction:remove {same} ----->|
  |<-- message:reaction:removed ---|  (broadcast to channel)
```

---

## Data Types Reference

### Message Object

```typescript
interface Message {
  id: number;
  channelId: number;
  senderId: number;
  content: string;
  createdAt: string;           // ISO 8601
  pinned?: boolean;
  images: string[];            // Cloudinary URLs
  reactions: Reaction[];
  replyToId: number | null;
  replyTo: ReplyTo | null;
  senderFirstName: string | null;
  senderLastName: string | null;
  senderImageUrl: string | null;
  campaignVideoId?: number;    // Only in feedback threads
}
```

### Reaction Object

```typescript
interface Reaction {
  emojiId: number;
  emoji: string;               // Emoji name
  emojiUrl: string;            // Emoji image URL
  users: {
    id: number;
    firstName: string | null;
  }[];
}
```

### ReplyTo Object

```typescript
interface ReplyTo {
  id: number;
  content: string;
  senderId: number;
  senderFirstName: string | null;
}
```

### Video Object (Feedback)

```typescript
interface FeedbackVideo {
  id: number;
  title: string;
  description: string | null;
  videoUrl: string;
  coverUrl: string | null;
  status: 'under_review' | 'approved' | 'rejected';
  creatorId: number;
  creatorFirstName: string | null;
  creatorLastName: string | null;
  creatorImageUrl: string | null;
  messageCount: number;
  createdAt: string;           // ISO 8601
}
```

### Video Object (Verification)

```typescript
interface VerificationVideo {
  id: number;
  title: string;
  videoUrl: string;
  coverUrl: string | null;
  creatorId: number;
  creatorFirstName: string | null;
  creatorLastName: string | null;
  creatorImageUrl: string | null;
  createdAt: string;           // ISO 8601
  socialPosts: SocialPost[];
}

interface SocialPost {
  id: number;
  platform: string;            // e.g. "tiktok", "instagram"
  postUrl: string;
  postedAt: string | null;     // ISO 8601
  isVerified: boolean;
}
```

### User Presence Object

```typescript
interface PresenceUser {
  users: {
    id: number;
    email: string;
    user_type_id: number;
    first_name: string | null;
    last_name: string | null;
    company_name: string | null;
    profile_image_url: string | null;
  };
}
```

---

## Events Summary Table

### Events You Emit (Client -> Server)

| Event                  | Description                         | Auth Required | Admin Only |
|------------------------|-------------------------------------|:------------:|:---------:|
| `server:open`          | Join server room                    | Yes          | No        |
| `server:close`         | Leave server room                   | No           | No        |
| `server:leave`         | Leave server permanently            | Yes          | No*       |
| `server:kick`          | Kick a member                       | Yes          | Yes       |
| `channel:open`         | Join channel room                   | Yes          | No        |
| `channel:close`        | Leave channel room                  | No           | No        |
| `message:send`         | Send a message                      | Yes          | No**      |
| `message:history`      | Load older messages                 | Yes          | No        |
| `message:pin`          | Pin/unpin a message                 | Yes          | Yes       |
| `message:delete`       | Delete a message                    | Yes          | No***     |
| `reaction:add`         | Add emoji reaction                  | Yes          | No        |
| `reaction:remove`      | Remove emoji reaction               | Yes          | No        |
| `feedback:submit`      | Submit video for review             | Yes          | No****    |
| `feedback:videos`      | List submitted videos               | Yes          | No        |
| `feedback:thread`      | Load video thread messages          | Yes          | No        |
| `feedback:reply`       | Reply in video thread               | Yes          | No*****   |
| `feedback:review`      | Approve/reject video                | Yes          | Yes       |
| `verification:videos`  | List videos with social posts       | Yes          | No        |
| `verification:review`  | Verify/reject social post           | Yes          | Yes       |

\* Admins cannot leave
\** Admin-only in rules channels
\*** Non-admins can only delete their own messages
\**** Creator-only (admins cannot submit)
\***** Only video creator and admin can reply

### Events You Listen (Server -> Client)

| Event                      | Sent To              | Description                           |
|----------------------------|----------------------|---------------------------------------|
| `connected`                | Connecting client    | Authentication successful             |
| `error`                    | Requesting client    | Error occurred                        |
| `joined`                   | Requesting client    | Joined a channel room                 |
| `left`                     | Requesting client    | Left a channel room                   |
| `server:left`              | Requesting client    | Left server permanently               |
| `server:kicked`            | Kicked user          | You were kicked from a server         |
| `server:kick:ok`           | Admin who kicked     | Kick confirmed                        |
| `server:online`            | Server room          | Server presence update                |
| `channel:online`           | Channel room         | Channel presence update               |
| `message`                  | Channel room         | New message in channel                |
| `message:ack`              | Sender only          | Message send confirmed                |
| `message:history`          | Requesting client    | Message history batch                 |
| `message:pinned`           | Channel room         | Message pin state changed             |
| `message:pin:ok`           | Admin who pinned     | Pin/unpin confirmed                   |
| `message:deleted`          | Channel room         | Message was deleted                   |
| `message:delete:ok`        | Requester            | Delete confirmed                      |
| `message:reaction`         | Channel room         | Reaction added                        |
| `message:reaction:removed` | Channel room         | Reaction removed                      |
| `feedback:submitted`       | Channel room         | New video submitted                   |
| `feedback:videos`          | Requesting client    | Video list for feedback channel       |
| `feedback:thread`          | Requesting client    | Thread messages for a video           |
| `feedback:message`         | Channel room         | New message in video thread           |
| `feedback:reply:ack`       | Sender only          | Thread reply confirmed                |
| `feedback:reviewed`        | Channel room         | Video review status changed           |
| `feedback:review:ok`       | Admin who reviewed   | Review confirmed                      |
| `verification:videos`      | Requesting client    | Videos with social posts              |
| `verification:reviewed`    | Channel room         | Social post verification changed      |
| `verification:review:ok`   | Admin who verified   | Verification confirmed                |
