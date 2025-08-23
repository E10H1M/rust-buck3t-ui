// /static/js/api.js
// centralized backend API helpers

export async function ping() {
  const res = await fetch("/api/ping");
  if (!res.ok) throw new Error(res.statusText);
  return res.text(); // "pong"
}

export async function listObjects() {
  const res = await fetch("/api/objects?recursive=1");
  if (!res.ok) throw new Error(res.statusText);
  const data = await res.json();

  // unwrap if backend sends { objects: [...] }
  if (data && typeof data === "object" && !Array.isArray(data)) {
    if (Array.isArray(data.objects)) return data.objects;
  }

  if (!Array.isArray(data)) {
    throw new Error("Invalid objects payload");
  }

  return data;
}

/**
 * Upload an object
 * @param {string} key   object key (usually file.name)
 * @param {File|Blob} file   the raw file data
 * @param {Object} [opts]    optional fetch options (headers, overwrite control, etc.)
 */
export async function uploadObject(key, file, opts = {}) {
  const res = await fetch(`/api/objects/${encodeURIComponent(key)}`, {
    method: "PUT",
    body: file,
    headers: opts.headers || {},
  });

  if (!res.ok) throw new Error(await res.text() || res.statusText);
  return res;
}
