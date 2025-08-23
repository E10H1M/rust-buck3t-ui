use actix_web::{web, HttpRequest, HttpResponse};
use actix_web::http::StatusCode;
use reqwest;

use crate::consts::{Config, PATH_OBJECTS};

pub(crate) fn init(cfg: &mut web::ServiceConfig) {
    cfg.route("/api/objects/{key:.*}", web::put().to(put_object_proxy));
}

// Upload proxy: forwards file upload to backend
async fn put_object_proxy(
    cfg: web::Data<Config>,
    req: HttpRequest,
    body: web::Bytes,
    key: web::Path<String>,
) -> HttpResponse {
    let url = format!("{}/{}", cfg.join_backend(PATH_OBJECTS), key.into_inner());
    println!("→ proxying UPLOAD to {url}");

    match reqwest::Client::new()
        .put(&url)
        .headers(req.headers().clone())
        .body(body)
        .send()
        .await
    {
        Ok(resp) => {
            let status = StatusCode::from_u16(resp.status().as_u16())
                .unwrap_or(StatusCode::INTERNAL_SERVER_ERROR);
            let body = resp.text().await.unwrap_or_default();
            HttpResponse::build(status).body(body)
        }
        Err(e) => HttpResponse::InternalServerError()
            .body(format!("failed to proxy upload: {}", e)),
    }
}
