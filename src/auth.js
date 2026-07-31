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

    // Static default strip (settings aren't loaded before sign-in).
    function stripHTML() {
      var ticks = "";
      try {
        for (var h = 1; h < 24; h++) {
          ticks += '<span class="tick" style="left:' + (h / 24 * 100) + '%"></span>';
        }
        ticks += '<span class="lbl" style="left:33.3%">3H · DSA</span>' +
                 '<span class="lbl" style="left:93.75%">3H · DEV</span>';
      } catch (e) { ticks = ""; }
      return '<div class="strip" aria-hidden="true">' + ticks + "</div>" +
        '<div class="hours mono" aria-hidden="true"><span>00:00</span><span>06:00</span>' +
        "<span>12:00</span><span>18:00</span><span>24:00</span></div>";
    }

    function draw() {
      el.innerHTML =
        '<div class="auth-wrap">' +

        '<section class="auth-pitch">' +
        '<p class="eyebrow">32 weeks · Striver A2Z · Namaste React &amp; Node</p>' +
        '<h1 class="auth-title">Six hours<br><em>a day.</em></h1>' +
        '<p class="auth-lede">Two lit windows in a dark 24 — one for algorithms, one for code. ' +
        "Pick your own hours, log every solve, and the tracker brings each problem back at " +
        "day 2, day 5 and day 10 until you own it.</p>" +
        '<div class="auth-strip">' + stripHTML() + "</div>" +
        '<div class="auth-stats mono"><span><b>462</b> problems</span>' +
        "<span><b>224</b> days planned</span><span><b>3×</b> every solve revised</span></div>" +
        "</section>" +

        '<section class="auth-card">' +
        '<div class="auth-tabs" role="tablist">' +
        '<button type="button" class="auth-tab' + (mode === "in" ? " on" : "") +
        '" id="tabIn" role="tab" aria-selected="' + (mode === "in") + '">Sign in</button>' +
        '<button type="button" class="auth-tab' + (mode === "up" ? " on" : "") +
        '" id="tabUp" role="tab" aria-selected="' + (mode === "up") + '">Create account</button>' +
        "</div>" +
        '<form id="authForm" novalidate>' +
        (mode === "up"
          ? '<label class="f-field"><span>Name (shown in the app)</span>' +
            '<input name="username" autocomplete="username" maxlength="30"></label>'
          : "") +
        '<label class="f-field"><span>Email</span>' +
        '<input name="email" type="email" required autocomplete="email" ' +
        'placeholder="you@example.com"></label>' +
        '<label class="f-field"><span>Password</span>' +
        '<input name="password" type="password" required minlength="8" ' +
        'placeholder="At least 8 characters" ' +
        'autocomplete="' + (mode === "up" ? "new-password" : "current-password") + '"></label>' +
        '<p class="auth-msg mono" id="authMsg" role="status"></p>' +
        '<button type="submit" class="btn btn-primary auth-submit">' +
        (mode === "in" ? "Sign in" : "Create account") + "</button>" +
        (mode === "in"
          ? '<p class="small faint auth-foot"><a href="#" id="authForgot">Forgot password?</a></p>'
          : '<p class="small faint auth-foot">Your study data is visible only to you.</p>') +
        "</form></section></div>";

      var form = document.getElementById("authForm");
      var msg = document.getElementById("authMsg");
      function say(text, isError) {
        msg.textContent = text;
        msg.classList.toggle("err", !!isError);
      }
      document.getElementById("tabIn").addEventListener("click", function () {
        if (mode !== "in") { mode = "in"; draw(); }
      });
      document.getElementById("tabUp").addEventListener("click", function () {
        if (mode !== "up") { mode = "up"; draw(); }
      });
      var forgot = document.getElementById("authForgot");
      if (forgot) forgot.addEventListener("click", async function (e) {
        e.preventDefault();
        var email = form.elements.email.value.trim();
        if (!email) { say("Enter your email above first.", true); form.elements.email.focus(); return; }
        var r = await client.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
        if (r.error) say(r.error.message, true);
        else say("Reset link sent — check your inbox.");
      });

      form.addEventListener("submit", async function (e) {
        e.preventDefault();
        var email = form.elements.email.value.trim();
        var password = form.elements.password.value;
        if (!email || password.length < 8) {
          say("Email plus a password of at least 8 characters.", true);
          return;
        }
        say(mode === "up" ? "Creating your account…" : "Signing in…");
        try {
          if (mode === "up") {
            var username = form.elements.username.value.trim();
            var r = await client.auth.signUp({
              email: email, password: password,
              options: { data: { username: username } },
            });
            if (r.error) { say(r.error.message, true); return; }
            if (!r.data.session) {
              say("Account created — check your email to confirm, then sign in.");
              return;
            }
            // session present → onAuthStateChange reloads into the app
          } else {
            var r2 = await client.auth.signInWithPassword({ email: email, password: password });
            if (r2.error) { say(r2.error.message, true); return; }
          }
        } catch (err) {
          say("Could not reach the server — check your connection.", true);
        }
      });
      form.querySelector("input").focus();
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
