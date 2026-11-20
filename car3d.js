// Авто ПУ — 3D-модель авто, що обертається, і збирання GIF прямо на пристрої.
// Моделі — узагальнені (бус / мінівен / седан), не копії конкретних брендів; колір і номер — з довідника.
(function () {
  'use strict';

  // Профіль кузова збоку (x — довжина, y — висота), ширина задається окремо.
  const PROFILES = {
    van: { w: 1.0, body: [[-2.45, 0.35], [-2.45, 2.15], [1.35, 2.15], [2.05, 1.25], [2.45, 1.05], [2.45, 0.35]],
      windows: [[[-2.2, 1.35], [-2.2, 1.95], [-1.05, 1.95], [-1.05, 1.35]], [[-0.9, 1.35], [-0.9, 1.95], [0.25, 1.95], [0.25, 1.35]], [[0.4, 1.35], [0.4, 1.95], [1.3, 1.95], [1.85, 1.35]]],
      wheels: [-1.6, 1.65], r: 0.42, glassFront: [[1.42, 2.05], [2.0, 1.3]] },
    mpv: { w: 0.95, body: [[-2.25, 0.35], [-2.3, 1.15], [-2.1, 1.8], [0.75, 1.85], [1.75, 1.15], [2.3, 1.0], [2.3, 0.35]],
      windows: [[[-2.0, 1.2], [-1.9, 1.68], [-0.75, 1.72], [-0.75, 1.2]], [[-0.6, 1.2], [-0.6, 1.72], [0.7, 1.72], [1.45, 1.2]]],
      wheels: [-1.5, 1.5], r: 0.4, glassFront: [[0.85, 1.78], [1.65, 1.2]] },
    sedan: { w: 0.92, body: [[-2.45, 0.38], [-2.5, 0.95], [-2.2, 1.05], [-1.35, 1.12], [-0.7, 1.62], [0.65, 1.64], [1.35, 1.1], [2.35, 0.95], [2.45, 0.7], [2.45, 0.38]],
      windows: [[[-1.2, 1.12], [-0.68, 1.52], [-0.05, 1.53], [-0.05, 1.12]], [[0.1, 1.12], [0.1, 1.53], [0.6, 1.53], [1.12, 1.12]]],
      wheels: [-1.5, 1.55], r: 0.38, glassFront: [[0.72, 1.6], [1.3, 1.13]] }
  };

  function shade(hex, k) {
    const n = parseInt(hex.slice(1), 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    const f = v => Math.max(0, Math.min(255, Math.round(v * k)));
    return 'rgb(' + f(r) + ',' + f(g) + ',' + f(b) + ')';
  }

  // Будуємо список полігонів: {pts:[[x,y,z]...], color, kind}
  function buildMesh(kind, color) {
    const P = PROFILES[kind] || PROFILES.van, W = P.w, polys = [];
    const prof = P.body;
    // боки
    [W, -W].forEach(z => polys.push({ pts: prof.map(([x, y]) => [x, y, z]), color, side: true }));
    // обшивка по периметру
    for (let i = 0; i < prof.length; i++) {
      const a = prof[i], b = prof[(i + 1) % prof.length];
      polys.push({ pts: [[a[0], a[1], W], [b[0], b[1], W], [b[0], b[1], -W], [a[0], a[1], -W]], color });
    }
    // вікна на боках
    P.windows.forEach(win => [W + 0.012, -W - 0.012].forEach(z => polys.push({ pts: win.map(([x, y]) => [x, y, z]), color: '#1e293b', glass: true })));
    // лобове скло
    const [g1, g2] = P.glassFront;
    polys.push({ pts: [[g1[0], g1[1], W * 0.86], [g2[0], g2[1], W * 0.86], [g2[0], g2[1], -W * 0.86], [g1[0], g1[1], -W * 0.86]].map(p => [p[0] + 0.01, p[1] + 0.01, p[2]]), color: '#1e293b', glass: true });
    // фари / ліхтарі
    const fx = Math.max(...prof.map(p => p[0])), bx = Math.min(...prof.map(p => p[0]));
    [W * 0.62, -W * 0.62].forEach(z => {
      polys.push({ pts: [[fx + 0.012, 0.75, z - 0.18], [fx + 0.012, 0.75, z + 0.18], [fx + 0.012, 0.92, z + 0.18], [fx + 0.012, 0.92, z - 0.18]], color: '#fde68a', lamp: true });
      polys.push({ pts: [[bx - 0.012, 0.66, z + 0.15], [bx - 0.012, 0.66, z - 0.15], [bx - 0.012, 0.84, z - 0.15], [bx - 0.012, 0.84, z + 0.15]], color: '#dc2626', lamp: true });
    });
    // колеса (12-кутні циліндри)
    const N = 12, r = P.r;
    P.wheels.forEach(cx => [W, -W].forEach(zs => {
      const z0 = zs > 0 ? W - 0.05 : -W + 0.05, z1 = zs > 0 ? W + 0.08 : -W - 0.08;
      const ring = z => Array.from({ length: N }, (_, i) => [cx + r * Math.cos(i * 2 * Math.PI / N), r + Math.sin(i * 2 * Math.PI / N) * r, z]);
      const A = ring(z0), B = ring(z1);
      polys.push({ pts: B, color: '#111827', tire: true });
      polys.push({ pts: B.map(p => [cx + (p[0] - cx) * 0.5, r + (p[1] - r) * 0.5, z1 + (zs > 0 ? 0.004 : -0.004)]), color: '#9ca3af', rim: true });
      for (let i = 0; i < N; i++) polys.push({ pts: [A[i], A[(i + 1) % N], B[(i + 1) % N], B[i]], color: '#0b1220', tire: true });
    }));
    return polys;
  }

  // Малюємо один кадр: кут повороту yaw (радіани)
  function drawFrame(g, mesh, yaw, cx, cy, scale) {
    const pitch = 0.36, cp = Math.cos(pitch), sp = Math.sin(pitch), cyw = Math.cos(yaw), syw = Math.sin(yaw);
    const L = norm([0.45, 0.8, 0.6]);
    const tf = ([x, y, z]) => {
      y -= 1.0;
      let X = x * cyw - z * syw, Z = x * syw + z * cyw, Y = y;
      const Y2 = Y * cp - Z * sp, Z2 = Y * sp + Z * cp;
      const d = 9 / (9 - Z2);
      return [cx + X * scale * d, cy - Y2 * scale * d, Z2];
    };
    // тінь
    g.save(); g.fillStyle = 'rgba(15,23,42,.18)'; g.beginPath(); g.ellipse(cx, cy + scale * 1.02, scale * 2.7, scale * 0.55, 0, 0, 7); g.fill(); g.restore();
    const items = mesh.map(p => {
      const sp2 = p.pts.map(tf);
      // нормаль у світових координатах після повороту
      const w = p.pts.map(([x, y, z]) => [x * cyw - z * syw, y, x * syw + z * cyw]);
      const n = norm(cross(sub(w[1], w[0]), sub(w[2], w[0])));
      const depth = sp2.reduce((s, q) => s + q[2], 0) / sp2.length;
      return { p, sp2, n, depth };
    });
    items.sort((a, b) => a.depth - b.depth);
    items.forEach(({ p, sp2, n }) => {
      const lam = Math.abs(dot(n, L));
      let col;
      if (p.glass) col = shade('#1e293b', 0.8 + 0.6 * lam);
      else if (p.lamp || p.rim) col = p.color;
      else if (p.tire) col = shade('#1f2937', 0.6 + 0.5 * lam);
      else col = shade(p.color, 0.55 + 0.55 * lam);
      g.fillStyle = col; g.strokeStyle = col; g.lineWidth = 1;
      g.beginPath(); sp2.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill(); g.stroke();
    });
  }
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const norm = a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

  function loadGifWriter() {
    if (window.GifWriter) return Promise.resolve(window.GifWriter);
    return new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = 'https://unpkg.com/omggif@1.0.10/omggif.js';
      s.onload = () => (window.GifWriter ? res(window.GifWriter) : rej(new Error('Не вдалося завантажити GIF-кодер')));
      s.onerror = () => rej(new Error('Немає з’єднання для GIF-кодера'));
      document.head.append(s);
    });
  }

  /**
   * opts: { kind, color (hex), title, subtitle, plate, lines: [[label, value], ...], top: {big, small} }
   * Повертає Blob (image/gif).
   */
  async function carGif(opts) {
    const GifWriter = await loadGifWriter();
    const W = 480, H = 600, FR = 30;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const g = cv.getContext('2d', { willReadFrequently: true });
    const F = '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif';
    const mesh = buildMesh(opts.kind, opts.color);
    const frames = [];
    for (let i = 0; i < FR; i++) {
      g.fillStyle = '#f1f5f9'; g.fillRect(0, 0, W, H);
      // шапка
      g.fillStyle = '#0b3a75'; g.fillRect(0, 0, W, 86); g.fillStyle = '#ffd500'; g.fillRect(0, 86, W, 6);
      g.fillStyle = '#fff'; g.font = '800 34px ' + F; g.fillText(opts.top?.big || opts.title || '', 22, 52);
      if (opts.top?.small) { g.font = '600 17px ' + F; g.fillText(opts.top.small, 22, 76); }
      drawFrame(g, mesh, -Math.PI / 2 + (i / FR) * Math.PI * 2, W / 2, 245, 62);
      // підпис
      let y = 352;
      g.fillStyle = '#0f172a'; g.font = '800 28px ' + F; g.fillText(opts.title || '', 22, y); y += 28;
      if (opts.subtitle) { g.fillStyle = '#64748b'; g.font = '500 19px ' + F; g.fillText(opts.subtitle, 22, y); y += 14; }
      if (opts.plate) {
        y += 10; g.font = '800 30px ' + F; const pw = g.measureText(opts.plate).width + 48;
        g.fillStyle = '#fff'; g.strokeStyle = '#0f172a'; g.lineWidth = 3; g.beginPath(); (g.roundRect ? g.roundRect(22, y, pw, 48, 7) : g.rect(22, y, pw, 48)); g.fill(); g.stroke();
        g.fillStyle = '#1d4ed8'; g.fillRect(24, y + 2, 16, 44); g.fillStyle = '#0f172a'; g.fillText(opts.plate, 50, y + 36); y += 62;
      }
      (opts.lines || []).forEach(([k, v]) => {
        if (!v) return; y += 30;
        g.fillStyle = '#64748b'; g.font = '600 16px ' + F; g.fillText(k, 22, y);
        g.fillStyle = '#0f172a'; g.font = '700 20px ' + F; let t = String(v); while (g.measureText(t).width > W - 150 && t.length > 4) t = t.slice(0, -2); if (t !== String(v)) t += '…'; g.fillText(t, 120, y);
      });
      frames.push(g.getImageData(0, 0, W, H).data.slice());
    }
    // палітра: найчастіші кольори (5 біт на канал) з кількох кадрів
    const hist = new Map();
    [0, 7, 15, 22].forEach(fi => { const d = frames[fi]; for (let p = 0; p < d.length; p += 8) { const k = ((d[p] >> 3) << 10) | ((d[p + 1] >> 3) << 5) | (d[p + 2] >> 3); hist.set(k, (hist.get(k) || 0) + 1); } });
    const top = [...hist.entries()].sort((a, b) => b[1] - a[1]).slice(0, 256).map(([k]) => k);
    while (top.length < 256) top.push(0);
    const pal = top.map(k => (((k >> 10) & 31) << 19) | (((k >> 5) & 31) << 11) | ((k & 31) << 3));
    const pr = pal.map(c => (c >> 16) & 255), pg = pal.map(c => (c >> 8) & 255), pb = pal.map(c => c & 255);
    const lut = new Map(); top.forEach((k, i) => { if (!lut.has(k)) lut.set(k, i); });
    const nearest = k => {
      if (lut.has(k)) return lut.get(k);
      const r = ((k >> 10) & 31) << 3, gg = ((k >> 5) & 31) << 3, b = (k & 31) << 3; let best = 0, bd = 1e9;
      for (let i = 0; i < 256; i++) { const d = (r - pr[i]) ** 2 + (gg - pg[i]) ** 2 + (b - pb[i]) ** 2; if (d < bd) { bd = d; best = i; } }
      lut.set(k, best); return best;
    };
    const buf = new Uint8Array(Math.ceil(W * H * FR * 1.3) + 65536);
    const gw = new GifWriter(buf, W, H, { palette: pal, loop: 0 });
    const idx = new Uint8Array(W * H);
    frames.forEach(d => {
      for (let p = 0, j = 0; p < d.length; p += 4, j++) idx[j] = nearest(((d[p] >> 3) << 10) | ((d[p + 1] >> 3) << 5) | (d[p + 2] >> 3));
      gw.addFrame(0, 0, W, H, idx, { delay: 9 });
    });
    return new Blob([buf.subarray(0, gw.end())], { type: 'image/gif' });
  }

  window.Car3D = { carGif, buildMesh, drawFrame };
})();
