// /static/js/sidebar.js

(function loadSidebarCSS() {
  if (!document.querySelector('link[href="/static/css/sidebar.css"]')) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "/static/css/sidebar.css";
    document.head.appendChild(link);
  }
})();

export function createSidebar() {
  const sidebar = document.createElement("div");
  sidebar.id = "sidebar";
  sidebar.className = "sidebar";

  // close button
  const closeBtn = document.createElement("button");
  closeBtn.className = "close-btn";
  closeBtn.textContent = "✕";
  closeBtn.addEventListener("click", () => {
    sidebar.classList.toggle("open");
  });

  // title
  const title = document.createElement("h2");
  title.textContent = "Sidebar";

  // just a placeholder list for now
  const list = document.createElement("ul");
  const li = document.createElement("li");
  li.textContent = "Nothing here yet";
  list.appendChild(li);

  sidebar.appendChild(closeBtn);
  sidebar.appendChild(title);
  sidebar.appendChild(list);

  return sidebar;
}

export function toggleSidebar() {
  document.getElementById("sidebar")?.classList.toggle("open");
}
