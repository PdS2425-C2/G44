use argon2::{Argon2, PasswordHasher};
use rand::rngs::OsRng;
use password_hash::SaltString;
//sqlx migrate run --database-url sqlite://data/ruggine.db
//cargo run --bin mkhash -- "password"
fn main() {
    let pw = std::env::args()
        .nth(1)
        .expect("usage: mkhash <password>");

    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();

    let hash = argon2
        .hash_password(pw.as_bytes(), &salt)
        .expect("hash failed")
        .to_string();

    println!("{hash}");
}
