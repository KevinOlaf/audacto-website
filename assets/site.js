// Audacto site: scroll reveals, the hero monitor, and the parametric EQ demo.
// No dependencies and no network requests.
(() => {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const MONO = '500 11px "IBM Plex Mono", ui-monospace, Menlo, monospace';
  const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();

  // ---------- Reveal on scroll ----------
  const reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !reduceMotion.matches) {
    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      }
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add("is-visible"));
  }

  // ---------- Shared canvas sizing ----------
  function fitCanvas(canvas) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const { width, height } = canvas.getBoundingClientRect();
    const w = Math.max(1, Math.round(width * dpr));
    const h = Math.max(1, Math.round(height * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, width, height };
  }

  const FMIN = 20;
  const FMAX = 20000;
  const logPos = (f) => Math.log(f / FMIN) / Math.log(FMAX / FMIN);

  // ---------- Hero monitor: a 31-band, third-octave display ----------
  const monitor = document.querySelector("[data-monitor]");
  if (monitor) {
    const BANDS = 31;
    const centers = Array.from({ length: BANDS }, (_, i) => 20 * Math.pow(2, i / 3));
    const level = new Float32Array(BANDS);
    const peak = new Float32Array(BANDS);
    const seed = centers.map((_, i) => ({
      a: 0.6 + ((i * 7919) % 97) / 97,
      b: 1.3 + ((i * 104729) % 89) / 89,
      p: (i * 2.399) % (Math.PI * 2),
    }));
    const stops = [
      [0.0, [85, 214, 200]],
      [0.45, [79, 141, 245]],
      [0.72, [139, 107, 224]],
      [1.0, [196, 63, 131]],
    ];
    const colorAt = (t) => {
      for (let i = 1; i < stops.length; i++) {
        if (t <= stops[i][0]) {
          const [t0, c0] = stops[i - 1];
          const [t1, c1] = stops[i];
          const k = (t - t0) / (t1 - t0);
          return c0.map((v, j) => Math.round(v + (c1[j] - v) * k));
        }
      }
      return stops[stops.length - 1][1];
    };

    // A plausible programme envelope: weight in the lows and mids, a kick
    // around 60 Hz, hats near 8 kHz. It is an illustration, not analysis.
    function target(i, t) {
      const x = i / (BANDS - 1);
      const tilt = 0.82 - 0.5 * x + 0.22 * Math.exp(-Math.pow((x - 0.38) / 0.16, 2));
      const s = seed[i];
      const wobble = 0.5 + 0.25 * Math.sin(t * s.a + s.p) + 0.25 * Math.sin(t * s.b * 0.7 + s.p * 1.7);
      const beat = t * 2.1;
      const kick = Math.exp(-((beat % 1) * 9)) * Math.exp(-Math.pow((x - 0.13) / 0.08, 2));
      const hat = Math.exp(-(((beat + 0.5) % 1) * 14)) * Math.exp(-Math.pow((x - 0.8) / 0.09, 2));
      return Math.min(1, tilt * (0.35 + 0.65 * wobble) + 0.55 * kick + 0.35 * hat);
    }

    let last = 0;
    function step(t, dt) {
      for (let i = 0; i < BANDS; i++) {
        const goal = target(i, t);
        const rate = goal > level[i] ? 18 : 5;
        level[i] += (goal - level[i]) * Math.min(1, rate * dt);
        peak[i] = Math.max(level[i], peak[i] - 0.35 * dt);
      }
    }

    function draw() {
      const { ctx, width: w, height: h } = fitCanvas(monitor);
      ctx.clearRect(0, 0, w, h);
      const padX = 18;
      const top = 30;
      const mid = top + (h - top - 14) / 2;
      const amp = (h - top - 14) / 2 - 4;
      const slot = (w - padX * 2) / BANDS;
      const bar = Math.max(2, slot * 0.46);

      ctx.font = MONO;
      ctx.fillStyle = "rgba(143, 163, 157, 0.75)";
      ctx.textBaseline = "top";
      ctx.textAlign = "left";
      ctx.fillText("32 Hz", padX, 10);
      ctx.textAlign = "center";
      ctx.fillText("1 kHz", padX + slot * 15.5, 10);
      ctx.textAlign = "right";
      ctx.fillText("16 kHz", w - padX, 10);

      for (let i = 0; i < BANDS; i++) {
        const x = padX + slot * i + (slot - bar) / 2;
        ctx.fillStyle = "rgba(26, 35, 33, 0.55)";
        ctx.fillRect(x, top, bar, h - top - 14);
      }
      ctx.fillStyle = "rgba(85, 214, 200, 0.10)";
      ctx.fillRect(padX, mid, w - padX * 2, 1);

      for (let i = 0; i < BANDS; i++) {
        const x = padX + slot * i + (slot - bar) / 2;
        const v = Math.max(0.03, level[i]);
        const len = v * amp;
        const [r, g, b] = colorAt(i / (BANDS - 1));
        const grad = ctx.createLinearGradient(0, mid - len, 0, mid + len);
        grad.addColorStop(0, `rgba(${r},${g},${b},0.25)`);
        grad.addColorStop(0.5, `rgba(${r},${g},${b},0.95)`);
        grad.addColorStop(1, `rgba(${r},${g},${b},0.25)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(x, mid - len, bar, len * 2, Math.min(bar / 2, 3));
        else ctx.rect(x, mid - len, bar, len * 2);
        ctx.fill();
        const pk = peak[i] * amp;
        ctx.fillStyle = `rgba(${r},${g},${b},0.9)`;
        ctx.fillRect(x, mid - pk - 3, bar, 1.5);
      }
    }

    let running = false;
    let visible = true;
    function frame(now) {
      if (!running) return;
      const t = now / 1000;
      const dt = last ? Math.min(0.05, t - last) : 0.016;
      last = t;
      step(t, dt);
      draw();
      requestAnimationFrame(frame);
    }
    function start() {
      if (running || reduceMotion.matches || !visible || document.hidden) return;
      running = true;
      last = 0;
      requestAnimationFrame(frame);
    }
    function stop() { running = false; }
    function still() {
      for (let k = 0; k < 90; k++) step(3.2 + k / 60, 1 / 60);
      draw();
    }

    fontsReady.then(() => {
      still();
      start();
    });
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        visible ? start() : stop();
      }).observe(monitor);
    }
    document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));
    reduceMotion.addEventListener?.("change", () => (reduceMotion.matches ? (stop(), still()) : start()));
    if ("ResizeObserver" in window) new ResizeObserver(() => { if (!running) draw(); }).observe(monitor);
  }

  // ---------- Parametric EQ demo ----------
  const stage = document.querySelector("[data-eq]");
  if (stage) {
    const canvas = stage.querySelector("canvas");
    const handles = Array.from(stage.querySelectorAll(".eq-handle"));
    const readout = document.querySelectorAll("[data-eq-readout] li");
    const resetButton = document.querySelector("[data-eq-reset]");
    const GMAX = 12;
    const FS = 48000;
    const defaults = [
      { f: 80, g: 4, q: 0.9 },
      { f: 420, g: -3, q: 1.2 },
      { f: 2600, g: 2.5, q: 1.4 },
      { f: 9500, g: 3.5, q: 0.8 },
    ];
    let bands = defaults.map((b) => ({ ...b }));

    // RBJ cookbook peaking filter, magnitude in dB at frequency f.
    function peakingDb(band, f) {
      const A = Math.pow(10, band.g / 40);
      const w0 = (2 * Math.PI * band.f) / FS;
      const alpha = Math.sin(w0) / (2 * band.q);
      const cos0 = Math.cos(w0);
      const b0 = 1 + alpha * A, b1 = -2 * cos0, b2 = 1 - alpha * A;
      const a0 = 1 + alpha / A, a1 = -2 * cos0, a2 = 1 - alpha / A;
      const w = (2 * Math.PI * f) / FS;
      const c1 = Math.cos(w), s1 = Math.sin(w), c2 = Math.cos(2 * w), s2 = Math.sin(2 * w);
      const nr = b0 + b1 * c1 + b2 * c2, ni = -(b1 * s1 + b2 * s2);
      const dr = a0 + a1 * c1 + a2 * c2, di = -(a1 * s1 + a2 * s2);
      return 10 * Math.log10((nr * nr + ni * ni) / (dr * dr + di * di));
    }

    const fmtF = (f) => (f >= 1000 ? `${(f / 1000).toFixed(f >= 10000 ? 1 : 2)} kHz` : `${Math.round(f)} Hz`);
    const fmtG = (g) => `${g > 0 ? "+" : g < 0 ? "−" : "±"}${Math.abs(g).toFixed(1)} dB`;

    function geometry() {
      const { width, height } = canvas.getBoundingClientRect();
      const padL = 36, padR = 14, padT = 14, padB = 26;
      return {
        width, height, padL, padR, padT, padB,
        x: (f) => padL + logPos(f) * (width - padL - padR),
        y: (g) => padT + ((GMAX - g) / (2 * GMAX)) * (height - padT - padB),
        f: (x) => FMIN * Math.pow(FMAX / FMIN, (x - padL) / (width - padL - padR)),
        g: (y) => GMAX - ((y - padT) / (height - padT - padB)) * 2 * GMAX,
      };
    }

    function render() {
      const { ctx, width: w, height: h } = fitCanvas(canvas);
      const G = geometry();
      ctx.clearRect(0, 0, w, h);
      ctx.font = MONO;
      ctx.textBaseline = "middle";

      for (const g of [-12, -6, 0, 6, 12]) {
        const y = G.y(g);
        ctx.fillStyle = g === 0 ? "rgba(85, 214, 200, 0.16)" : "rgba(44, 56, 53, 0.55)";
        ctx.fillRect(G.padL, Math.round(y), w - G.padL - G.padR, 1);
        ctx.fillStyle = "rgba(122, 140, 135, 0.85)";
        ctx.textAlign = "right";
        ctx.fillText(g > 0 ? `+${g}` : `${g}`, G.padL - 8, y);
      }
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      const marks = [[20, "20"], [100, "100"], [1000, "1k"], [10000, "10k"]];
      if (w >= 520) marks.push([20000, "20k"]);
      for (const [f, label] of marks) {
        const x = G.x(f);
        ctx.fillStyle = "rgba(44, 56, 53, 0.4)";
        ctx.fillRect(Math.round(x), G.padT, 1, h - G.padT - G.padB);
        ctx.fillStyle = "rgba(122, 140, 135, 0.85)";
        ctx.fillText(label, Math.min(Math.max(x, G.padL + 10), w - G.padR - 12), h - 8);
      }

      const steps = 260;
      const pts = [];
      for (let i = 0; i <= steps; i++) {
        const f = FMIN * Math.pow(FMAX / FMIN, i / steps);
        let db = 0;
        for (const b of bands) db += peakingDb(b, f);
        pts.push([G.x(f), Math.max(-GMAX, Math.min(GMAX, db))]);
      }

      // Individual bells, quiet.
      for (const b of bands) {
        ctx.beginPath();
        for (let i = 0; i <= 120; i++) {
          const f = FMIN * Math.pow(FMAX / FMIN, i / 120);
          const y = G.y(Math.max(-GMAX, Math.min(GMAX, peakingDb(b, f))));
          i ? ctx.lineTo(G.x(f), y) : ctx.moveTo(G.x(f), y);
        }
        ctx.strokeStyle = "rgba(85, 214, 200, 0.16)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // The response reflection: the app's one use of its second signal colour.
      ctx.beginPath();
      pts.forEach(([x, db], i) => (i ? ctx.lineTo(x, G.y(-db)) : ctx.moveTo(x, G.y(-db))));
      ctx.strokeStyle = "rgba(196, 63, 131, 0.32)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      const zero = G.y(0);
      const fill = ctx.createLinearGradient(0, G.y(GMAX), 0, G.y(-GMAX));
      fill.addColorStop(0, "rgba(85, 214, 200, 0.28)");
      fill.addColorStop(0.5, "rgba(85, 214, 200, 0.04)");
      fill.addColorStop(1, "rgba(85, 214, 200, 0.28)");
      ctx.beginPath();
      ctx.moveTo(pts[0][0], zero);
      pts.forEach(([x, db]) => ctx.lineTo(x, G.y(db)));
      ctx.lineTo(pts[pts.length - 1][0], zero);
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();

      ctx.beginPath();
      pts.forEach(([x, db], i) => (i ? ctx.lineTo(x, G.y(db)) : ctx.moveTo(x, G.y(db))));
      ctx.strokeStyle = "#55d6c8";
      ctx.lineWidth = 2.25;
      ctx.shadowColor = "rgba(85, 214, 200, 0.6)";
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.shadowBlur = 0;

      handles.forEach((el, i) => {
        const b = bands[i];
        el.style.left = `${G.x(b.f)}px`;
        el.style.top = `${G.y(b.g)}px`;
        el.setAttribute("aria-label", `Filter ${i + 1}: ${fmtF(b.f)}, ${fmtG(b.g)}`);
      });
      readout.forEach((li, i) => {
        const b = bands[i];
        li.innerHTML = `F${i + 1} · Q ${b.q.toFixed(1)}<span>${fmtF(b.f)}</span><span>${fmtG(b.g)}</span>`;
      });
    }

    const clampF = (f) => Math.min(18000, Math.max(25, f));
    const clampG = (g) => Math.min(GMAX, Math.max(-GMAX, Math.round(g * 10) / 10));

    handles.forEach((el, i) => {
      el.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        el.setPointerCapture(e.pointerId);
        el.classList.add("is-active");
        el.focus({ preventScroll: true });
      });
      el.addEventListener("pointermove", (e) => {
        if (!el.hasPointerCapture(e.pointerId)) return;
        const rect = canvas.getBoundingClientRect();
        const G = geometry();
        bands[i].f = clampF(G.f(e.clientX - rect.left));
        bands[i].g = clampG(G.g(e.clientY - rect.top));
        render();
      });
      const end = (e) => {
        if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
        el.classList.remove("is-active");
      };
      el.addEventListener("pointerup", end);
      el.addEventListener("pointercancel", end);
      el.addEventListener("keydown", (e) => {
        const b = bands[i];
        const big = e.shiftKey;
        switch (e.key) {
          case "ArrowLeft": b.f = clampF(b.f / Math.pow(2, big ? 1 : 1 / 6)); break;
          case "ArrowRight": b.f = clampF(b.f * Math.pow(2, big ? 1 : 1 / 6)); break;
          case "ArrowUp": b.g = clampG(b.g + (big ? 3 : 0.5)); break;
          case "ArrowDown": b.g = clampG(b.g - (big ? 3 : 0.5)); break;
          case "PageUp": b.q = Math.min(8, b.q * 1.25); break;
          case "PageDown": b.q = Math.max(0.3, b.q / 1.25); break;
          default: return;
        }
        e.preventDefault();
        render();
      });
    });

    resetButton?.addEventListener("click", () => {
      bands = defaults.map((b) => ({ ...b }));
      render();
    });

    fontsReady.then(render);
    if ("ResizeObserver" in window) new ResizeObserver(render).observe(canvas);
    else window.addEventListener("resize", render);
  }
})();
