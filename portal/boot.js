// Hero entrance gate. Loaded without defer so it runs before the first paint.
// The entrance waits until the heading's font has arrived and main.js has
// done its setup (the WebGL field, the tiers), so it plays on an idle main
// thread and never reflows when the font swaps in. Without JS, or without
// this file, the hero is simply shown.
(function () {
  "use strict";

  var root = document.documentElement;
  root.classList.add("js");

  var started = false;
  function go() {
    if (started) return;
    started = true;
    function ready() { root.classList.add("is-ready"); }
    // Two frames: let the browser paint the settled page once first. Frames
    // don't run in a hidden tab, so a timer backs them up.
    var timer = setTimeout(ready, 150);
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { clearTimeout(timer); ready(); });
    });
  }

  // Never hold the hero back for long, whatever happens below.
  setTimeout(go, 1200);
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return go();

  var font = document.fonts && document.fonts.load
    ? document.fonts.load('700 1em "Mona Sans"').catch(function () {})
    : Promise.resolve();
  // Deferred scripts (main.js) have run by DOMContentLoaded.
  var parsed = new Promise(function (resolve) {
    if (document.readyState !== "loading") resolve();
    else document.addEventListener("DOMContentLoaded", resolve, { once: true });
  });
  Promise.all([font, parsed]).then(go, go);
})();
