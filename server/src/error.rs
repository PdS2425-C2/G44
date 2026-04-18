use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
};

#[derive(Debug)]
pub enum ApiError {
    Unauthorized,
    BadRequest(&'static str),
    Internal,
    NotFound,
    Forbidden,
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        match self {
            ApiError::Unauthorized => StatusCode::UNAUTHORIZED.into_response(),
            ApiError::BadRequest(msg) => (StatusCode::BAD_REQUEST, msg).into_response(),
            ApiError::Internal => StatusCode::INTERNAL_SERVER_ERROR.into_response(),
            ApiError::NotFound => StatusCode::NOT_FOUND.into_response(),
            ApiError::Forbidden => StatusCode::FORBIDDEN.into_response(),
        }
    }
}

impl From<sqlx::Error> for ApiError {
    fn from(_: sqlx::Error) -> Self {
        ApiError::Internal
    }
}
