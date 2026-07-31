// Auth — Supabase email/password sign-in. Never hand-rolled: passwords are
// hashed and sessions managed by Supabase. If config.js is empty (or the
// supabase script can't load, e.g. offline on file://), the app silently runs
// in local mode with no accounts.
(function () {
  "use strict";

  var client = null;
  var session = null;

  function configured() {
    return !!(window.CONFIG && CONFIG.SUPABASE_URL && CONFIG.SUPABASE_ANON_KEY &&
      window.supabase && window.supabase.createClient);
  }

  async function init() {
    if (!configured()) return;
    client = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
    var r = await client.auth.getSession();
    session = r.data ? r.data.session : null;
    client.auth.onAuthStateChange(function (event, s) {
      if (event === "PASSWORD_RECOVERY") {
        session = s;
        var pw = prompt("Set a new password (at least 8 characters):");
        if (pw) client.auth.updateUser({ password: pw });
        return;
      }
      var had = !!session;
      session = s;
      // Only reload on a real sign-in/out transition, not token refreshes.
      if (!!s !== had) location.reload();
    });
  }

  function active() { return configured() && !!session; }
  function userId() { return session ? session.user.id : null; }
  function userEmail() { return session ? session.user.email : ""; }
  function metaUsername() {
    return (session && session.user.user_metadata && session.user.user_metadata.username) || "";
  }
  function signOut() { if (client) client.auth.signOut(); }

  // Deletes the auth user via the delete_user() RPC (see README SQL); the
  // trackers row cascades away with it. Returns an error message or null.
  async function deleteAccount() {
    if (!client || !session) return "Not signed in.";
    var r = await client.rpc("delete_user");
    if (r.error) return r.error.message;
    await client.auth.signOut();
    return null;
  }

  // ---- the sign-in gate ----
  function renderGate(el) {
    var mode = "in"; // 'in' | 'up'
    document.title = "Sign in — DSA Tracker";

    function draw() {
      el.innerHTML =
        '<div class="onboard">' +
        '<p class="eyebrow">32 weeks · 3h DSA + 3h dev daily · Striver A2Z</p>' +
        '<h1 class="page-title">' + (mode === "in" ? "Sign in" : "Create your account") + "</h1>" +
        '<p class="onboard-lede">One account, all your problems, revisions and progress — ' +
        "available on any device. Your study data is visible only to you.</p>" +
        '<form id="authForm" class="onboard-form" novalidate>' +
        (mode === "up"
          ? '<label class="f-field"><span>Username (shown in the app)</span>' +
            '<input name="username" autocomplete="username" maxlength="30"></label>'
          : "") +
        '<label class="f-field"><span>Email</span>' +
        '<input name="email" type="email" required autocomplete="email"></label>' +
        '<label class="f-field"><span>Password</span>' +
        '<input name="password" type="password" required minlength="8" ' +
        'autocomplete="' + (mode === "up" ? "new-password" : "current-password") + '"></label>' +
        '<p class="onboard-note mono" id="authMsg" role="status"></p>' +
        '<button type="submit" class="btn btn-primary">' +
        (mode === "in" ? "Sign in" : "Create account") + "</button>" +
        '<p class="small faint">' +
        (mode === "in"
          ? 'New here? <a href="#" id="authSwap">Create an account</a> · ' +
            '<a href="#" id="authForgot">Forgot password?</a>'
          : 'Already have an account? <a href="#" id="authSwap">Sign in</a>') +
        "</p></form></div>";

      var form = document.getElementById("authForm");
      var msg = document.getElementById("authMsg");
      var swap = document.getElementById("authSwap");
      swap.addEventListener("click", function (e) {
        e.preventDefault();
        mode = mode === "in" ? "up" : "in";
        draw();
      });
      var forgot = document.getElementById("authForgot");
      if (forgot) forgot.addEventListener("click", async function (e) {
        e.preventDefault();
        var email = form.elements.email.value.trim();
        if (!email) { msg.textContent = "Enter your email above first."; return; }
        var r = await client.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
        msg.textContent = r.error ? r.error.message : "Reset link sent — check your inbox.";
      });

      form.addEventListener("submit", async function (e) {
        e.preventDefault();
        var email = form.elements.email.value.trim();
        var password = form.elements.password.value;
        if (!email || password.length < 8) {
          msg.textContent = "Email plus a password of at least 8 characters.";
          return;
        }
        msg.textContent = "…";
        try {
          if (mode === "up") {
            var username = form.elements.username.value.trim();
            var r = await client.auth.signUp({
              email: email, password: password,
              options: { data: { username: username } },
            });
            if (r.error) { msg.textContent = r.error.message; return; }
            if (!r.data.session) {
              msg.textContent = "Account created — check your email to confirm, then sign in.";
              return;
            }
            // session present → onAuthStateChange reloads into the app
          } else {
            var r2 = await client.auth.signInWithPassword({ email: email, password: password });
            if (r2.error) { msg.textContent = r2.error.message; return; }
          }
        } catch (err) {
          msg.textContent = "Could not reach the server — check your connection.";
        }
      });
      form.elements.email.focus();
    }
    draw();
  }

  window.Auth = {
    configured: configured,
    init: init,
    active: active,
    userId: userId,
    userEmail: userEmail,
    metaUsername: metaUsername,
    signOut: signOut,
    deleteAccount: deleteAccount,
    renderGate: renderGate,
    get client() { return client; },
  };
})();
