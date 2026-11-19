// The console, laid out at 1600 x 900: header, diameter panel with the real cross-section, grip panel, the intrauterine
// view (schematic), fluid panel, indications, view and display buttons, the caption bar, the footer credit and labels
// with leaders into the 3D model. update(s) redraws every live part from the frame's state.
import {BAG, frMm, L_TIP, pose, pressureMmHg, rOut, TRAVEL} from './model.js';
import {TOGGLE_LABEL, TOGGLES, VIEW_LABEL, VIEWS} from './script.js';

export const C = {ink: '#1d2a30', mute: '#7b8b93', faint: '#cfd9de', line: '#e0e8ec', panel: 'rgba(252,254,254,.94)', ac: '#19a7b0', hot: '#ef6a4c', blue: '#0aa7c9'};
export const FOOTER = {name: 'Dra. Karina Castillo', role: 'Ginecóloga'};
const CSS = `
#app{font-family:Inter,system-ui,sans-serif;color:${C.ink};-webkit-font-smoothing:antialiased;font-variant-numeric:tabular-nums}
.ui{position:absolute;inset:0;pointer-events:none}
.mo{font-family:'JetBrains Mono',ui-monospace,monospace}
.cp{position:absolute;background:${C.panel};border:1px solid ${C.line};border-radius:8px;box-shadow:0 2px 12px rgba(40,70,80,.08)}
.ph{position:absolute;display:flex;align-items:center;gap:9px;font:700 11px 'JetBrains Mono',monospace;letter-spacing:1.8px}
.ph i{display:block;width:3px;height:14px;background:${C.ac}}
.pn{position:absolute;font:500 10px 'JetBrains Mono',monospace;color:${C.mute};letter-spacing:1px}
.sm{font:500 10px 'JetBrains Mono',monospace;letter-spacing:1.5px;color:${C.mute};text-transform:uppercase;white-space:nowrap}
.bt{position:absolute;height:26px;padding:0 11px;display:flex;align-items:center;justify-content:center;border:1px solid ${C.faint};border-radius:5px;background:#fff;font:700 10.5px 'JetBrains Mono',monospace;letter-spacing:1.2px;color:${C.ink};white-space:nowrap}
.bt.on{background:${C.ink};color:#fff;border-color:${C.ink}}
.bt.hot.on{background:${C.hot};border-color:${C.hot}}
.call{position:absolute;white-space:nowrap}
.call b{display:block;font:700 10.5px 'JetBrains Mono',monospace;letter-spacing:1.2px;color:${C.ink}}
.call span{display:block;font:500 9px 'JetBrains Mono',monospace;letter-spacing:1px;color:${C.mute};margin-top:2px}
.cur{position:absolute;left:0;top:0;z-index:50;filter:drop-shadow(0 1px 2px rgba(0,0,0,.3))}
.ring{position:absolute;width:34px;height:34px;margin:-17px 0 0 -17px;border-radius:50%;border:1.5px solid ${C.ac};opacity:0;z-index:49}
`;
const el = (h) => {
  const d = document.createElement('div');
  d.innerHTML = h.trim();
  return d.firstElementChild;
};
const f1 = (x, n = 1) => x.toFixed(n).replace('.', ',');

// where each label sits: anchor in the model (cm), text, view list, offset of the text from the anchor
const LABELS = [
  {id: 'ocular', t: 'OCULAR', s: 'ÓPTICA / TELESCOPIO', at: [-9.0, 0.9, 0], views: ['hero', 'handle'], off: [-10, -92]},
  {id: 'port', t: 'CONECTOR BIPOLAR', s: 'ENERGÍA AL ASA', at: [-5.6, 4.3, 0], views: ['handle'], off: [-30, -60]},
  {id: 'lever', t: 'MANDO', s: 'APRIETA: EL ASA SE RETRAE', at: [-3.3, -8.5, 1.45], views: ['hero', 'handle'], off: [50, 44]},
  {id: 'in', t: 'LLAVE DE ENTRADA', s: 'LÍQUIDO HACIA LA CAVIDAD', at: [-0.9, 3.9, 0], views: ['hero', 'handle'], off: [20, -64]},
  {id: 'out', t: 'LLAVE DE SALIDA', s: 'RETORNO DEL LÍQUIDO', at: [-0.3, -3.9, 0], views: ['hero', 'handle'], off: [60, 30]},
  {id: 'sheath', t: 'CAMISA EXTERNA', s: '', at: [12.6, 0.25, 0], views: ['tip'], off: [20, -90], dyn: true},
  {id: 'holes', t: 'ORIFICIOS DE SALIDA', s: 'EL LÍQUIDO VUELVE POR AQUÍ', at: [16.6, 0.3, 0], views: ['hero', 'tip'], off: [-30, -90]},
  {id: 'loop', t: 'ASA BIPOLAR', s: 'CORTA Y COAGULA', at: [19.0, 0.14, 0], views: ['hero', 'tip'], off: [40, 90]},
];

export function createConsole(app) {
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);
  const ui = el(`<div class="ui"></div>`);
  app.appendChild(ui);
  const add = (h) => {
    const n = el(h);
    ui.appendChild(n);
    return n;
  };
  const panel = (x, y, w, h, title, n) => {
    add(`<div class="cp" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px"></div>`);
    add(`<div class="ph" style="left:${x + 14}px;top:${y + 13}px"><i></i>${title}</div>`);
    add(`<div class="pn" style="right:${1600 - x - w + 14}px;top:${y + 15}px">${n}</div>`);
  };
  const btn = {};

  // ------------------------------------------------------------ header
  add(`<div style="position:absolute;left:0;top:0;width:150px;height:92px;background:${C.ac}"></div>`);
  add(`<svg style="position:absolute;left:34px;top:26px" width="84" height="40" viewBox="0 0 84 40"><g fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"><path d="M4 20h54"/><circle cx="66" cy="20" r="9"/><path d="M58 20l-5-6M58 20l-5 6"/></g></svg>`);
  add(`<div class="sm" style="position:absolute;left:176px;top:20px;letter-spacing:2.4px">HISTEROSCOPÍA AMBULATORIA</div>`);
  add(`<div style="position:absolute;left:175px;top:36px;font-size:34px;font-weight:700;letter-spacing:-.6px;line-height:1">UteriS® XS <span style="color:${C.ac};font-weight:400">/</span> Sistema bipolar</div>`);
  add(`<div class="mo" style="position:absolute;left:176px;top:80px;font-size:11.5px;letter-spacing:2.1px;color:#566871">EL HISTEROSCOPIO BIPOLAR MÁS PEQUEÑO DEL MUNDO · 13 Fr / 17 Fr</div>`);
  add(`<div class="sm" style="position:absolute;right:30px;top:30px;text-align:right;letter-spacing:2.2px;line-height:16px">FABRICADO EN TUTTLINGEN<br>ALEMANIA</div>`);

  // ------------------------------------------------------------ 01 diameter
  panel(28, 118, 282, 300, 'DIÁMETRO', '01');
  const bigMm = add(`<div style="position:absolute;left:42px;top:150px;font-size:46px;font-weight:700;color:${C.ac};line-height:1;letter-spacing:-1px"></div>`);
  add(`<div class="mo" style="position:absolute;left:176px;top:168px;font-size:13px;font-weight:700;color:${C.mute}">mm</div>`);
  const frLabel = add(`<div class="sm" style="position:absolute;left:42px;top:204px"></div>`);
  btn.fr13 = add(`<div class="bt" style="left:188px;top:200px;width:50px">13 Fr</div>`);
  btn.fr17 = add(`<div class="bt" style="left:244px;top:200px;width:50px">17 Fr</div>`);
  add(`<div style="position:absolute;left:42px;top:238px;width:254px;height:1px;background:${C.line}"></div>`);
  const xs = add(`<svg style="position:absolute;left:42px;top:246px" width="254" height="158"></svg>`);
  add(`<div class="sm" style="position:absolute;left:42px;top:392px;font-size:8.5px;letter-spacing:1.1px">SECCIÓN ESQUEMÁTICA · DIÁMETRO REAL</div>`);

  // ------------------------------------------------------------ 02 grip
  panel(28, 432, 282, 168, 'MANDO', '02');
  const gripBar = add(`<div style="position:absolute;left:42px;top:496px;height:6px;background:${C.ac};border-radius:3px"></div>`);
  add(`<div style="position:absolute;left:42px;top:496px;width:254px;height:6px;background:#e4ecef;border-radius:3px;z-index:-1"></div>`);
  const gripKnob = add(`<div style="position:absolute;top:490px;width:14px;height:18px;margin-left:-7px;background:#fff;border:2px solid ${C.ink};border-radius:4px"></div>`);
  add(`<div class="sm" style="position:absolute;left:42px;top:468px">APRETAR EL MANDO</div>`);
  const gripV = add(`<div class="mo" style="position:absolute;right:${1600 - 296}px;top:465px;font-size:12px;font-weight:700"></div>`);
  add(`<div class="sm" style="position:absolute;left:42px;top:522px">RECORRIDO DEL ASA</div>`);
  const loopV = add(`<div class="mo" style="position:absolute;right:${1600 - 296}px;top:519px;font-size:12px;font-weight:700"></div>`);
  add(`<div class="sm" style="position:absolute;left:42px;top:546px">ENERGÍA BIPOLAR</div>`);
  const enV = add(`<div class="mo" style="position:absolute;right:${1600 - 296}px;top:543px;font-size:12px;font-weight:700"></div>`);
  add(`<div class="sm" style="position:absolute;left:42px;top:572px;font-size:8.5px;letter-spacing:1.1px;line-height:12px">RECORRIDO Y MECANISMO: ESQUEMA<br>A PARTIR DE LA FOTO DEL PRODUCTO</div>`);

  // ------------------------------------------------------------ 03 intrauterine view
  panel(1290, 118, 282, 262, 'VISIÓN INTRAUTERINA', '03');
  const cav = el(`<canvas width="440" height="440" style="position:absolute;left:1360px;top:150px;width:150px;height:150px;border-radius:50%;box-shadow:0 0 0 3px #fff,0 0 0 4px ${C.faint}"></canvas>`);
  ui.appendChild(cav);
  const cctx = cav.getContext('2d');
  add(`<div class="sm" style="position:absolute;left:1304px;top:318px">PÓLIPO RESECADO</div>`);
  const resV = add(`<div class="mo" style="position:absolute;right:${1600 - 1558}px;top:315px;font-size:12px;font-weight:700"></div>`);
  btn.reset = add(`<div class="bt" style="left:1304px;top:340px;width:254px;height:24px;font-size:9.5px">REINICIAR PÓLIPO</div>`);

  // ------------------------------------------------------------ 04 fluid
  panel(1290, 394, 282, 168, 'FLUIDO', '04');
  const pV = add(`<div style="position:absolute;left:1304px;top:424px;font-size:36px;font-weight:700;color:${C.blue};line-height:1;letter-spacing:-.8px"></div>`);
  add(`<div class="mo" style="position:absolute;left:1420px;top:440px;font-size:12px;font-weight:700;color:${C.mute}">mmHg</div>`);
  add(`<div class="sm" style="position:absolute;left:1304px;top:482px">ALTURA DE LA BOLSA</div>`);
  const bagV = add(`<div class="mo" style="position:absolute;right:${1600 - 1558}px;top:479px;font-size:12px;font-weight:700"></div>`);
  add(`<div style="position:absolute;left:1304px;top:512px;width:254px;height:6px;background:#e4ecef;border-radius:3px"></div>`);
  const bagBar = add(`<div style="position:absolute;left:1304px;top:512px;height:6px;background:${C.blue};border-radius:3px"></div>`);
  const bagKnob = add(`<div style="position:absolute;top:506px;width:14px;height:18px;margin-left:-7px;background:#fff;border:2px solid ${C.ink};border-radius:4px"></div>`);
  add(`<div class="sm" style="position:absolute;left:1304px;top:534px;font-size:8.5px;letter-spacing:1.1px">P = ρ·g·h · COLUMNA DE SUERO</div>`);

  // ------------------------------------------------------------ 05 indications
  panel(1290, 576, 282, 184, 'PARA QUÉ SIRVE', '05');
  ['Pólipos y miomas submucosos pequeños', 'Adherencias intrauterinas', 'Infertilidad y sangrado anormal', 'Biopsias dirigidas, visión directa'].forEach((t, i) => {
    add(`<div style="position:absolute;left:1304px;top:${608 + i * 36}px;width:6px;height:6px;margin-top:5px;background:${C.ac}"></div>`);
    add(`<div style="position:absolute;left:1322px;top:${604 + i * 36}px;width:236px;font-size:12.5px;line-height:1.3;color:#35474f">${t}</div>`);
  });

  // ------------------------------------------------------------ controls
  const row = (keys, labels, x0, y, cls = '') => {
    let x = x0;
    for (const k of keys) {
      const w = Math.round(labels[k].length * 7.6 + 24);
      btn[k] = add(`<div class="bt ${cls}" style="left:${x}px;top:${y}px;width:${w}px">${labels[k]}</div>`);
      x += w + 6;
    }
    return x;
  };
  const y0 = 802;
  add(`<div class="sm" style="position:absolute;left:330px;top:786px;font-size:8.5px">VISTA</div>`);
  const x1 = row(VIEWS, VIEW_LABEL, 330, y0);
  add(`<div class="sm" style="position:absolute;left:${x1 + 12}px;top:786px;font-size:8.5px">PANTALLA</div>`);
  row(TOGGLES, TOGGLE_LABEL, x1 + 12, y0);
  btn.energy.classList.add('hot');

  // ------------------------------------------------------------ caption and footer
  const cap = add(`<div style="position:absolute;left:330px;width:940px;top:748px;box-sizing:border-box;text-align:center;font-size:15px;font-weight:600;color:${C.ink};letter-spacing:-.1px;padding:5px 16px;border-radius:6px;background:rgba(246,250,251,.82)"></div>`);
  add(`<div style="position:absolute;left:0;right:0;top:852px;height:48px;background:${C.ink}"></div>`);
  add(`<div style="position:absolute;left:0;right:0;top:852px;height:3px;background:${C.ac}"></div>`);
  add(`<div style="position:absolute;left:0;right:0;top:864px;text-align:center;color:#fff;font-size:18px;font-weight:700;letter-spacing:.4px">${FOOTER.name} <span style="color:${C.ac};font-weight:400;margin:0 8px">·</span><span style="font-weight:500;color:#cfe9ec">${FOOTER.role}</span></div>`);

  // ------------------------------------------------------------ labels
  const calls = LABELS.map((L) => {
    const n = add(`<div class="call" style="opacity:0"><b>${L.t}</b><span>${L.s}</span></div>`);
    return {L, n, dot: add(`<div style="position:absolute;width:7px;height:7px;margin:-3.5px 0 0 -3.5px;background:${C.ac};border:1.5px solid #fff;border-radius:50%;opacity:0"></div>`)};
  });
  const lines = add(`<svg style="position:absolute;left:0;top:0" width="1600" height="900"></svg>`);

  // ------------------------------------------------------------ cursor
  const cursor = add(`<svg class="cur" width="22" height="26" viewBox="0 0 22 26"><path d="M3 2v19l5-4.6 3.4 7.4 3.6-1.6-3.4-7.2 6.8-.4z" fill="#fff" stroke="#111" stroke-width="1.6" stroke-linejoin="round"/></svg>`);
  const rg = add(`<div class="ring"></div>`);
  const centre = (n) => [n.offsetLeft + n.offsetWidth / 2, n.offsetTop + n.offsetHeight / 2];
  const spots = {};
  const measure = () => {
    for (const [k, n] of Object.entries(btn)) spots[k] = centre(n);
  };
  requestAnimationFrame(measure);
  document.fonts?.ready?.then(measure);

  const GRIP = {x: 42, w: 254, y: 499};
  const BAGS = {x: 1304, w: 254, y: 515};

  // ------------------------------------------------------------ the cross-section, in true proportion: 22 px / mm
  const PX = 22;
  const drawSection = (fr) => {
    const r = (frMm(fr) / 2) * PX;
    const cx = 127;
    const cy = 78;
    const tr = 0.4 * r;
    const ty = cy + 0.2 * r;
    const ey = cy - 0.62 * r;
    const ghost = (f, op) => `<circle cx="${cx}" cy="${cy}" r="${(frMm(f) / 2) * PX}" fill="none" stroke="${C.mute}" stroke-width="1" stroke-dasharray="3 3" opacity="${op}"/>`;
    xs.innerHTML = `${ghost(13, 0.7)}${ghost(17, 0.7)}
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="#dfeef2" stroke="#8d989f" stroke-width="3"/>
      <circle cx="${cx}" cy="${ty}" r="${tr}" fill="#4a5b66" stroke="#2c3a43" stroke-width="1.2"/>
      <circle cx="${cx - tr * 0.25}" cy="${ty - tr * 0.25}" r="${tr * 0.28}" fill="#7bb7d6" opacity=".8"/>
      <circle cx="${cx}" cy="${ey}" r="${Math.max(2, r * 0.06)}" fill="#2f9e62"/>
      <text x="${cx + r + 8}" y="${cy - r * 0.5}" font-family="JetBrains Mono" font-size="8.5" fill="${C.mute}">ASA</text>
      <text x="${cx + r + 8}" y="${ty + 3}" font-family="JetBrains Mono" font-size="8.5" fill="${C.mute}">ÓPTICA</text>
      <text x="${cx - r - 8}" y="${cy + r * 0.62}" text-anchor="end" font-family="JetBrains Mono" font-size="8.5" fill="${C.blue}">LÍQUIDO</text>`;
  };
  let lastFr = -1;

  // ------------------------------------------------------------ the intrauterine view (schematic)
  const drawCavity = (s, t) => {
    const W = 440;
    const c = W / 2;
    cctx.save();
    cctx.clearRect(0, 0, W, W);
    cctx.beginPath();
    cctx.arc(c, c, c, 0, Math.PI * 2);
    cctx.clip();
    let g = cctx.createRadialGradient(c, c, 20, c, c, c);
    g.addColorStop(0, '#f6c6b8');
    g.addColorStop(0.7, '#e08c80');
    g.addColorStop(1, '#a8453f');
    cctx.fillStyle = g;
    cctx.fillRect(0, 0, W, W);
    cctx.strokeStyle = 'rgba(150,30,30,.35)';
    cctx.lineWidth = 3;
    for (let i = 0; i < 7; i++) {
      const a = i * 0.9 + 0.3;
      cctx.beginPath();
      cctx.moveTo(c + Math.cos(a) * 380, c + Math.sin(a) * 380);
      cctx.bezierCurveTo(c + Math.cos(a) * 280, c + Math.sin(a + 0.4) * 280, c + Math.cos(a + 0.3) * 200, c + Math.sin(a) * 200, c + Math.cos(a - 0.2) * 150, c + Math.sin(a) * 150);
      cctx.stroke();
    }
    // the polyp shrinks as it is resected
    const k = 1 - 0.92 * s.resect;
    if (k > 0.05) {
      cctx.save();
      cctx.translate(c - 58, c + 18);
      g = cctx.createRadialGradient(-12, -14, 4, 0, 0, 110 * k);
      g.addColorStop(0, '#fde3da');
      g.addColorStop(1, '#e9a89a');
      cctx.fillStyle = g;
      cctx.beginPath();
      cctx.ellipse(0, 0, 104 * k, 82 * k, -0.3, 0, Math.PI * 2);
      cctx.fill();
      cctx.restore();
    }
    // the loop comes from the right edge; ext 1 = fully forward, 0 = fully drawn back
    const ext = 1 - s.g;
    const lx = c + 150 - 220 * ext * 0.95 + 90 * (1 - ext) * 0;
    const ly = c + 18;
    cctx.strokeStyle = '#2f9e62';
    cctx.lineWidth = 9;
    cctx.beginPath();
    cctx.moveTo(W + 10, ly);
    cctx.lineTo(lx + 36, ly);
    cctx.stroke();
    cctx.strokeStyle = '#e9edf0';
    cctx.lineWidth = 7;
    cctx.beginPath();
    cctx.arc(lx + 36, ly, 36, Math.PI / 2, -Math.PI / 2, false);
    cctx.stroke();
    if (s.energy > 0.05) {
      g = cctx.createRadialGradient(lx, ly, 4, lx, ly, 90);
      g.addColorStop(0, `rgba(255,245,200,${0.9 * s.energy})`);
      g.addColorStop(0.4, `rgba(255,150,60,${0.5 * s.energy})`);
      g.addColorStop(1, 'rgba(255,120,40,0)');
      cctx.fillStyle = g;
      cctx.fillRect(0, 0, W, W);
      cctx.fillStyle = 'rgba(255,255,255,.75)';
      for (let i = 0; i < 12; i++) {
        const u = (t * 1.6 + i * 0.17) % 1;
        cctx.beginPath();
        cctx.arc(lx + Math.sin(i * 7.3) * 50, ly - u * 90 + Math.cos(i * 3.1) * 20, 4 + (i % 3) * 2, 0, Math.PI * 2);
        cctx.fill();
      }
    }
    cctx.restore();
    cctx.strokeStyle = 'rgba(0,0,0,.45)';
    cctx.lineWidth = 14;
    cctx.beginPath();
    cctx.arc(c, c, c - 7, 0, Math.PI * 2);
    cctx.stroke();
  };

  const view = {last: ''};
  const update = (s, t) => {
    if (Math.abs(s.fr - lastFr) > 0.004) {
      lastFr = s.fr;
      drawSection(s.fr);
    }
    const mm = frMm(s.fr);
    bigMm.textContent = f1(mm, 2);
    frLabel.textContent = `${Math.round(s.fr)} Fr`;
    frLabel.textContent = `${f1(s.fr, 0)} Fr · Ø EXTERIOR`;
    btn.fr13.classList.toggle('on', s.fr < 14);
    btn.fr17.classList.toggle('on', s.fr > 16);
    gripBar.style.width = `${s.g * GRIP.w}px`;
    gripKnob.style.left = `${GRIP.x + s.g * GRIP.w}px`;
    gripV.textContent = `${Math.round(s.g * 100)} %`;
    loopV.textContent = `${f1((1 - s.g) * TRAVEL * 10)} / ${f1(TRAVEL * 10)} mm`;
    enV.textContent = s.armed ? (s.energy > 0.05 ? 'ACTIVA · CORTE' : 'ARMADA') : 'APAGADA';
    enV.style.color = s.energy > 0.05 ? C.hot : s.armed ? C.ac : C.mute;
    resV.textContent = `${Math.round(s.resect * 100)} %`;
    const p = pressureMmHg(s.bag);
    pV.textContent = Math.round(p);
    bagV.textContent = `${f1(s.bag, 2)} m`;
    const bk = (s.bag - BAG[0]) / (BAG[1] - BAG[0]);
    bagBar.style.width = `${bk * BAGS.w}px`;
    bagKnob.style.left = `${BAGS.x + bk * BAGS.w}px`;
    cap.textContent = s.caption;
    cap.style.opacity = s.captionT0 === undefined ? 1 : Math.min(1, (t - s.captionT0) / 0.4 + 0.0);
    for (const v of VIEWS) btn[v].classList.toggle('on', s.view === v);
    for (const k of TOGGLES) btn[k].classList.toggle('on', k === 'energy' ? !!s.armed : k === 'section' ? !!s.section : s[k] > 0.5);
    drawCavity(s, t);
    // labels
    let seg = '';
    for (const {L, n, dot} of calls) {
      const show = s.labels > 0.01 && L.views.includes(s.view);
      const a = L.at;
      const pt = show ? s.project(a[0], a[1], a[2]) : null;
      if (!pt) {
        n.style.opacity = 0;
        dot.style.opacity = 0;
        continue;
      }
      const tw = n.offsetWidth;
      const tx = L.off[0] < 0 ? pt[0] + L.off[0] - tw : pt[0] + L.off[0];
      const ty = pt[1] + L.off[1];
      n.firstChild.textContent = L.dyn ? `CAMISA EXTERNA · ${Math.round(s.fr)} Fr` : L.t;
      if (L.dyn) n.lastChild.textContent = `Ø ${f1(frMm(s.fr), 2)} mm`;
      n.style.left = `${tx}px`;
      n.style.top = `${ty - 12}px`;
      n.style.opacity = s.labels;
      dot.style.left = `${pt[0]}px`;
      dot.style.top = `${pt[1]}px`;
      dot.style.opacity = s.labels;
      seg += `<path d="M${pt[0]} ${pt[1]} L${L.off[0] < 0 ? tx + tw : tx} ${ty + 4}" stroke="${C.ac}" stroke-width="1" opacity="${0.7 * s.labels}" fill="none"/>`;
    }
    lines.innerHTML = seg;
    // pointer
    const c = s.cursor;
    if (c) {
      cursor.style.transform = `translate(${c.x - 3}px, ${c.y - 2}px) scale(${c.press ? 0.86 : 1})`;
      rg.style.left = `${c.ringX ?? 0}px`;
      rg.style.top = `${c.ringY ?? 0}px`;
      rg.style.opacity = c.ring ?? 0;
      rg.style.transform = `scale(${0.5 + 0.9 * (1 - (c.ring ?? 0))})`;
    }
    void view;
  };
  return {root: ui, btn, spots, update, GRIP, BAGS, cursor, L_TIP, pose, rOut, measure};
}
