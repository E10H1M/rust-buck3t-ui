// /static/js/app.js

import { createMenuBar } from "/static/js/menubar.js";
import { createSidebar } from "/static/js/sidebar.js";
import { createViewer } from "/static/js/viewer.js";
import { createSettings } from "/static/js/settings.js";
import { createUpload } from "/static/js/upload.js";
import { ping, listObjects, uploadObject } from "/static/js/api.js";

// mount global UI
document.getElementById("sidebar-root").appendChild(createSidebar());
document.getElementById("menubar-root").appendChild(createMenuBar());

// roots
const roots = {
  viewer: document.getElementById("viewer-root"),
  upload: document.getElementById("upload-root"),
  settings: document.getElementById("settings-root"),
};

// instances (lazy)
const instances = { viewer: null, upload: null, settings: null };

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
  roots.viewer.style.display   = (which === "viewer")   ? "" : "none";
  roots.upload.style.display   = (which === "upload")   ? "" : "none";
  roots.settings.style.display = (which === "settings") ? "" : "none";
}

let mode = "viewer";
function setMode(next) {
  if (next === mode) return;
  mode = next;

  if (mode === "viewer")   mountViewer();
  if (mode === "upload")   mountUpload();
  if (mode === "settings") mountSettings();

  showRoot(mode);
  window.dispatchEvent(new CustomEvent("app:modeChanged", { detail: { mode } }));
}

// boot
mountViewer();
showRoot("viewer");
window.dispatchEvent(new CustomEvent("app:modeChanged", { detail: { mode: "viewer" } }));

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

// first load
window.dispatchEvent(new Event("app:refreshObjects"));
