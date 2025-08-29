// /static/js/app.js
import { createAuth } from "/static/js/auth.js";
import { createMenuBar } from "/static/js/menubar.js";
import { createSidebar } from "/static/js/sidebar.js";
import { createViewer } from "/static/js/viewer.js";
import { createSettings } from "/static/js/settings.js";
import { createUpload } from "/static/js/upload.js";
import { ping, listObjects, uploadObject, deleteObject, logout } from "/static/js/api.js";

// mount global UI
// document.getElementById("sidebar-root").appendChild(createSidebar());
// document.getElementById("menubar-root").appendChild(createMenuBar());

const sidebarRoot = document.getElementById("sidebar-root");
const menubarRoot = document.getElementById("menubar-root");

function mountChrome() {
  if (!menubarRoot.firstChild) menubarRoot.appendChild(createMenuBar());
  if (!sidebarRoot.firstChild) sidebarRoot.appendChild(createSidebar());
}

function unmountChrome() {
  menubarRoot.replaceChildren();
  sidebarRoot.replaceChildren();
}

// roots
const roots = {
  auth: document.getElementById("auth-root"),  
  viewer: document.getElementById("viewer-root"),
  upload: document.getElementById("upload-root"),
  settings: document.getElementById("settings-root"),
};

// instances (lazy)
const instances = { auth: null, viewer: null, upload: null, settings: null };
function mountAuth() {
  if (!instances.auth) {
    const el = createAuth();
    roots.auth.appendChild(el);
    instances.auth = el;
  }
}

function mountViewer() {
  if (!instances.viewer) {
    const el = createViewer();
    roots.viewer.appendChild(el);
    instances.viewer = el;
  }
}

function mountUpload() {
  if (!instances.upload) {
    const el = createUpload();
    roots.upload.appendChild(el);
    instances.upload = el;
  }
}

function mountSettings() {
  if (!instances.settings) {
    const el = createSettings();
    roots.settings.appendChild(el);
    instances.settings = el;
  }
}

function showRoot(which) {
  roots.auth.style.display    = (which === "auth")    ? "" : "none";
  roots.viewer.style.display   = (which === "viewer")   ? "" : "none";
  roots.upload.style.display   = (which === "upload")   ? "" : "none";
  roots.settings.style.display = (which === "settings") ? "" : "none";
}

let mode = "auth";
function setMode(next) {
  if (next === mode) return;
  mode = next;

  if (mode === "auth")    mountAuth();   // <-- add
  if (mode === "viewer")  mountViewer();
  if (mode === "upload")  mountUpload();
  if (mode === "settings")mountSettings();

  showRoot(mode);
  window.dispatchEvent(new CustomEvent("app:modeChanged", { detail: { mode } }));
}

// boot
mountAuth();
showRoot("auth");
window.dispatchEvent(new CustomEvent("app:modeChanged", { detail: { mode: "auth" } }));



window.addEventListener("api:loginSuccess", () => {
  mountChrome();
  setMode("viewer");
  window.dispatchEvent(new Event("app:refreshObjects"));
});
window.addEventListener("api:loggedOut", () => {
  unmountChrome();
  ["viewer","upload","settings","auth"].forEach(k => { roots[k].replaceChildren(); instances[k]=null; });
  setMode("auth");
});

window.addEventListener("app:logout", async () => {
  try { await logout(); }
  catch (e) { alert("Logout failed: " + (e?.message || e)); }
});

// menubar drives app mode
window.addEventListener("app:setMode", (e) => {
  const next = e.detail?.mode;
  if (next === "viewer" || next === "upload" || next === "settings") {
    setMode(next);
  }
});

// connectivity check
ping()
  .then(txt => console.log("Backend ping →", txt))
  .catch(err => console.error("Backend ping failed:", err));

// hook up viewer refresh
window.addEventListener("app:refreshObjects", async () => {
  try {
    const objs = await listObjects();
    window.dispatchEvent(new CustomEvent("api:objects", { detail: objs }));
  } catch (err) {
    window.dispatchEvent(new CustomEvent("api:objectsError", { detail: err.message }));
  }
});

// hook up uploads
window.addEventListener("app:uploadFile", async (e) => {
  const file = e.detail.file;

  try {
    await uploadObject(file.name, file);
    window.dispatchEvent(new CustomEvent("api:uploadProgress", {
      detail: { file, status: "✅ done" }
    }));

    // optional: refresh viewer after successful upload
    window.dispatchEvent(new Event("app:refreshObjects"));
  } catch (err) {
    window.dispatchEvent(new CustomEvent("api:uploadProgress", {
      detail: { file, status: "❌ failed: " + err.message }
    }));
  }
});

// hook up deletes
window.addEventListener("app:deleteObject", async (e) => {
  const key = e.detail?.key;
  if (!key) return;
  try {
    await deleteObject(key);
    window.dispatchEvent(new Event("app:refreshObjects"));
    window.dispatchEvent(new CustomEvent("api:deleteResult", { detail: { key, status: "✅ deleted" } }));
  } catch (err) {
    window.dispatchEvent(new CustomEvent("api:deleteResult", { detail: { key, status: "❌ failed: " + err.message } }));
  }
});

// first load
// window.dispatchEvent(new Event("app:refreshObjects"));
