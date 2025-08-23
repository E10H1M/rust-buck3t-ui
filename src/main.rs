use actix_files as fs;
use actix_web::{App, HttpServer, web};

mod consts;
mod routes;

use consts::Config;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    let cfg = Config::from_env();
    println!("🚀 rust-buck3t-ui on http://{}:{}", cfg.ui_host, cfg.ui_port);

    let cfg_for_server = cfg.clone();

    // in main() when building App
    HttpServer::new(move || {
        App::new()
            .app_data(web::Data::new(cfg_for_server.clone()))
            .app_data(web::PayloadConfig::new(50 * 1024 * 1024)) // match MAX_UPLOAD_BYTES (50 MiB)
            .configure(routes::health::init)
            .configure(routes::objects::init)
            .configure(routes::upload::init)
            .service(fs::Files::new("/static", "./static").index_file("index.html"))
    })
    .bind((cfg.ui_host.as_str(), cfg.ui_port))?
    .run()
    .await
}
