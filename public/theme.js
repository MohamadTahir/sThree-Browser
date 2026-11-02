// Applies the saved theme before first paint so the page never flashes the
// wrong colours. Loaded as a file (not inline) to satisfy the strict CSP.
(function () {
  try {
    var theme = localStorage.getItem("sthree-theme");
    if (theme === "light" || theme === "dark") {
      document.documentElement.dataset.theme = theme;
    }
  } catch (e) {}
})();
