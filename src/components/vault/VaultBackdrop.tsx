"use client";

import { useEffect, useRef } from "react";

/**
 * The vault screen's backdrop: the portal's living colour field (WebGL, with
 * a CSS gradient underneath as the fallback) and the logo's three tiers as a
 * floating glossy object (VaultTiers). Purely decorative; hidden from assistive tech.
 */

const VERTEX = "attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }";

const FRAGMENT = `
precision mediump float;
uniform vec2 r; uniform float t; uniform vec2 m; uniform float light;
void main(){
  vec2 uv = gl_FragCoord.xy / r;
  vec2 p = uv * vec2(r.x / r.y, 1.0) * 1.5;
  p += (m - 0.5) * 0.2;
  for (int i = 0; i < 4; i++) {
    float fi = float(i);
    p += 0.32 * vec2(sin(p.y * 1.7 + t * 0.11 + fi * 1.3), cos(p.x * 1.4 - t * 0.09 + fi * 2.1));
  }
  float a = 0.5 + 0.5 * sin(p.x * 1.3 + t * 0.05);
  float b = 0.5 + 0.5 * cos(p.y * 1.5 - t * 0.04);
  vec3 blue = vec3(0.15, 0.39, 0.92);
  vec3 violet = vec3(0.49, 0.36, 0.96);
  vec3 cyan = vec3(0.13, 0.78, 0.93);
  vec3 deep = vec3(0.06, 0.07, 0.22);
  vec3 col = mix(deep, blue, a);
  col = mix(col, violet, b * 0.75);
  col = mix(col, cyan, smoothstep(0.62, 1.0, a * b) * 0.85);
  // Brightest around the centre, where the card sits, fading to the ground.
  float d = distance(uv, vec2(0.5, 0.55));
  float glow = 1.0 - smoothstep(0.0, 0.95, d);
  vec3 darkGround = vec3(0.022, 0.022, 0.04);
  vec3 lightGround = vec3(0.965, 0.968, 0.985);
  vec3 dark = mix(darkGround, col * 1.1, pow(glow, 0.8));
  vec3 lite = mix(lightGround, mix(col, vec3(1.0), 0.35), glow * 0.55);
  gl_FragColor = vec4(mix(dark, lite, light), 1.0);
}`;

function isLightTheme(): boolean {
  const pick = document.documentElement.dataset.theme;
  if (pick === "light") return true;
  if (pick === "dark") return false;
  return !window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export default function VaultBackdrop() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const host = canvas.closest("main");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const gl = canvas.getContext("webgl", { antialias: false, premultipliedAlpha: false });
    if (!gl) return;

    const compile = (type: number, src: string) => {
      const s = gl.createShader(type);
      if (!s) return null;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
    };
    const vs = compile(gl.VERTEX_SHADER, VERTEX);
    const fs = compile(gl.FRAGMENT_SHADER, FRAGMENT);
    const prog = gl.createProgram();
    if (!vs || !fs || !prog) return;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const uR = gl.getUniformLocation(prog, "r");
    const uT = gl.getUniformLocation(prog, "t");
    const uM = gl.getUniformLocation(prog, "m");
    const uLight = gl.getUniformLocation(prog, "light");

    let light = isLightTheme() ? 1 : 0;
    const updateTheme = () => {
      light = isLightTheme() ? 1 : 0;
      if (reduce) draw(performance.now());
    };
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", updateTheme);
    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    let mouse = [0.5, 0.5];
    const ease = [0.5, 0.5];
    const onMove = (e: PointerEvent) => {
      mouse = [e.clientX / window.innerWidth, 1 - e.clientY / window.innerHeight];
      // The tiers read these from the screen they sit on.
      if (host && !reduce) {
        host.style.setProperty("--tx", `${((mouse[0] - 0.5) * 14).toFixed(2)}deg`);
        host.style.setProperty("--ty", `${((mouse[1] - 0.5) * 8).toFixed(2)}deg`);
      }
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    // Rendered at half resolution: the field is soft, so it costs little.
    const start = performance.now();
    let raf = 0;
    function draw(now: number) {
      if (!gl || !canvas) return;
      const w = Math.max(1, Math.floor(canvas.clientWidth * 0.5));
      const h = Math.max(1, Math.floor(canvas.clientHeight * 0.5));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
      ease[0] += (mouse[0] - ease[0]) * 0.03;
      ease[1] += (mouse[1] - ease[1]) * 0.03;
      gl.uniform2f(uR, w, h);
      gl.uniform1f(uT, 8 + (now - start) / 1000);
      gl.uniform2f(uM, ease[0], ease[1]);
      gl.uniform1f(uLight, light);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    const loop = (now: number) => {
      if (!document.hidden) draw(now);
      raf = requestAnimationFrame(loop);
    };
    canvas.dataset.live = "true";
    if (reduce) draw(performance.now());
    else raf = requestAnimationFrame(loop);
    const onResize = () => reduce && draw(performance.now());
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      media.removeEventListener("change", updateTheme);
      observer.disconnect();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("resize", onResize);
      // The context is left alive on purpose: React may mount this again on
      // the same canvas (StrictMode, lock then unlock), and a lost context
      // can't draw. The browser frees it with the canvas.
      delete canvas.dataset.live;
    };
  }, []);

  return (
    <div className="vault-field" aria-hidden>
      <canvas ref={canvasRef} />
    </div>
  );
}

/** The logo's three tiers as a floating glossy object. */
export function VaultTiers() {
  return (
    <div className="tiers" aria-hidden>
      <div className="tiers__scene">
        {[3, 2, 1].map((n) => (
          <div key={n} className={`tier tier--${n}`}>
            {Array.from({ length: 10 }, (_, i) => (
              <span key={i} className="tier__layer" style={{ transform: `translateZ(${-i * 1.4}px)` }} />
            ))}
            <span className="tier__layer tier__layer--top" />
          </div>
        ))}
      </div>
    </div>
  );
}
