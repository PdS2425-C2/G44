# Entities

-   user

    | Field         | Type   |
    | ------------- | ------ |
    | id            | int    |
    | name          | string |
    | username      | string |
    | password_hash | string |

-   association

    | Field      | Type     |
    | ---------- | -------- |
    | user_id    | int      |
    | group_id   | int      |
    | ts_join_at | datetime |

-   group

    | Field         | Type     |
    | ------------- | -------- |
    | id            | int      |
    | name          | string   |
    | ts_created_at | datetime |

-   message

    | Field      | Type     |
    | ---------- | -------- |
    | id         | int      |
    | ts_sent_at | datetime |
    | user_id    | int      |
    | group_id   | int      |
    | content    | string   |

# User Requirements

-   Login

    After logging in, the user’s landing page must show the list of group names they belong to, along with a button to create a new group.

-   Group Selection

    When the user clicks on a group, the application must display all messages posted after the user joined the group and allow:

    -   sending new messages
    -   adding users to that group

-   Leave Group

    The user must be able to leave a group.
    If the user is the last member of the group, the group should be deleted.

# API Rest

## Login

These endpoints are based on JS session management, with Axum and Tower may be variate.

-   **POST** `/api/sessions`

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
            "id": "string",
            "name": "string",
            "username": "string"
        }
        ```

    -   Errors:
        -   400 Bad Request - The request body is malformed
        -   401 Unauthorized: Invalid username or password
        -   500 Internal Server Error - An unexpected error occurred on the server

-   **GET** `/api/sessions`

    -   Request parameters: None
    -   Response:

        ```json
        {
            "id": "string",
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

## Groups

-   **GET** `/api/groups`

    - Description: Get all groups that a user belongs to sorted by creation date, can filter with limit and offset

    -   Request parameters:
        -   limit (optional): integer, number of groups to return
        -   offset (optional): integer, number of groups to skip
    -   Response:

        ```json
        [
            {
                "id": "string",
                "name": "string",
                "ts_created_at": "string"
            },
            ...
        ]
        ```

    -   Errors:
        -   401 Unauthorized - No active session found
        -   403 Forbidden - User does not have access to the requested resource
        -   500 Internal Server Error - An unexpected error occurred on the server

-   **POST** `/api/groups`
    - Description: Create a new group

    -   Request Body:
        ```json
        {
            "name": "string",
        }
        ```
    -   Response:

        ```json
        {
            "id": "string",
            "name": "string",
            "ts_created_at": "string"
        }
        ```

    -   Errors:
        -   400 Bad Request - The request body is malformed
        -   401 Unauthorized - No active session found
        -   403 Forbidden - User does not have access to create a group
        -   500 Internal Server Error - An unexpected error occurred on the server

-  **POST** `/api/groups/{group_id}/users`
    - Description: Add a user to a group

    -   Request Body:
        ```json
        {
            "username": "string",
        }
        ```
    -   Response: 204 No Content

    -   Errors:
        -   400 Bad Request - The request body is malformed
        -   401 Unauthorized - No active session found
        -   403 Forbidden - User does not have access to the requested resource
        -   404 Not Found - The specified group or user does not exist
        -   500 Internal Server Error - An unexpected error occurred on the server

- **DELETE** `/api/groups/{group_id}/users`
    - Description: Leave a group

    -   Request parameters: None
    -   Response: 204 No Content

    -   Errors:
        -   401 Unauthorized - No active session found
        -   403 Forbidden - User does not have access to the requested resource
        -   404 Not Found - The specified group does not exist
        -   500 Internal Server Error - An unexpected error occurred on the server

## Messages

The messages sent/received in a group aren't described here because they are handled by WebSocket API.

-   **GET** `/api/groups/{group_id}/messages`

    - Description: Get all messages in a group posted after the user joined the group, sorted by sent date, can filter with limit and offset

    -   Request parameters:
        -   limit (optional, default = 100 ??): integer, number of messages to return
        -   offset (optional, defualt = 0): integer, number of messages to skip (I don't know if it's useful)
    -   Response:

        ```json
        [
            {
                "id": "string",
                "ts_sent_at": "string",
                "name": "string",   # o `user_id` ??
                "group_id": "string",
                "content": "string"
            },
            ...
        ]
        ```

    -   Errors:
        -   401 Unauthorized - No active session found
        -   403 Forbidden - User does not have access to the requested resource
        -   500 Internal Server Error - An unexpected error occurred on the server


# WebSocket API
...