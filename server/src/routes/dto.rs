use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserDto {
    pub id: i64,
    pub name: String,
    pub username: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct RegisterReq {
    pub name: String,
    pub username: String,
    pub password: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LastMessageDto {
    pub content: String,
    pub sent_at: String,
    pub sender_name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatDto {
    pub id: i64,
    pub name: Option<String>,
    pub created_at: String,
    pub is_group: bool,
    pub last_message: Option<LastMessageDto>,
    pub unread_count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatPreviewDto {
    pub id: i64,
    pub name: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParticipantDto {
    pub id: i64,
    pub name: String,
    pub username: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MessageDto {
    pub id: i64,
    pub from: UserDto,
    pub chat_id: i64,
    pub content: String,
    pub sent_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RequestDto {
    pub id: i64,
    pub sent_at: String,
    pub from: UserDto,
    pub chat: ChatPreviewDto,
}

#[derive(Debug, Clone, Deserialize)]
pub struct LoginReq {
    pub username: String,
    pub password: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ChatsQuery {
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UsersQuery {
    pub query: Option<String>,
    pub limit: Option<i64>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateChatReq {
    pub name: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreatePrivateChatReq {
    pub username: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateMessageReq {
    pub content: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct PostRequestBody {
    pub username: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct PatchReq {
    pub status: String,
}
