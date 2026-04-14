# Entities

-   user

    | Field         | Type   |
    | ------------- | ------ |
    | id            | int    |
    | name          | string |
    | username      | string |
    | password_hash | string |

-   association

    | Field    | Type           |
    | -------- | -------------- |
    | user_id  | int (FK user)  |
    | chat_id | int (FK chat) |
    | joined_at  | datetime       |

-   chat

    | Field      | Type     |
    | ---------- | -------- |
    | id         | int      |
    | name       | string   |
    | created_at | datetime |
    | is_group | bool |

-   message

    | Field    | Type           |
    | -------- | -------------- |
    | id       | int            |
    | user_id  | int (FK user)  |
    | chat_id | int (FK chat) |
    | content  | string         |
    | sent_at  | datetime       |

-   request

    | Field    | Type           |
    | -------- | -------------- |
    | id       | int            |
    | from     | int (FK user)  |
    | to       | int (FK user)  |
    | chat_id | int (FK chat) |
    | sent_at  | datetime       |

# User Requirements

-   Login

    After logging in, the user’s landing page must show the list of chat names they belong to, along with a button to create a new chat.

-   Invitation

    To start a new chat, a user must send an invitation request to other users.
    The invited users must then accept the request for the chat to be officially created and shown in the landing page.

-   Chat Selection

    When the user clicks on a chat, the application must display all messages posted after the user joined the chat and allow:

    -   sending new messages
    -   sending invitation to other users to join the chat

-   Leave Chat

    The user must be able to leave a chat.
    If the user is the last member of the chat, the chat should be deleted.

# API Rest

## Login

These endpoints are based on JS session management, with Axum and Tower may be variate.

-   **POST** `/api/sessions` (login)

    -   Request Body:
        ```json
        {
            "username": "string",
            "password": "string"
        }
        ```
    -   Response:

        ```json
        {
            "id": "int",
            "name": "string",
            "username": "string"
        }
        ```

    -   Errors:
        -   400 Bad Request - The request body is malformed
        -   401 Unauthorized: Invalid username or password
        -   500 Internal Server Error - An unexpected error occurred on the server

-   **GET** `/api/sessions` (whoami)

    -   Request parameters: None
    -   Response:

        ```json
        {
            "id": "int",
            "name": "string",
            "username": "string"
        }
        ```

    -   Errors:
        -   401 Unauthorized - No active session found
        -   500 Internal Server Error - An unexpected error occurred on the server

-   **DELETE** `/api/sessions` (logout)

    -   Request parameters: None
    -   Response: 204 No Content

    -   Errors:
        -   401 Unauthorized - No active session found
        -   500 Internal Server Error - An unexpected error occurred on the server

## Users

-   **GET** `/api/users`

    -   Description: Get all users filtered by username containing the query string
    -   Query parameters:

        -   query: string, filter users by username containing the query string
        -   limit (optional): integer, number of users to return

    -   Response:

        ```json
        [
            {
                "id": "int",
                "name": "string",
                "username": "string"
            },
            ...
        ]
        ```

    -   Errors:
        -   401 Unauthorized - No active session found
        -   500 Internal Server Error - An unexpected error occurred on the server

## Chats

-   **GET** `/api/chats`

    -   Description: Get all chats that a user belongs to sorted by creation date, can filter with limit and offset

    -   Request parameters:
        -   limit (optional): integer, number of chats to return
        -   offset (optional): integer, number of chats to skip
    -   Response:

        ```json
        [
            {
                "id": "int",
                "name": "string",
                "created_at": "string",
                "is_group": true
            },
            ...
        ]
        ```

    -   Errors:
        -   401 Unauthorized - No active session found
        -   403 Forbidden - User does not have access to the requested resource
        -   500 Internal Server Error - An unexpected error occurred on the server

-   **POST** `/api/chats`

    -   Description: Create a new chat

    -   Request Body:
        ```json
        {
            "name": "string",
            "invitees": []
        }
        ```
    -   Response:

        ```json
        {
            "id": "int",
            "name": "string",
            "created_at": "string"
        }
        ```

    -   Errors:
        -   400 Bad Request - The request body is malformed
        -   401 Unauthorized - No active session found
        -   403 Forbidden - User does not have access to create a chat
        -   500 Internal Server Error - An unexpected error occurred on the server

-   **POST** `/api/chats/private`

    -   Description: Create a new private 1-to-1 chat with a user (no invitations). The chat is created immediately and both users are added as members.

    -   Request Body:
        ```json
        {
            "username": "string"
        }
        ```

    -   Response:
        ```json
        {
            "id": "string",
            "name": "string",
            "created_at": "string",
            "is_group": false
        }
        ```

    -   Errors:
        -   400 Bad Request - username missing / cannot create private chat with yourself
        -   401 Unauthorized - No active session found
        -   404 Not Found - The specified user does not exist
        -   500 Internal Server Error - An unexpected error occurred on the server

-   **GET** `/api/chats/{chat_id}/members`

    -   Description: Get all members of a chat

    -   Request parameters: None
    -   Response:

        ```json
        [
            {
                "id": "int",
                "name": "string",
                "username": "string"
            },
            ...
        ]
        ```

    -   Errors:
        -   401 Unauthorized - No active session found
        -   403 Forbidden - User does not have access to the requested resource
        -   404 Not Found - The specified chat does not exist
        -   500 Internal Server Error - An unexpected error occurred on the server

-  **DELETE** `/api/chats/{chat_id}/members/me`

    -   Description: Leave a group chat. The requesting user is removed from the chat's member list. This operation is only available for group chats — private chats cannot be left.
    -   Response: 204 No Content
    -   Errors:
        -   401 Unauthorized - No active session found
        -   403 Forbidden - User does not have access to the requested resource or cannot leave a private chat
        -   404 Not Found - The specified chat does not exist
        -   500 Internal Server Error - An unexpected error occurred on the server

## Invitations (Requests)

-   **GET** `/api/requests`
    -   Description: Get all pending invitation requests for the logged-in user

    -   Request parameters: None
    -   Response:

        ```json
        [
            {
                "id": "int",
                "from": {
                    "id": "int",
                    "name": "string",
                    "username": "string"
                },
                "chat": {
                    "id": "int",
                    "name": "string",
                    "created_at": "string"
                },
                "sent_at": "string"
            },
            ...
        ]
        ```

    -   Errors:
        -   401 Unauthorized - No active session found
        -   500 Internal Server Error - An unexpected error occurred on the server

-  **POST** `/api/chats/{chat_id}/requests`

    -   Description: Send an invitation request to a user to join a chat

    -   Request Body:
        ```json
        {
            "to_username": "string" # valutare se usare l'id invece di username
        }
        ```
    -   Response: 201 Created

    -   Errors:
        -   400 Bad Request - The request body is malformed
        -   401 Unauthorized - No active session found
        -   403 Forbidden - User does not have access to the requested resource
        -   404 Not Found - The specified chat or user does not exist
        -   500 Internal Server Error - An unexpected error occurred on the server

- **PATCH** `/api/requests/{request_id}`
  
    -   Description: Accept or reject an invitation request

    -   Request Body:
        ```json
        {
            "status": "accept" | "reject"
        }
        ```
    -   Response: 204 No Content

    -   Errors:
        -   400 Bad Request - The request body is malformed
        -   401 Unauthorized - No active session found
        -   403 Forbidden - User does not have access to the requested resource
        -   404 Not Found - The specified request does not exist
        -   500 Internal Server Error - An unexpected error occurred on the server

## Messages

The messages sent/received in a chat aren't described here because they are handled by WebSocket API.

-   **GET** `/api/chats/{chat_id}/messages`

    -   Description: Get all messages in a chat posted after the user joined the chat, sorted by sent date, can filter with limit and offset

    -   Request parameters:
        -   limit (optional, default = 100 ??): integer, number of messages to return
        -   offset (optional, defualt = 0): integer, number of messages to skip (I don't know if it's useful)
    -   Response:

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
                "sent_at": "string",
            },
            ...
        ]
        ```

    -   Errors:
        -   401 Unauthorized - No active session found
        -   403 Forbidden - User does not have access to the requested resource
        -   500 Internal Server Error - An unexpected error occurred on the server


-  **POST** `/api/chats/{chat_id}/messages`

    -  Description: Send a message in a chat, both private or group
    
    -  Request Body:
         ```json
        {
            "content": "string"
        }
        ```

    -   Errors:
        -   401 Unauthorized - No active session found
        -   403 Forbidden - User does not have access to the requested resource
        -   500 Internal Server Error - An unexpected error occurred on the server

  
# WebSocket API

- **GET** `/ws/notifications`
  - Description: Establish a WebSocket connection to receive real-time notifications.
  - Request parameters: None
  - Messages:
    -   Invitation Request Notification:
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
                    "name": "string",
                    "created_at": "string"
                },
                "sent_at": "string"
            }
        }
        ```

- **GET** `/ws/chats/{chat_id}/messages`
    - Description: Establish a WebSocket connection to send and receive real-time messages in a chat
    - Request parameters: None
    - Messages:
        -   Send Message:
            ```json
            {
                "type": "message.send",
                "data": {
                    "content": "string"
                }
            }
            ```
    -   Receive Message:
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
                "sent_at": "string"
            }
        }
        ```