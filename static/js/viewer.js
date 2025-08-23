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
      const li = el("li", "object-item", `${o.key} (${o.size} bytes)`);
      list.appendChild(li);
    });
  }

  function renderError(err) {
    list.innerHTML = "";
    list.appendChild(el("li", "error", "Failed to load objects: " + err));
  }

  // listen for app events
  window.addEventListener("api:objects", e => renderObjects(e.detail));
  window.addEventListener("api:objectsError", e => renderError(e.detail));

  const refreshBtn = el("button", "btn", "Refresh");
  refreshBtn.addEventListener("click", () => {
    window.dispatchEvent(new Event("app:refreshObjects"));
  });
  container.appendChild(refreshBtn);

  return container;
}
