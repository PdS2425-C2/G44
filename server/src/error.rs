use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
};

/*
   Definizione degli errori API.
   - Unauthorized: errore 401
   - BadRequest: errore 400 con messaggio
   - Internal: errore 500
*/
#[derive(Debug)]
pub enum ApiError {
    Unauthorized,
    BadRequest(&'static str),
    Internal,
    NotFound,
    Forbidden,
}

// Conversione di ApiError in risposta HTTP
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

// Conversione di sqlx::Error in ApiError::Internal
impl From<sqlx::Error> for ApiError {
    fn from(_: sqlx::Error) -> Self {
        ApiError::Internal
    }
}
