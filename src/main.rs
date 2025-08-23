// src/main.rs
use actix_files as fs;
use actix_web::{App, HttpServer, HttpResponse, web};
use actix_web::http::StatusCode;
use std::collections::HashMap;
use reqwest;

mod consts;
use consts::{Config, PATH_HEALTHZ, PATH_OBJECTS};

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

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    let cfg = Config::from_env();
    println!("🚀 rust-buck3t-ui on http://{}:{}", cfg.ui_host, cfg.ui_port);

    let cfg_for_server = cfg.clone();

    HttpServer::new(move || {
        App::new()
            .app_data(web::Data::new(cfg_for_server.clone()))
            .route("/api/ping", web::get().to(ping_backend))
            .route("/api/objects", web::get().to(list_objects_proxy))
            .service(fs::Files::new("/static", "./static").index_file("index.html"))
    })
    .bind((cfg.ui_host.as_str(), cfg.ui_port))?
    .run()
    .await

}
