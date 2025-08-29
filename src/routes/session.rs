// src/routes/session.rs
use actix_web::{web, HttpResponse, HttpRequest};
use actix_web::http::StatusCode;
use actix_web::cookie::{Cookie, SameSite, time::Duration};
use reqwest::Client;
use serde::{Deserialize, Serialize};

use crate::consts::Config;

pub(crate) fn init(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/api/auth")
            .route("/signup", web::post().to(signup))
            .route("/login",  web::post().to(login))
            .route("/logout", web::post().to(logout)),
    );
}

/* ---------- payloads ---------- */

#[derive(Deserialize, Serialize)]
struct SignupReq {
    username: String,
    password: String,
}

#[derive(Deserialize, Serialize)]
struct LoginReq {
    username: String,
    password: String,
    scope: Option<String>,
    ttl_secs: Option<u64>,
}

#[derive(Deserialize, Serialize)]
struct BackendTokenResp {
    access_token: String,
    token_type: String,
    expires_in: u64,
}

/* ---------- handlers ---------- */

async fn signup(
    cfg: web::Data<Config>,
    body: web::Json<SignupReq>,
) -> HttpResponse {
    let url = cfg.join_backend("auth/signup");
    let client = Client::new();

    match client.post(url).json(&*body).send().await {
        Ok(resp) => {
            let status = StatusCode::from_u16(resp.status().as_u16())
                .unwrap_or(StatusCode::INTERNAL_SERVER_ERROR);
            let text = resp.text().await.unwrap_or_default();
            HttpResponse::build(status).body(text)
        }
        Err(e) => HttpResponse::InternalServerError()
            .body(format!("signup proxy error: {e}")),
    }
}

async fn login(
    cfg: web::Data<Config>,
    body: web::Json<LoginReq>,
) -> HttpResponse {
    let url = cfg.join_backend("auth/login");
    let client = Client::new();

    match client.post(url).json(&*body).send().await {
        Ok(resp) => {
            let status = resp.status();
            if !status.is_success() {
                let text = resp.text().await.unwrap_or_default();
                return HttpResponse::build(StatusCode::from_u16(status.as_u16())
                    .unwrap_or(StatusCode::INTERNAL_SERVER_ERROR))
                    .body(text);
            }
            // parse backend response to get token + ttl
            match resp.json::<BackendTokenResp>().await {
                Ok(t) => {
                    // set HttpOnly cookie for the browser; JS won't see it, but
                    // our UI proxy can attach it to backend calls later.
                    let cookie = Cookie::build("rb_token", t.access_token.clone())
                        .path("/")
                        .http_only(true)
                        .same_site(SameSite::Lax)
                        // NOTE: set Secure(true) when you serve over HTTPS
                        //.same_site(SameSite::Strict) // or keep Lax if you need cross-tab downloads
                        //.secure(true)
                        .max_age(Duration::seconds(t.expires_in as i64))
                        .finish();

                    HttpResponse::Ok()
                        .cookie(cookie)
                        // also return the token JSON for convenience/tools
                        .json(t)
                }
                Err(e) => HttpResponse::InternalServerError()
                    .body(format!("login parse error: {e}")),
            }
        }
        Err(e) => HttpResponse::InternalServerError()
            .body(format!("login proxy error: {e}")),
    }
}

async fn logout(_req: HttpRequest) -> HttpResponse {
    // Stateless JWT: just drop the cookie on the client
    let dead = Cookie::build("rb_token", "")
        .path("/")
        .http_only(true)
        .same_site(SameSite::Lax)
        .max_age(Duration::seconds(0))
        .finish();

    HttpResponse::NoContent()
        .cookie(dead)
        .finish()
}
