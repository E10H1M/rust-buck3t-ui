// /static/js/api.js

// ---------- small utils ----------
function encKeyForPath(k) {
  return (k || "").split("/").map(encodeURIComponent).join("/");
}
function respError(r, bodyText) {
  const msg = `HTTP ${r.status} ${r.statusText}${bodyText ? ` — ${bodyText}` : ""}`;
  const err = new Error(msg);
  err.status = r.status;
  return err;
}

// ---------- auth ----------
export async function signup(username, password) {
  const r = await fetch("/api/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });
  if (!r.ok) throw respError(r, await r.text().catch(() => ""));
  const detail = { username };
  window.dispatchEvent(new CustomEvent("api:signupSuccess", { detail }));
  return true;
}

export async function login(username, password, opts = {}) {
  // ttl_secs will be clamped by server (AUTH_MAX_TTL_SECS)
  const r = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username,
      password,
      ttl_secs: opts.ttl_secs ?? 3600,
      scope: opts.scope // optional string
    })
  });
  if (!r.ok) {
    const txt = await r.text().catch(() => "");
    const err = respError(r, txt);
    window.dispatchEvent(new CustomEvent("api:loginError", { detail: { error: err.message } }));
    throw err;
  }
  const data = await r.json();
  // Cookie (rb_token) is set HttpOnly by the proxy; we also broadcast for UI.
  window.dispatchEvent(new CustomEvent("api:loginSuccess", { detail: { username, token: data } }));
  return data;
}

export async function logout() {
  const r = await fetch("/api/auth/logout", { method: "POST" });
  if (!r.ok) throw respError(r, await r.text().catch(() => ""));
  window.dispatchEvent(new Event("api:loggedOut"));
  return true;
}

// ---------- existing helpers (unchanged semantics) ----------
export async function ping() {
  const r = await fetch("/api/ping");
  if (!r.ok) throw respError(r, await r.text().catch(() => ""));
  return r.text();
}

export async function listObjects(params = {}) {
  const qp = new URLSearchParams();
  if (params.recursive) qp.set("recursive", "1");
  if (params.prefix) qp.set("prefix", params.prefix);
  const url = "/api/objects" + (qp.toString() ? `?${qp}` : "");
  const r = await fetch(url);
  if (!r.ok) throw respError(r, await r.text().catch(() => ""));
  return r.json(); // [{key,size,modified}]
}

export async function uploadObject(key, file) {
  key = encKeyForPath(key);
  const r = await fetch(`/api/objects/${key}`, {
    method: "PUT",
    headers: { "Content-Type": file.type || "application/octet-stream" },
    body: file
  });
  if (!r.ok) throw respError(r, await r.text().catch(() => ""));
  return true;
}

export async function deleteObject(key) {
  key = encKeyForPath(key);
  const r = await fetch(`/api/objects/${key}`, { method: "DELETE" });
  if (r.status === 204) return true;
  throw respError(r, await r.text().catch(() => ""));
}
