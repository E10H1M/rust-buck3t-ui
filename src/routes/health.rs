use actix_web::{web, HttpResponse};
use actix_web::http::StatusCode;
use reqwest;

use crate::consts::{Config, PATH_HEALTHZ};

pub(crate) fn init(cfg: &mut web::ServiceConfig) {
    cfg.route("/api/ping", web::get().to(ping_backend));
}

async fn ping_backend(cfg: web::Data<Config>) -> HttpResponse {
    let url = cfg.join_backend(PATH_HEALTHZ);
    println!("→ proxying ping to {url}");
    match reqwest::get(&url).await {
        Ok(resp) => {
            let status = StatusCode::from_u16(resp.status().as_u16())
                .unwrap_or(StatusCode::INTERNAL_SERVER_ERROR);
            let body = resp.text().await.unwrap_or_else(|_| "error reading body".into());
            HttpResponse::build(status).body(body)
        }
        Err(e) => HttpResponse::InternalServerError()
            .body(format!("failed to reach backend: {}", e)),
    }
}
