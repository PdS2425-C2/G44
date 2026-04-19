# Ruggine Backend

## Table of Contents

- [Ruggine Backend](#ruggine-backend)
  - [Table of Contents](#table-of-contents)
  - [Data Models](#data-models)
    - [user](#user)
    - [chat](#chat)
    - [association](#association)
    - [message](#message)
    - [request](#request)
  - [Demo Users](#demo-users)
  - [API Reference](#api-reference)
    - [Sessions](#sessions)
      - [POST /api/sessions](#post-apisessions)
      - [GET /api/sessions](#get-apisessions)
      - [DELETE /api/sessions](#delete-apisessions)
    - [Users](#users)
      - [GET /api/users](#get-apiusers)
      - [POST /api/users](#post-apiusers)
    - [Chats](#chats)
      - [GET /api/chats](#get-apichats)
      - [POST /api/chats](#post-apichats)
      - [POST /api/chats/private](#post-apichatsprivate)
      - [GET /api/chats/:chat\_id/participants](#get-apichatschat_idparticipants)
      - [PATCH /api/chats/:chat\_id/read](#patch-apichatschat_idread)
      - [DELETE /api/chats/:chat\_id/members/me](#delete-apichatschat_idmembersme)
    - [Messages](#messages)
      - [GET /api/chats/:chat\_id/messages](#get-apichatschat_idmessages)
      - [POST /api/chats/:chat\_id/messages](#post-apichatschat_idmessages)
    - [Requests](#requests)
      - [GET /api/requests](#get-apirequests)
      - [POST /api/chats/:chat\_id/requests](#post-apichatschat_idrequests)
      - [PATCH /api/requests/:id](#patch-apirequestsid)
  - [WebSocket](#websocket)
      - [GET /ws/notifications](#get-wsnotifications)
  - [Error Reference](#error-reference)

---

## Data Models

The following tables describe the database schema as inferred from the queries and DTOs throughout the codebase.

---

### user

Represents a registered user.

| Column          | Type    | Nullable | Description                           |
| --------------- | ------- | -------- | ------------------------------------- |
| `id`            | integer | No       | Primary key, auto-incremented         |
| `username`      | text    | No       | Unique login handle                   |
| `name`          | text    | Yes      | Optional display name shown in the UI |
| `password_hash` | text    | No       | Hash of the user's password           |

---

### chat

Represents either a group chat or a private (one-to-one) conversation.

| Column       | Type    | Nullable | Description                                                        |
| ------------ | ------- | -------- | ------------------------------------------------------------------ |
| `id`         | integer | No       | Primary key, auto-incremented                                      |
| `name`       | text    | Yes      | Display name; always `NULL` for private chats                      |
| `is_group`   | integer | No       | `1` for group chats, `0` for private chats                         |
| `created_at` | text    | No       | Creation timestamp in ISO 8601 format (`YYYY-MM-DDTHH:MM:SS.sssZ`) |

---

### association

Join table that links users to chats. Each row represents a membership and tracks per-user read state.

| Column         | Type    | Nullable | Description                                                                                        |
| -------------- | ------- | -------- | -------------------------------------------------------------------------------------------------- |
| `user_id`      | integer | No       | Foreign key referencing `user.id`                                                                  |
| `chat_id`      | integer | No       | Foreign key referencing `chat.id`                                                                  |
| `join_at`      | text    | No       | Timestamp of when the user joined the chat (ISO 8601)                                              |
| `last_read_at` | text    | Yes      | Timestamp of the last read action by this user; used to compute `unread_count` in `GET /api/chats` |

---

### message

Represents a single message sent inside a chat.

| Column    | Type    | Nullable | Description                                    |
| --------- | ------- | -------- | ---------------------------------------------- |
| `id`      | integer | No       | Primary key, auto-incremented                  |
| `chat_id` | integer | No       | Foreign key referencing `chat.id`              |
| `user_id` | integer | No       | Foreign key referencing `user.id` (the sender) |
| `content` | text    | No       | Text body of the message                       |
| `sent_at` | text    | No       | Send timestamp in ISO 8601 format              |

---

### request

Represents a pending invitation sent by a chat member to a user who is not yet in the chat.

| Column       | Type    | Nullable | Description                                             |
| ------------ | ------- | -------- | ------------------------------------------------------- |
| `id`         | integer | No       | Primary key, auto-incremented                           |
| `inviter_id` | integer | No       | Foreign key referencing `user.id` (who sent the invite) |
| `invitee_id` | integer | No       | Foreign key referencing `user.id` (who received it)     |
| `chat_id`    | integer | No       | Foreign key referencing `chat.id`                       |
| `created_at` | text    | No       | Timestamp of when the request was created (ISO 8601)    |

A request row is deleted once the invitee accepts or declines via `PATCH /api/requests/:id`.

---

## Demo Users

The following accounts are pre-seeded in the database for testing purposes.

| Name            | Username | Password   |
| --------------- | -------- | ---------- |
| Steve Jobs      | `stewy`  | `password` |
| Alan Turing     | `turro`  | `password` |
| Bill Gates      | `billy`  | `password` |
| Edsger Dijkstra | `eddy`   | `password` |

---

## API Reference

### Sessions

---

#### POST /api/sessions

Authenticates a user and issues a session cookie.

- **Request Body:**

    ```json
    {
        "username": "string",
        "password": "string"
    }
    ```

- **Response** `200 OK`:

    ```json
    {
        "id": "int",
        "name": "string",
        "username": "string"
    }
    ```

    A `Set-Cookie: sid=<token>` header is also returned.

- **Errors:**
    - `400 Bad Request` — username or password field is empty
    - `401 Unauthorized` — user not found or password mismatch
    - `500 Internal Server Error` — unexpected server error

---

#### GET /api/sessions

Returns the currently authenticated user. Can be used as a "whoami" or session-check endpoint.

- **Auth:** Required (session cookie)

- **Response** `200 OK`:

    ```json
    {
        "id": "int",
        "name": "string",
        "username": "string"
    }
    ```

- **Errors:**
    - `401 Unauthorized` — missing or invalid session cookie
    - `500 Internal Server Error` — unexpected server error

---

#### DELETE /api/sessions

Logs out the current user by clearing the session cookie.

- **Auth:** Not strictly required (the cookie is cleared regardless)

- **Response** `204 No Content`

---

### Users

---

#### GET /api/users

Searches for users by username or display name. The authenticated user is excluded from results.

- **Auth:** Required (session cookie)

- **Query Parameters:**

    | Parameter | Type   | Required | Default | Description                                                    |
    | --------- | ------ | -------- | ------- | -------------------------------------------------------------- |
    | `query`   | string | No       | `""`    | Substring to match against username or name (case-insensitive) |
    | `limit`   | int    | No       | `10`    | Maximum number of results to return                            |

- **Response** `200 OK`:

    ```json
    [
        {
            "id": "int",
            "name": "string",
            "username": "string"
        }
    ]
    ```

- **Errors:**
    - `401 Unauthorized` — missing or invalid session cookie
    - `500 Internal Server Error` — unexpected server error

---

#### POST /api/users

Registers a new user and immediately creates a session cookie.

- **Auth:** Not required

- **Request Body:**

    ```json
    {
        "name": "string",
        "username": "string",
        "password": "string"
    }
    ```

- **Response** `201 Created`:

    ```json
    {
        "id": "int",
        "name": "string",
        "username": "string"
    }
    ```

    A `Set-Cookie: sid=<token>` header is also returned.

- **Errors:**
    - `400 Bad Request` — name, username, or password is empty; username too short; password too short; or username already exists
    - `500 Internal Server Error` — unexpected server error
  
---

### Chats

---

#### GET /api/chats

Returns all chats the authenticated user belongs to, ordered by creation date (newest first). Each chat includes the last message and the count of unread messages.

- **Auth:** Required (session cookie)

- **Query Parameters:**

    | Parameter | Type | Required | Default | Description             |
    | --------- | ---- | -------- | ------- | ----------------------- |
    | `limit`   | int  | No       | `100`   | Maximum number of chats |
    | `offset`  | int  | No       | `0`     | Number of chats to skip |

- **Response** `200 OK`:

    ```json
    [
        {
            "id": "int",
            "name": "string | null",
            "created_at": "string (ISO 8601)",
            "is_group": "bool",
            "last_message": {
                "content": "string",
                "sent_at": "string (ISO 8601)",
                "sender_name": "string"
            },
            "unread_count": "int"
        }
    ]
    ```

    `name` is `null` for private chats that have no display name configured. `last_message` is `null` if no messages have been sent yet.

- **Errors:**
    - `401 Unauthorized` — missing or invalid session cookie
    - `500 Internal Server Error` — unexpected server error

---

#### POST /api/chats

Creates a new group chat. The creator is automatically added as the first member.

- **Auth:** Required (session cookie)

- **Request Body:**

    ```json
    {
        "name": "string"
    }
    ```

- **Response** `200 OK`:

    ```json
    {
        "id": "int",
        "name": "string",
        "created_at": "string (ISO 8601)",
        "is_group": true,
        "last_message": null,
        "unread_count": 0
    }
    ```

- **Errors:**
    - `400 Bad Request` — `name` field is empty
    - `401 Unauthorized` — missing or invalid session cookie
    - `500 Internal Server Error` — unexpected server error

---

#### POST /api/chats/private

Creates a new private (one-to-one) chat between the authenticated user and another user identified by username. Fails if a private chat between the two users already exists, or if the user attempts to chat with themselves.

- **Auth:** Required (session cookie)

- **Request Body:**

    ```json
    {
        "username": "string"
    }
    ```

- **Response** `200 OK`:

    ```json
    {
        "id": "int",
        "name": "string",
        "created_at": "string (ISO 8601)",
        "is_group": false,
        "last_message": null,
        "unread_count": 0
    }
    ```

    `name` is set to the other user's display name or username.

- **Errors:**
    - `400 Bad Request` — `username` field is empty, the chat already exists, or the user tried to chat with themselves
    - `401 Unauthorized` — missing or invalid session cookie
    - `404 Not Found` — target username does not exist
    - `500 Internal Server Error` — unexpected server error

---

#### GET /api/chats/:chat_id/participants

Returns the list of all members currently in a chat. Requires the authenticated user to be a member of the chat.

- **Auth:** Required (session cookie)

- **Path Parameters:**

    | Parameter | Type | Description    |
    | --------- | ---- | -------------- |
    | `chat_id` | int  | ID of the chat |

- **Response** `200 OK`:

    ```json
    [
        {
            "id": "int",
            "name": "string",
            "username": "string"
        }
    ]
    ```

- **Errors:**
    - `401 Unauthorized` — missing or invalid session cookie
    - `403 Forbidden` — user is not a member of this chat
    - `500 Internal Server Error` — unexpected server error

---

#### PATCH /api/chats/:chat_id/read

Marks the chat as fully read for the authenticated user by updating their `last_read_at` timestamp. This resets the unread message counter for this chat.

- **Auth:** Required (session cookie)

- **Path Parameters:**

    | Parameter | Type | Description    |
    | --------- | ---- | -------------- |
    | `chat_id` | int  | ID of the chat |

- **Response** `200 OK`:

    ```json
    {}
    ```

- **Errors:**
    - `401 Unauthorized` — missing or invalid session cookie
    - `403 Forbidden` — user is not a member of this chat
    - `500 Internal Server Error` — unexpected server error

---

#### DELETE /api/chats/:chat_id/members/me

Removes the authenticated user from a group chat. This operation is not permitted on private chats.

- **Auth:** Required (session cookie)

- **Path Parameters:**

    | Parameter | Type | Description    |
    | --------- | ---- | -------------- |
    | `chat_id` | int  | ID of the chat |

- **Response** `204 No Content`

- **Errors:**
    - `401 Unauthorized` — missing or invalid session cookie
    - `403 Forbidden` — user is not a member of this chat, or the chat is a private chat
    - `404 Not Found` — chat does not exist
    - `500 Internal Server Error` — unexpected server error

---

### Messages

---

#### GET /api/chats/:chat_id/messages

Returns all messages in a chat, ordered chronologically (oldest first). Requires the authenticated user to be a member of the chat.

- **Auth:** Required (session cookie)

- **Path Parameters:**

    | Parameter | Type | Description    |
    | --------- | ---- | -------------- |
    | `chat_id` | int  | ID of the chat |

- **Response** `200 OK`:

    ```json
    [
        {
            "id": "int",
            "from": {
                "id": "int",
                "name": "string",
                "username": "string"
            },
            "chat_id": "int",
            "content": "string",
            "sent_at": "string (ISO 8601)"
        }
    ]
    ```

- **Errors:**
    - `401 Unauthorized` — missing or invalid session cookie
    - `403 Forbidden` — user is not a member of this chat
    - `500 Internal Server Error` — unexpected server error

---

#### POST /api/chats/:chat_id/messages

Sends a new message in a chat. After the message is persisted, a `message.received` event is pushed via WebSocket to all other members of the chat who have an active connection.

- **Auth:** Required (session cookie)

- **Path Parameters:**

    | Parameter | Type | Description    |
    | --------- | ---- | -------------- |
    | `chat_id` | int  | ID of the chat |

- **Request Body:**

    ```json
    {
        "content": "string"
    }
    ```

- **Response** `201 Created` (empty body)

- **Errors:**
    - `400 Bad Request` — `content` field is empty
    - `401 Unauthorized` — missing or invalid session cookie
    - `403 Forbidden` — user is not a member of this chat
    - `500 Internal Server Error` — unexpected server error

---

### Requests

Join requests allow a member of a group chat to invite another user. The invited user can then accept or decline.

---

#### GET /api/requests

Returns all pending join requests addressed to the authenticated user.

- **Auth:** Required (session cookie)

- **Response** `200 OK`:

    ```json
    [
        {
            "id": "int",
            "sent_at": "string (ISO 8601)",
            "from": {
                "id": "int",
                "name": "string",
                "username": "string"
            },
            "chat": {
                "id": "int",
                "name": "string | null",
                "created_at": "string (ISO 8601)"
            }
        }
    ]
    ```

- **Errors:**
    - `401 Unauthorized` — missing or invalid session cookie
    - `500 Internal Server Error` — unexpected server error

---

#### POST /api/chats/:chat_id/requests

Sends a join request for a group chat to a target user. The inviter must be a member of the chat. If the invitee has an active WebSocket connection, an `invitation.created` event is pushed immediately.

- **Auth:** Required (session cookie)

- **Path Parameters:**

    | Parameter | Type | Description    |
    | --------- | ---- | -------------- |
    | `chat_id` | int  | ID of the chat |

- **Request Body:**

    ```json
    {
        "username": "string"
    }
    ```

- **Response** `204 No Content`

- **Errors:**
    - `401 Unauthorized` — missing or invalid session cookie
    - `404 Not Found` — target username or chat does not exist
    - `500 Internal Server Error` — unexpected server error

---

#### PATCH /api/requests/:id

Accepts or declines a pending join request. The authenticated user must be the invitee. The request is deleted regardless of the action taken.

If accepted, the user is added to the chat and a `chat.member_joined` event is pushed via WebSocket to all existing members of the chat.

If declined, the request is simply removed with no further side effects.

- **Auth:** Required (session cookie)

- **Path Parameters:**

    | Parameter | Type | Description       |
    | --------- | ---- | ----------------- |
    | `id`      | int  | ID of the request |

- **Request Body:**

    ```json
    {
        "status": "accept | decline"
    }
    ```

- **Response** `200 OK`:

    If accepted, returns the chat that was joined:

    ```json
    {
        "id": "int",
        "name": "string | null",
        "created_at": "string (ISO 8601)"
    }
    ```

    If declined, returns a placeholder object:

    ```json
    {
        "id": -1,
        "name": null,
        "created_at": ""
    }
    ```

- **Errors:**
    - `401 Unauthorized` — missing or invalid session cookie
    - `404 Not Found` — request does not exist or does not belong to the authenticated user
    - `500 Internal Server Error` — unexpected server error

---

## WebSocket

---

#### GET /ws/notifications

Establishes a persistent WebSocket connection for receiving real-time events. Authentication is performed via the `sid` session cookie at upgrade time. If the cookie is missing or invalid, the connection is closed immediately.

A single user may hold multiple simultaneous connections (e.g. multiple browser tabs). Events are delivered to all active connections for that user.

The server does not send any messages proactively other than the event types below. The client may send a standard WebSocket close frame to terminate the connection gracefully.

**Event Types**

All events share the same envelope:

```json
{
    "type": "string",
    "data": {}
}
```

---

**`message.received`**

Pushed to all members of a chat (except the sender) when a new message is posted.

```json
{
    "type": "message.received",
    "data": {
        "id": "int",
        "from": {
            "id": "int",
            "name": "string",
            "username": "string"
        },
        "chat_id": "int",
        "content": "string",
        "sent_at": "string (ISO 8601)"
    }
}
```

---

**`invitation.created`**

Pushed to a user when they receive a new join request.

```json
{
    "type": "invitation.created",
    "data": {
        "request_id": "int",
        "from": {
            "id": "int",
            "name": "string",
            "username": "string"
        },
        "chat": {
            "id": "int",
            "name": "string | null",
            "created_at": "string (ISO 8601)"
        },
        "sent_at": "string (ISO 8601)"
    }
}
```

---

**`chat.member_joined`**

Pushed to all existing members of a chat when a join request is accepted.

```json
{
    "type": "chat.member_joined",
    "data": {
        "chat_id": "int",
        "user": {
            "id": "int",
            "name": "string",
            "username": "string"
        }
    }
}
```
**`chat.member_left`**

Pushed to all existing members of a chat when a user left the chat.

```json
{
    "type": "chat.member_left",
    "data": {
        "chat_id": "int",
        "user_id": "int"
    }
}
```
---

## Error Reference

| Status Code | Meaning                                                                 |
| ----------- | ----------------------------------------------------------------------- |
| `400`       | Bad Request — the request body is malformed or a field fails validation |
| `401`       | Unauthorized — session cookie is missing, invalid, or expired           |
| `403`       | Forbidden — the user does not have permission to perform this action    |
| `404`       | Not Found — the requested resource does not exist                       |
| `500`       | Internal Server Error — an unexpected error occurred on the server      |
