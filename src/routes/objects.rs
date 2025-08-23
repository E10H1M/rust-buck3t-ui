// src/routes/objects.rs (front-end)

use actix_web::{web, HttpResponse, HttpRequest};
use actix_web::http::header; // keep for reading incoming headers
use std::collections::HashMap;
use reqwest;
use percent_encoding::{utf8_percent_encode, NON_ALPHANUMERIC};

use crate::consts::{Config, PATH_OBJECTS};

fn reencode_key(key: &str) -> String {
    key.split('/')
        .map(|seg| utf8_percent_encode(seg, NON_ALPHANUMERIC).to_string())
        .collect::<Vec<_>>()
        .join("/")
}

pub(crate) fn init(cfg: &mut web::ServiceConfig) {
    cfg
        .route("/api/objects", web::get().to(list_objects_proxy))
        .service(
            web::resource("/api/objects/{key:.+}")
                .route(web::get().to(get_object_proxy))   // GET (download/inline)
                .route(web::head().to(head_object_proxy)) // HEAD
                .route(web::delete().to(delete_object_proxy)), // DELETE
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
            let status = actix_web::http::StatusCode::from_u16(resp.status().as_u16())
                .unwrap_or(actix_web::http::StatusCode::INTERNAL_SERVER_ERROR);
            let body = resp.text().await.unwrap_or_else(|_| "error reading body".into());
            HttpResponse::build(status)
                .append_header(("Content-Type", "application/json"))
                .body(body)
        }
        Err(e) => HttpResponse::InternalServerError()
            .body(format!("failed to reach backend: {}", e)),
    }
}

// GET proxy: supports ?download=0|1, Range, If-None-Match
async fn get_object_proxy(
    cfg: web::Data<Config>,
    req: HttpRequest,
    key: web::Path<String>,
    query: web::Query<HashMap<String, String>>,
) -> HttpResponse {
    let key = reencode_key(&key.into_inner());
    let qs = if query.is_empty() {
        "".to_string()
    } else {
        let pairs: Vec<String> = query.iter()
            .map(|(k, v)| format!("{}={}", k, v))
            .collect();
        format!("?{}", pairs.join("&"))
    };
    let url = format!("{}/{}{}", cfg.join_backend(PATH_OBJECTS), key, qs);
    println!("→ proxying GET to {url}");

    let client = reqwest::Client::new();
    let mut rb = client.get(&url);

    // pass through useful headers as strings (avoid type mismatches)
    if let Some(v) = req.headers().get(header::IF_NONE_MATCH) {
        if let Ok(s) = v.to_str() { rb = rb.header("if-none-match", s); }
    }
    if let Some(v) = req.headers().get(header::RANGE) {
        if let Ok(s) = v.to_str() { rb = rb.header("range", s); }
    }

    match rb.send().await {
        Ok(resp) => {
            let status = actix_web::http::StatusCode::from_u16(resp.status().as_u16())
                .unwrap_or(actix_web::http::StatusCode::INTERNAL_SERVER_ERROR);

            let mut b = HttpResponse::build(status);

            // propagate a few headers back using (&str, &str)
            for (k, v) in resp.headers().iter() {
                if let Ok(val) = v.to_str() {
                    match k.as_str() {
                        "content-type" | "content-length" | "accept-ranges" |
                        "content-disposition" | "content-range" | "etag" => {
                            b.append_header((k.as_str(), val));
                        }
                        _ => {}
                    }
                }
            }

            let bytes = resp.bytes().await.unwrap_or_default();
            b.body(bytes)
        }
        Err(e) => HttpResponse::InternalServerError()
            .body(format!("failed to reach backend: {}", e)),
    }
}

// HEAD proxy
async fn head_object_proxy(
    cfg: web::Data<Config>,
    req: HttpRequest,
    key: web::Path<String>,
    query: web::Query<HashMap<String, String>>,
) -> HttpResponse {
    let key = reencode_key(&key.into_inner());
    let qs = if query.is_empty() {
        "".to_string()
    } else {
        let pairs: Vec<String> = query.iter()
            .map(|(k, v)| format!("{}={}", k, v))
            .collect();
        format!("?{}", pairs.join("&"))
    };
    let url = format!("{}/{}{}", cfg.join_backend(PATH_OBJECTS), key, qs);
    println!("→ proxying HEAD to {url}");

    let client = reqwest::Client::new();
    let mut rb = client.head(&url);

    if let Some(v) = req.headers().get(header::IF_NONE_MATCH) {
        if let Ok(s) = v.to_str() { rb = rb.header("if-none-match", s); }
    }

    match rb.send().await {
        Ok(resp) => {
            let status = actix_web::http::StatusCode::from_u16(resp.status().as_u16())
                .unwrap_or(actix_web::http::StatusCode::INTERNAL_SERVER_ERROR);

            let mut b = HttpResponse::build(status);
            for (k, v) in resp.headers().iter() {
                if let Ok(val) = v.to_str() {
                    match k.as_str() {
                        "content-type" | "content-length" | "accept-ranges" |
                        "content-disposition" | "etag" => {
                            b.append_header((k.as_str(), val));
                        }
                        _ => {}
                    }
                }
            }
            b.finish()
        }
        Err(e) => HttpResponse::InternalServerError()
            .body(format!("failed to reach backend: {}", e)),
    }
}

// DELETE proxy (keeps key re-encoding)
async fn delete_object_proxy(
    cfg: web::Data<Config>,
    key: web::Path<String>,
) -> HttpResponse {
    let key = reencode_key(&key.into_inner());
    let url = format!("{}/{}", cfg.join_backend(PATH_OBJECTS), key);
    println!("→ proxying DELETE to {url}");

    match reqwest::Client::new().delete(&url).send().await {
        Ok(resp) => {
            let status = actix_web::http::StatusCode::from_u16(resp.status().as_u16())
                .unwrap_or(actix_web::http::StatusCode::INTERNAL_SERVER_ERROR);
            let body = resp.text().await.unwrap_or_default();
            HttpResponse::build(status).body(body)
        }
        Err(e) => HttpResponse::InternalServerError()
            .body(format!("failed to reach backend: {}", e)),
    }
}
