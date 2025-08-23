// /static/js/upload.js

(function loadUploadCSS() {
  if (!document.querySelector('link[href="/static/css/upload.css"]')) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "/static/css/upload.css";
    document.head.appendChild(link);
  }
})();

function el(t, c, txt) {
  const n = document.createElement(t);
  if (c) n.className = c;
  if (txt != null) n.textContent = txt;
  return n;
}

export function createUpload() {
  const container = el("div", "upload");

  // Title
  const title = el("h1", null, "⬆️ Upload Objects");
  container.appendChild(title);

  // Drop zone + input
  const dropZone = el("div", "drop-zone", "Drag & Drop files here or click to select");
  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.multiple = true;
  fileInput.style.display = "none";

  dropZone.addEventListener("click", () => fileInput.click());
  container.appendChild(dropZone);
  container.appendChild(fileInput);

  // Progress list
  const list = el("ul", "upload-list");
  container.appendChild(list);

  // Handle selection
  fileInput.addEventListener("change", () => {
    for (const file of fileInput.files) {
      queueFile(file);
    }
  });

  // Drag + drop
  dropZone.addEventListener("dragover", e => {
    e.preventDefault();
    dropZone.classList.add("dragover");
  });
  dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("dragover");
  });
  dropZone.addEventListener("drop", e => {
    e.preventDefault();
    dropZone.classList.remove("dragover");
    for (const file of e.dataTransfer.files) {
      queueFile(file);
    }
  });

  // Stubbed upload queue
  function queueFile(file) {
    const li = el("li", "upload-item");
    li.textContent = `${file.name} (${file.size} bytes)`;
    list.appendChild(li);

    // fire event to app.js to actually do the upload
    window.dispatchEvent(new CustomEvent("app:uploadFile", { detail: { file } }));

    // listen for updates about this file
    window.addEventListener("api:uploadProgress", (e) => {
      if (e.detail.file === file) {
        li.textContent = `${file.name} — ${e.detail.status}`;
      }
    });
  }

  return container;
}
