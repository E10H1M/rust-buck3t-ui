import { signup, login } from "/static/js/api.js";

(function loadAuthCSS() {
  if (!document.querySelector('link[href="/static/css/auth.css"]')) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "/static/css/auth.css";
    document.head.appendChild(link);
  }
})();

function el(t, cls, text) {
  const n = document.createElement(t);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

export function createAuth() {
  const wrap = el("div", "auth");
  const title = el("h1", null, "🔐 Sign in to rust-buck3t");
  const sub = el("p", "muted", "[decentralize.] 🫵🏽");

  const form = el("div", "auth-form");

  const uRow = el("label", "row");
  uRow.appendChild(el("span", "lbl", "Username"));
  const uInput = el("input");
  uInput.type = "text";
  uInput.placeholder = "c0nsume";
  uInput.autocomplete = "username";
  uRow.appendChild(uInput);

  const pRow = el("label", "row");
  pRow.appendChild(el("span", "lbl", "Password"));
  const pInput = el("input");
  pInput.type = "password";
  pInput.placeholder = "••••••••";
  pInput.autocomplete = "current-password";
  pRow.appendChild(pInput);

  const btns = el("div", "btns");
  const signBtn   = el("button", "btn outline", "Sign up");
  const loginBtn  = el("button", "btn primary", "Log in");

  btns.appendChild(signBtn);
  btns.appendChild(loginBtn);

  const msg = el("div", "msg muted", "");

  form.appendChild(uRow);
  form.appendChild(pRow);
  form.appendChild(btns);

  wrap.appendChild(title);
  wrap.appendChild(sub);
  wrap.appendChild(form);
  wrap.appendChild(msg);

  const setBusy = (on) => {
    signBtn.disabled = on;
    loginBtn.disabled = on;
  };

  const say = (text, cls = "muted") => {
    msg.className = "msg " + cls;
    msg.textContent = text;
    if (cls !== "muted") {
      clearTimeout(say._t);
      say._t = setTimeout(() => { msg.className = "msg muted"; msg.textContent = ""; }, 3000);
    }
  };

  // Enter submits login
  const maybeLogin = async () => {
    const username = uInput.value.trim();
    const password = pInput.value;
    if (!username || !password) return say("enter username and password", "err");
    try {
      setBusy(true);
      const tok = await login(username, password, { ttl_secs: 3600 });
      say("Signed in", "ok");
    } catch (e) {
      say(e.message || "login failed", "err");
    } finally {
      setBusy(false);
    }
  };

  signBtn.addEventListener("click", async () => {
    const username = uInput.value.trim();
    const password = pInput.value;
    if (!username || !password) return say("enter username and password", "err");
    try {
      setBusy(true);
      await signup(username, password);
      say("signup ok — now log in", "ok");
      pInput.focus();
    } catch (e) {
      say(e.message || "signup failed", "err");
    } finally {
      setBusy(false);
    }
  });

  loginBtn.addEventListener("click", maybeLogin);

  // submit on Enter in either field
  [uInput, pInput].forEach(inp => {
    inp.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") {
        ev.preventDefault();
        maybeLogin();
      }
    });
  });

  // reflect API events (optional)
  window.addEventListener("api:loginError", (e) => {
    say(e.detail?.error || "login failed", "err");
  });

  return wrap;
}
