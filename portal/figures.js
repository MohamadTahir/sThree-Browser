// Line figures in the fact cards (hairline, vendored in vendor/). They are
// decoration: the text beside each one says the same thing. Loaded as a
// module, so browsers without module support simply show the text.
import { vault, laptop, plug } from "./vendor/hairline.js";

var figures = { vault: vault, laptop: laptop, plug: plug };
// Touch screens have no hover, so there the figures act out their answer on
// their own (they hold still under prefers-reduced-motion).
var play = window.matchMedia("(hover: none)").matches;

document.querySelectorAll("[data-figure]").forEach(function (el) {
  var draw = figures[el.dataset.figure];
  if (!draw) return;
  draw(el, { intensity: 0.6, theme: "dark", play: play });
  centre(el);
});

// Centre the drawing's ink, measured at rest, rather than its box: the
// percentage is of the figure's own width, which is 400 viewBox units.
function centre(el) {
  var svg = el.querySelector("svg");
  if (!svg || !svg.getBBox) return;
  var b;
  try { b = svg.getBBox(); } catch (e) { return; }
  if (!b.width) return;
  var shift = (200 - (b.x + b.width / 2)) / 4;
  el.style.setProperty("--ink-x", shift.toFixed(2));
}
