// // /static/js/viewer.js

// (function loadViewerCSS() {
//   if (!document.querySelector('link[href="/static/css/viewer.css"]')) {
//     const link = document.createElement("link");
//     link.rel = "stylesheet";
//     link.href = "/static/css/viewer.css";
//     document.head.appendChild(link);
//   }
// })();

// function el(t, c, txt) {
//   const n = document.createElement(t);
//   if (c) n.className = c;
//   if (txt != null) n.textContent = txt;
//   return n;
// }

// export function createViewer() {
//   const container = el("div", "viewer");

//   const title = el("h1", null, "📂 Bucket Viewer");
//   container.appendChild(title);

//   const status = el("div", "status");
//   container.appendChild(status);

//   const list = el("ul", "object-list");
//   container.appendChild(list);

//   function setStatus(msg, kind) {
//     status.textContent = msg || "";
//     status.className = "status" + (kind ? " " + kind : "");
//     if (msg) {
//       clearTimeout(setStatus._t);
//       setStatus._t = setTimeout(() => {
//         status.textContent = "";
//         status.className = "status";
//       }, 2000);
//     }
//   }

//   function renderObjects(objs) {
//     list.innerHTML = "";

//     if (objs && typeof objs === "object" && !Array.isArray(objs)) {
//       objs = objs.objects;
//     }

//     if (!Array.isArray(objs)) {
//       list.appendChild(el("li", "error", "Invalid objects payload"));
//       return;
//     }

//     objs.forEach(o => {
//       const li = el("li", "object-item");
//       const label = el("span", "object-label", `${o.key} (${o.size} bytes)`);

//       const actions = el("div", "object-actions");

//       const delBtn = el("button", "btn danger small", "Delete");
//       delBtn.title = `Delete ${o.key}`;
//       delBtn.addEventListener("click", (ev) => {
//         ev.stopPropagation();
//         if (!confirm(`Delete "${o.key}"?`)) return;
//         window.dispatchEvent(new CustomEvent("app:deleteObject", { detail: { key: o.key } }));
//       });

//       actions.appendChild(delBtn);

//       li.appendChild(label);
//       li.appendChild(actions);
//       list.appendChild(li);
//     });
//   }

//   function renderError(err) {
//     list.innerHTML = "";
//     list.appendChild(el("li", "error", "Failed to load objects: " + err));
//   }

//   // listen for app events
//   window.addEventListener("api:objects", e => renderObjects(e.detail));
//   window.addEventListener("api:objectsError", e => renderError(e.detail));

//   // optional: display delete results
//   window.addEventListener("api:deleteResult", (e) => {
//     const { key, status } = e.detail || {};
//     if (!status) return;
//     const kind = status.startsWith("✅") ? "ok" : "err";
//     setStatus(`${status} — ${key}`, kind);
//   });

//   const refreshBtn = el("button", "btn", "Refresh");
//   refreshBtn.addEventListener("click", () => {
//     window.dispatchEvent(new Event("app:refreshObjects"));
//   });
//   container.appendChild(refreshBtn);

//   return container;
// }


// /static/js/viewer.js

(function loadViewerCSS() {
  if (!document.querySelector('link[href="/static/css/viewer.css"]')) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "/static/css/viewer.css";
    document.head.appendChild(link);
  }
})();

function el(t, c, txt) {
  const n = document.createElement(t);
  if (c) n.className = c;
  if (txt != null) n.textContent = txt;
  return n;
}

function encKeyForPath(k) {
  // encode each segment so slashes remain as path separators
  return k.split('/').map(encodeURIComponent).join('/');
}

export function createViewer() {
  const container = el("div", "viewer");

  const title = el("h1", null, "📂 Bucket Viewer");
  container.appendChild(title);

  const list = el("ul", "object-list");
  container.appendChild(list);

  function renderObjects(objs) {
    list.innerHTML = "";

    if (objs && typeof objs === "object" && !Array.isArray(objs)) {
      objs = objs.objects;
    }

    if (!Array.isArray(objs)) {
      list.appendChild(el("li", "error", "Invalid objects payload"));
      return;
    }

    objs.forEach(o => {
      const li = el("li", "object-item");
      const label = el("span", "object-label", `${o.key} (${o.size} bytes)`);

      const actions = el("div", "object-actions");

      // Open (inline)
      const openA = el("a", "btn small");
      openA.textContent = "Open";
      openA.href = `/api/objects/${encKeyForPath(o.key)}?download=0`;
      openA.target = "_blank";
      openA.rel = "noopener";

      // Download (attachment)
      const dlA = el("a", "btn small secondary");
      dlA.textContent = "Download";
      dlA.href = `/api/objects/${encKeyForPath(o.key)}?download=1`;
      // set filename hint for browsers
      const filename = o.key.split('/').pop() || "file";
      dlA.setAttribute("download", filename);

      // Delete (already wired via app.js)
      const delBtn = el("button", "btn small danger", "Delete");
      delBtn.title = `Delete ${o.key}`;
      delBtn.addEventListener("click", (ev) => {
        ev.stopPropagation();
        if (!confirm(`Delete "${o.key}"?`)) return;
        window.dispatchEvent(new CustomEvent("app:deleteObject", { detail: { key: o.key } }));
      });

      actions.appendChild(openA);
      actions.appendChild(dlA);
      actions.appendChild(delBtn);

      li.appendChild(label);
      li.appendChild(actions);
      list.appendChild(li);
    });
  }

  function renderError(err) {
    list.innerHTML = "";
    list.appendChild(el("li", "error", "Failed to load objects: " + err));
  }

  window.addEventListener("api:objects", e => renderObjects(e.detail));
  window.addEventListener("api:objectsError", e => renderError(e.detail));

  const refreshBtn = el("button", "btn", "Refresh");
  refreshBtn.addEventListener("click", () => {
    window.dispatchEvent(new Event("app:refreshObjects"));
  });
  container.appendChild(refreshBtn);

  return container;
}
