// src/routes/upload.rs
use actix_web::{web, HttpRequest, HttpResponse};
use actix_web::http::{header, StatusCode};
use percent_encoding::{utf8_percent_encode, NON_ALPHANUMERIC};
use reqwest;
use reqwest::header::{HeaderMap, HeaderValue};

use crate::consts::{Config, PATH_OBJECTS};

pub(crate) fn init(cfg: &mut web::ServiceConfig) {
    cfg.route("/api/objects/{key:.*}", web::put().to(put_object_proxy));
}

// Re-encode each path segment so spaces/utf8 are valid in the outgoing URL
fn reencode_key(key: &str) -> String {
    key.split('/')
        .map(|seg| utf8_percent_encode(seg, NON_ALPHANUMERIC).to_string())
        .collect::<Vec<_>>()
        .join("/")
}

// Upload proxy: forwards file upload to backend
pub(super) async fn put_object_proxy(
    cfg: web::Data<Config>,
    req: HttpRequest,
    body: web::Bytes,          // buffered body is fine for now
    key: web::Path<String>,
) -> HttpResponse {
    let key = reencode_key(&key.into_inner());
    let url = format!("{}/{}", cfg.join_backend(PATH_OBJECTS), key);
    println!("→ proxying UPLOAD to {url}");

    // Pass through only the headers the backend cares about; let reqwest set Content-Length
    let mut headers = HeaderMap::new();

    // 🔐 forward auth from cookie -> Authorization: Bearer ...
    if let Some(tok) = req.cookie("rb_token") {
        if let Ok(hv) = HeaderValue::from_str(&format!("Bearer {}", tok.value())) {
            headers.insert("authorization", hv);
        }
    }

    if let Some(v) = req.headers().get(header::IF_MATCH) {
        if let Ok(hv) = HeaderValue::from_bytes(v.as_bytes()) { headers.insert("if-match", hv); }
    }
    if let Some(v) = req.headers().get(header::IF_NONE_MATCH) {
        if let Ok(hv) = HeaderValue::from_bytes(v.as_bytes()) { headers.insert("if-none-match", hv); }
    }
    if let Some(v) = req.headers().get(header::CONTENT_TYPE) {
        if let Ok(hv) = HeaderValue::from_bytes(v.as_bytes()) { headers.insert("content-type", hv); }
    }

    match reqwest::Client::new()
        .put(&url)
        .headers(headers)
        .body(body)
        .send()
        .await
    {
        Ok(resp) => {
            let status = StatusCode::from_u16(resp.status().as_u16())
                .unwrap_or(StatusCode::INTERNAL_SERVER_ERROR);

            // propagate a couple useful headers back (e.g., ETag)
            let mut builder = HttpResponse::build(status);
            if let Some(etag) = resp.headers().get("etag") {
                if let Ok(s) = etag.to_str() { builder.insert_header(("ETag", s)); }
            }
            if let Some(ct) = resp.headers().get("content-type") {
                if let Ok(s) = ct.to_str() { builder.insert_header(("Content-Type", s)); }
            }

            let bytes = resp.bytes().await.unwrap_or_default();
            builder.body(bytes)
        }
        Err(e) => HttpResponse::InternalServerError()
            .body(format!("failed to proxy upload: {}", e)),
    }
}
