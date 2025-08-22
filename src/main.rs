// src/main.rs (ui)
use actix_files as fs;
use actix_web::{App, HttpServer, HttpResponse, web};
use actix_web::http::StatusCode;
use std::collections::HashMap;
use reqwest;

async fn ping_backend() -> HttpResponse {
    let url = "http://127.0.0.1:8080/healthz";
    println!("→ proxying ping to {url}");
    match reqwest::get(url).await {
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

// 🔹 NEW: proxy list objects
async fn list_objects_proxy(query: web::Query<HashMap<String, String>>) -> HttpResponse {
    let qs = if query.is_empty() {
        "".to_string()
    } else {
        let pairs: Vec<String> = query.iter()
            .map(|(k, v)| format!("{}={}", k, v))
            .collect();
        format!("?{}", pairs.join("&"))
    };

    let url = format!("http://127.0.0.1:8080/objects{}", qs);
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
    println!("🚀 rust-buck3t-ui on http://127.0.0.1:8085");

    HttpServer::new(|| {
        App::new()
            .route("/api/ping", web::get().to(ping_backend))
            .route("/api/objects", web::get().to(list_objects_proxy)) // 🔹 add proxy
            .service(fs::Files::new("/static", "./static").index_file("index.html"))
    })
    .bind(("127.0.0.1", 8085))?
    .run()
    .await
}
