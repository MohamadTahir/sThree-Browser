// Portal behaviour. No dependencies, no network requests.
(function () {
  "use strict";

  var cfg = window.STHREE_PORTAL || {};
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(pointer: fine)").matches;

  // ---- links from config.js ----------------------------------------------
  if (cfg.appUrl) document.querySelectorAll("[data-app-link]").forEach(function (a) { a.href = cfg.appUrl; });
  if (cfg.repoUrl) document.querySelectorAll("[data-repo-link]").forEach(function (a) { a.href = cfg.repoUrl; });

  // ---- nav background once the page scrolls ------------------------------
  var nav = document.querySelector("[data-nav]");
  function onScroll() { nav.classList.toggle("is-scrolled", window.scrollY > 24); }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // ---- the colour field (WebGL; the CSS gradient stays as the fallback) ---
  var canvas = document.querySelector("[data-field]");
  (function field() {
    if (!canvas) return;
    var gl = canvas.getContext("webgl", { antialias: false, premultipliedAlpha: false });
    if (!gl) return;

    var vs = "attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }";
    var fs = [
      "precision mediump float;",
      "uniform vec2 r; uniform float t; uniform vec2 m;",
      "void main(){",
      "  vec2 uv = gl_FragCoord.xy / r;",
      "  vec2 p = uv * vec2(r.x / r.y, 1.0) * 1.6;",
      "  p += (m - 0.5) * 0.25;",
      "  for (int i = 0; i < 4; i++) {",
      "    float fi = float(i);",
      "    p += 0.32 * vec2(sin(p.y * 1.7 + t * 0.11 + fi * 1.3), cos(p.x * 1.4 - t * 0.09 + fi * 2.1));",
      "  }",
      "  float a = 0.5 + 0.5 * sin(p.x * 1.3 + t * 0.05);",
      "  float b = 0.5 + 0.5 * cos(p.y * 1.5 - t * 0.04);",
      "  vec3 blue = vec3(0.15, 0.39, 0.92);",
      "  vec3 violet = vec3(0.49, 0.36, 0.96);",
      "  vec3 cyan = vec3(0.13, 0.78, 0.93);",
      "  vec3 deep = vec3(0.06, 0.07, 0.22);",
      "  vec3 col = mix(deep, blue, a);",
      "  col = mix(col, violet, b * 0.75);",
      "  col = mix(col, cyan, smoothstep(0.62, 1.0, a * b) * 0.85);",
      "  float light = smoothstep(0.05, 1.05, uv.x * 0.95 + uv.y * 0.45);",
      "  col = mix(vec3(0.024, 0.024, 0.043), col, light);",
      "  gl_FragColor = vec4(col, 1.0);",
      "}",
    ].join("\n");

    function sh(type, src) {
      var s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
    }
    var v = sh(gl.VERTEX_SHADER, vs), f = sh(gl.FRAGMENT_SHADER, fs);
    if (!v || !f) return;
    var prog = gl.createProgram();
    gl.attachShader(prog, v);
    gl.attachShader(prog, f);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);

    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    var uR = gl.getUniformLocation(prog, "r"), uT = gl.getUniformLocation(prog, "t"), uM = gl.getUniformLocation(prog, "m");

    // Rendered at reduced resolution: the field is soft, so it costs little.
    var scale = 0.5;
    function size() {
      var w = Math.max(1, Math.floor(canvas.clientWidth * scale));
      var h = Math.max(1, Math.floor(canvas.clientHeight * scale));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); }
      gl.uniform2f(uR, w, h);
    }
    var mouse = [0.5, 0.5], ease = [0.5, 0.5];
    window.addEventListener("pointermove", function (e) { mouse = [e.clientX / innerWidth, 1 - e.clientY / innerHeight]; }, { passive: true });

    var start = performance.now(), visible = true, raf = 0;
    function frame(now) {
      ease[0] += (mouse[0] - ease[0]) * 0.03;
      ease[1] += (mouse[1] - ease[1]) * 0.03;
      size();
      gl.uniform1f(uT, 8 + (now - start) / 1000);
      gl.uniform2f(uM, ease[0], ease[1]);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      raf = visible && !reduce ? requestAnimationFrame(frame) : 0;
    }
    canvas.parentNode.classList.add("is-live");
    frame(performance.now());
    if ("IntersectionObserver" in window && !reduce) {
      new IntersectionObserver(function (e) {
        visible = e[0].isIntersecting;
        if (visible && !raf) raf = requestAnimationFrame(frame);
      }).observe(canvas);
    }
    window.addEventListener("resize", function () { if (!raf) frame(performance.now()); });
  })();

  // ---- the tiers: extrude each slab, tilt toward the pointer -------------
  document.querySelectorAll(".slab").forEach(function (slab) {
    var depth = 14;
    for (var i = 0; i < depth; i++) {
      var l = document.createElement("span");
      l.className = "layer";
      l.style.transform = "translateZ(" + (-i * 1.6) + "px)";
      slab.appendChild(l);
    }
    var top = document.createElement("span");
    top.className = "layer layer--top";
    slab.appendChild(top);
  });
  var scene = document.querySelector("[data-scene]");
  if (scene && finePointer && !reduce) {
    window.addEventListener("pointermove", function (e) {
      var x = e.clientX / innerWidth - 0.5, y = e.clientY / innerHeight - 0.5;
      scene.style.setProperty("--tx", (x * 16).toFixed(2) + "deg");
      scene.style.setProperty("--ty", (y * -10).toFixed(2) + "deg");
    }, { passive: true });
  }

  // ---- bento: sheen follows the pointer ----------------------------------
  if (finePointer) {
    document.querySelectorAll(".tile").forEach(function (t) {
      t.addEventListener("pointermove", function (e) {
        var r = t.getBoundingClientRect();
        t.style.setProperty("--mx", (e.clientX - r.left) + "px");
        t.style.setProperty("--my", (e.clientY - r.top) + "px");
      });
    });
  }

  // ---- small looping demos, only while visible ---------------------------
  function whileVisible(el, every, fn) {
    if (!el || reduce) return;
    var on = false;
    if ("IntersectionObserver" in window) new IntersectionObserver(function (e) { on = e[0].isIntersecting; }).observe(el);
    else on = true;
    setInterval(function () { if (on && !document.hidden) fn(); }, every);
  }

  var files = document.querySelector("[data-files]");
  if (files) {
    var rows = files.children, at = 2;
    rows[at].classList.add("is-on");
    whileVisible(files, 1400, function () {
      rows[at].classList.remove("is-on");
      at = (at + 1) % rows.length;
      rows[at].classList.add("is-on");
    });
  }

  var chips = document.querySelector("[data-chips]");
  if (chips) {
    var c = 2;
    whileVisible(chips, 1800, function () {
      chips.children[c].classList.remove("on");
      c = (c + 1) % chips.children.length;
      chips.children[c].classList.add("on");
    });
  }

  var typed = document.querySelector("[data-type]");
  if (typed) {
    var word = typed.textContent, n = word.length, dir = -1, hold = 0;
    whileVisible(typed, 140, function () {
      if (hold > 0) { hold--; return; }
      n += dir;
      if (n <= 0) { n = 0; dir = 1; hold = 4; }
      if (n >= word.length) { n = word.length; dir = -1; hold = 14; }
      typed.textContent = word.slice(0, n);
    });
  }

  // ---- scroll reveal (content is visible without JS) ---------------------
  if ("IntersectionObserver" in window && !reduce) {
    var targets = document.querySelectorAll(".band .h2, .band .lede, .path, .fact, .tile, .providers, .platforms, .term, .checks, .cta__card");
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add("is-in");
        io.unobserve(e.target);
      });
    }, { rootMargin: "0px 0px -8% 0px" });
    targets.forEach(function (t, i) {
      if (t.getBoundingClientRect().top < innerHeight) return;
      t.classList.add("reveal");
      if (t.classList.contains("tile") || t.classList.contains("fact")) t.style.transitionDelay = (i % 3) * 70 + "ms";
      io.observe(t);
    });
  }

  // ---- copy buttons --------------------------------------------------------
  document.querySelectorAll("[data-copy]").forEach(function (btn) {
    var src = document.getElementById(btn.dataset.copy);
    var label = btn.querySelector("[data-copy-label]");
    btn.addEventListener("click", function () {
      function done(ok) {
        label.textContent = ok ? "Copied" : "Press Ctrl+C";
        btn.classList.toggle("is-done", ok);
        if (!ok) {
          var range = document.createRange();
          range.selectNodeContents(src);
          var sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
        }
        setTimeout(function () { label.textContent = "Copy"; btn.classList.remove("is-done"); }, 1800);
      }
      if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(src.textContent).then(function () { done(true); }, function () { done(false); });
      else done(false);
    });
  });
})();
