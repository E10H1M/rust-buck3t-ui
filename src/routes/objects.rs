use actix_web::{web, HttpResponse};
use actix_web::http::StatusCode;
use std::collections::HashMap;
use reqwest;

use crate::consts::{Config, PATH_OBJECTS};

pub(crate) fn init(cfg: &mut web::ServiceConfig) {
    cfg.route("/api/objects", web::get().to(list_objects_proxy));
}

async fn list_objects_proxy(
    cfg: web::Data<Config>,
    query: web::Query<HashMap<String, String>>,
) -> HttpResponse {
    let qs = if query.is_empty() {
        "".to_string()
    } else {
        let pairs: Vec<String> = query.iter()
            .map(|(k, v)| format!("{}={}", k, v))
            .collect();
        format!("?{}", pairs.join("&"))
    };

    let url = format!("{}{}", cfg.join_backend(PATH_OBJECTS), qs);
    println!("→ proxying objects to {url}");

    match reqwest::get(&url).await {
        Ok(resp) => {
            let status = StatusCode::from_u16(resp.status().as_u16())
                .unwrap_or(StatusCode::INTERNAL_SERVER_ERROR);
            let body = resp.text().await.unwrap_or_else(|_| "error reading body".into());
            HttpResponse::build(status)
                .append_header(("Content-Type", "application/json"))
                .body(body)
        }
        Err(e) => HttpResponse::InternalServerError()
            .body(format!("failed to reach backend: {}", e)),
    }
}
