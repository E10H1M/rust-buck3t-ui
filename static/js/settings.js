(function loadSettingsCSS() {
  if (!document.querySelector('link[href="/static/css/settings.css"]')) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "/static/css/settings.css";
    document.head.appendChild(link);
  }
})();

function el(t, c, txt) {
  const n = document.createElement(t);
  if (c) n.className = c;
  if (txt != null) n.textContent = txt;
  return n;
}

export function createSettings() {
  const container = el("div", "settings");

  const title = el("h1", null, "⚙️ Settings");
  container.appendChild(title);

  // placeholder fields
  const field = el("div", "field");
  const label = el("label", null, "API Endpoint");
  const input = document.createElement("input");
  input.type = "text";
  input.value = "http://127.0.0.1:8080"; // default
  label.appendChild(input);
  field.appendChild(label);
  container.appendChild(field);

  const saveBtn = el("button", "btn primary", "Save Settings");
  field.appendChild(saveBtn);

  saveBtn.addEventListener("click", () => {
    window.dispatchEvent(new CustomEvent("settings:updated", {
      detail: { endpoint: input.value }
    }));
    alert("Settings saved!");
  });

  return container;
}
