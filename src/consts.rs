// src/consts.rs
use std::env;

#[derive(Clone, Debug)]   // 👈 this makes .clone() work (and gives you nice debug prints)
pub(crate) struct Config {
    pub backend_base: String,
    pub ui_host: String,
    pub ui_port: u16,
}

impl Config {
    pub fn from_env() -> Self {
        // load .env if present
        dotenvy::dotenv().ok();

        Self {
            backend_base: env::var("BACKEND_BASE").unwrap_or("http://127.0.0.1:8080".into()),
            ui_host: env::var("UI_HOST").unwrap_or("127.0.0.1".into()),
            ui_port: env::var("UI_PORT")
                .ok()
                .and_then(|s| s.parse::<u16>().ok())
                .unwrap_or(8085),
        }
    }

    pub fn join_backend(&self, path: &str) -> String {
        if self.backend_base.ends_with('/') {
            format!("{}{}", self.backend_base, path)
        } else {
            format!("{}/{}", self.backend_base, path)
        }
    }
}

// still keep paths as static constants
pub(crate) const PATH_HEALTHZ: &str = "healthz";
pub(crate) const PATH_OBJECTS: &str = "objects";
