# rust-buck3t-ui
![Rust Buck3t UI Logo](./assets/rusty-buck3t-ui.png)


A rust [Actix Web](https://actix.rs/) client that acts as a proxy for [rust-buck3t](https://github.com/E10H1M/rust-buck3t).
Something for the non CLI savy but also to help flesh out debugging and development of the tool at a faster speed.

## Docs
[![Documentation](https://img.shields.io/badge/docs-rust--buck3t--ui-blue)](https://e10h1m.github.io/rust-buck3t-ui/)
[![Documentation](https://img.shields.io/badge/docs-rust--buck3t-green)](https://e10h1m.github.io/rust-buck3t/)
[![Actix](https://img.shields.io/badge/docs-actix-brown)](https://actix.rs/)


## Quickstart

```bash
cargo run
```

# Changelog — rust-buck3t-ui

## [Unreleased]
- Planned: extension system, overhaul of upload area, management interface for configurations 

---
## [0.0.1] - 2025-08
### Added
- **Authentication / Sessions**
  - Session + object proxies with auth forwarding
  - Login/logout flow added; UI gated behind authentication

- **Documentation**
  - Project documentation hosted via **GitHub Pages**

- **Object Operations**
  - Uploading objects via front-end user interface
  - Support for **deletion, upload, download, and inline viewing** of objects in the UI

- **Core Setup**
  - Initial Actix server + JavaScript front-end integrated and running
  - Environment configuration with **dotenvy**

### Changed
- **UI/UX Enhancements**
  - General bug fixes and feature polish
  - Wired **Back/Forward history** into the Bucket Viewer (native browser navigation for folders)
  - Cookie persistence fixed → users are **no longer forced to log in after every refresh**
  - File navigation UI/UX



## 📜 License
Licensed under the [MIT](./LICENSE) license. Go make monies. <br>
Just mention me and include my license, k? (゜- ゜) 
