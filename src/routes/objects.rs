// routes/objects.rs

use actix_web::{web, HttpResponse};
use actix_web::http::StatusCode;
use std::collections::HashMap;
use reqwest;

use crate::consts::{Config, PATH_OBJECTS};

pub(crate) fn init(cfg: &mut web::ServiceConfig) {
    cfg
        .route("/api/objects", web::get().to(list_objects_proxy))
        // NEW: proxy DELETE /api/objects/{key...} -> backend /objects/{key...}
        .service(
            web::resource("/api/objects/{key:.+}")
                .route(web::delete().to(delete_object_proxy)),
        );
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

// NEW: DELETE proxy
async fn delete_object_proxy(
    cfg: web::Data<Config>,
    key: web::Path<String>,
) -> HttpResponse {
    // backend target: {backend}/objects/{key}
    let url = format!("{}/{}", cfg.join_backend(PATH_OBJECTS), key.into_inner());
    println!("→ proxying DELETE to {url}");

    match reqwest::Client::new().delete(&url).send().await {
        Ok(resp) => {
            let status = StatusCode::from_u16(resp.status().as_u16())
                .unwrap_or(StatusCode::INTERNAL_SERVER_ERROR);
            // backend usually returns 204 with empty body; pass through body if present
            let body = resp.text().await.unwrap_or_default();
            HttpResponse::build(status).body(body)
        }
        Err(e) => HttpResponse::InternalServerError()
            .body(format!("failed to reach backend: {}", e)),
    }
}
