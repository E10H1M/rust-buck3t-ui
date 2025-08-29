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
  return k.split("/").map(encodeURIComponent).join("/");
}

export function createViewer() {
  const container = el("div", "viewer");

  const title = el("h1", null, "📂 Bucket Viewer");
  container.appendChild(title);

  // breadcrumbs
  const crumbs = el("div", "breadcrumbs");
  container.appendChild(crumbs);

  const list = el("ul", "object-list");
  container.appendChild(list);

  let prefix = ""; // current folder, always ends with "" or "foo/bar/"

  function normalizedPrefix(p) {
    if (!p) return "";
    return p.endsWith("/") ? p : p + "/";
  }

  // function goTo(p) {
  //   prefix = normalizedPrefix(p);
  //   window.dispatchEvent(new CustomEvent("app:refreshObjects", { detail: { prefix } }));
  // }

  function goTo(p) {
    const next = normalizedPrefix(p);
    if (next === prefix) return; // no-op if already here
    prefix = next;

    const url = prefix
      ? `${location.pathname}?prefix=${encodeURIComponent(prefix)}`
      : location.pathname;

    history.pushState({ prefix }, "", url);
    window.dispatchEvent(new CustomEvent("app:refreshObjects", { detail: { prefix } }));
  }


  function renderCrumbs() {
    crumbs.innerHTML = "";
    crumbs.setAttribute("role", "navigation");
    crumbs.setAttribute("aria-label", "Breadcrumb");

    const home = el("a", "crumb", "root");
    home.href = "#";
    home.addEventListener("click", (e) => { e.preventDefault(); goTo(""); });
    crumbs.appendChild(home);

    const partsFull = prefix ? prefix.replace(/\/$/, "").split("/") : [];
    // compact very long paths: root / … / last-2
    const parts =
      partsFull.length > 4
        ? [partsFull[0], "…", ...partsFull.slice(-2)]
        : partsFull;

    let acc = "";
    parts.forEach((part, idx) => {
      const isEllipsis = part === "…";
      const isLast =
        idx === parts.length - 1 && partsFull.length > 0 && !isEllipsis;

      // separator
      crumbs.appendChild(el("span", "sep", "›"));

      if (isEllipsis) {
        const dot = el("span", "crumb ellipsis", "…");
        crumbs.appendChild(dot);
        return;
      }

      // rebuild actual path even if compacted
      const realPart = partsFull.length > 4 && idx < parts.length - 2 && idx > 0
        ? partsFull[partsFull.length - 2 + (idx - (parts.length - 2))]
        : part;

      acc += realPart + "/";

      const a = el("a", "crumb" + (isLast ? " current" : ""), realPart);
      a.href = "#";
      a.addEventListener("click", (e) => { e.preventDefault(); goTo(acc); });
      crumbs.appendChild(a);
    });
  }

  function renderObjects(payload) {
    list.innerHTML = "";

    // payload may be array or {objects, prefix}
    let objs = payload;
    if (payload && typeof payload === "object" && !Array.isArray(payload)) {
      if (Array.isArray(payload.objects)) objs = payload.objects;
      if (typeof payload.prefix === "string") prefix = normalizedPrefix(payload.prefix);
    }

    if (!Array.isArray(objs)) {
      list.appendChild(el("li", "error", "Invalid objects payload"));
      return;
    }

    renderCrumbs();

    // group into immediate folders + files at current level
    const pfx = prefix; // already normalized
    const dirSet = new Set();
    const files = [];

    for (const o of objs) {
      if (pfx && !o.key.startsWith(pfx)) continue;
      const rest = pfx ? o.key.slice(pfx.length) : o.key;
      if (rest.includes("/")) {
        dirSet.add(rest.split("/")[0]); // first segment
      } else {
        files.push(o);
      }
    }

    const dirs = Array.from(dirSet).sort((a, b) => a.localeCompare(b));

    // render folders first
    for (const d of dirs) {
      const li = el("li", "object-item folder");
      const label = el("span", "object-label", `📁 ${d}/`);
      li.appendChild(label);
      li.addEventListener("click", () => goTo((pfx || "") + d + "/"));
      list.appendChild(li);
    }

    // then files at this level
    files.sort((a, b) => a.key.localeCompare(b.key));
    files.forEach((o) => {
      const li = el("li", "object-item");
      const label = el("span", "object-label", `📄 ${o.key.split("/").pop()} (${o.size} bytes)`);

      const actions = el("div", "object-actions");

      // Open (inline)
      const openA = el("a", "btn small");
      openA.textContent = "Open";
      openA.href = `/api/objects/${encKeyForPath(o.key)}?download=0`;
      openA.target = "_blank";
      openA.rel = "noopener";

      // Download
      const dlA = el("a", "btn small secondary");
      dlA.textContent = "Download";
      dlA.href = `/api/objects/${encKeyForPath(o.key)}?download=1`;
      dlA.setAttribute("download", o.key.split("/").pop() || "file");

      // Delete
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

    if (dirs.length === 0 && files.length === 0) {
      list.appendChild(el("li", "empty", "(empty)"));
    }
  }

  function renderError(err) {
    list.innerHTML = "";
    list.appendChild(el("li", "error", "Failed to load objects: " + err));
  }

  window.addEventListener("api:objects", (e) => renderObjects(e.detail));
  window.addEventListener("api:objectsError", (e) => renderError(e.detail));

  const refreshBtn = el("button", "btn", "Refresh");
  refreshBtn.addEventListener("click", () => {
    window.dispatchEvent(new CustomEvent("app:refreshObjects", { detail: { prefix } }));
  });
  container.appendChild(refreshBtn);

  return container;
}
