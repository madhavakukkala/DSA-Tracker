// Modal — the roadmap's side panel: scrim + right-hand aside. One at a time.
// UI.openModal({ head, body, onClose }) → { el, bodyEl, close }
(function () {
  "use strict";
  window.UI = window.UI || {};

  var current = null;

  UI.openModal = function (opts) {
    UI.closeModal();
    var lastFocus = document.activeElement;

    var scrim = document.createElement("div");
    scrim.className = "scrim open";
    var modal = document.createElement("aside");
    modal.className = "modal open";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.innerHTML =
      '<div class="m-head">' + (opts.head || "") +
      '<button class="m-close" aria-label="Close">✕</button></div>' +
      '<div class="m-body">' + (opts.body || "") + "</div>";

    document.body.appendChild(scrim);
    document.body.appendChild(modal);
    document.body.style.overflow = "hidden";

    function close() {
      if (current !== api) return;
      current = null;
      document.body.removeChild(scrim);
      document.body.removeChild(modal);
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
      if (lastFocus && lastFocus.focus) lastFocus.focus();
      if (opts.onClose) opts.onClose();
    }
    function onKey(e) {
      if (e.key === "Escape") { e.stopPropagation(); close(); }
    }
    scrim.addEventListener("click", close);
    modal.querySelector(".m-close").addEventListener("click", close);
    document.addEventListener("keydown", onKey);
    modal.querySelector(".m-close").focus();

    var api = { el: modal, bodyEl: modal.querySelector(".m-body"), close: close };
    current = api;
    return api;
  };

  UI.closeModal = function () { if (current) current.close(); };
  UI.modalOpen = function () { return current !== null; };
})();
