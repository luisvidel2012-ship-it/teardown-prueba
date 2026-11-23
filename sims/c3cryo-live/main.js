// C3 CryoSystem: an interactive 3D page of the console, the Joule–Thomson probe and the freeze in tissue.
// One clock (procedure seconds, model.js) drives the 3D, the console screen, the panels and the chart.
// Left alone it tours itself; any click, drag, wheel or key hands control over, 25 s of quiet hands it back.
import {createScene, SP_POS, SP_S, TS_POS, TS_S} from './scene.js';
import {DESCR, fmtClock, PHASES, PROBES, state, tipCurve, TOTAL} from './model.js';

const W = 1600;
const H = 900;
const IDLE = 25;
const D2R = Math.PI / 180;
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const wrap = (d) => ((((d + 180) % 360) + 360) % 360) - 180;

// camera presets: target, azimuth/elevation (deg), distance
const VIEWS = {
  equipo: {name: 'Equipo', tx: 60, ty: 720, tz: 60, az: 30, el: 12, d: 3000},
  consola: {name: 'Consola', tx: 0, ty: 1060, tz: 60, az: 12, el: 6, d: 1350},
  trasera: {name: 'Trasera', tx: -60, ty: 960, tz: -120, az: 200, el: 14, d: 1700},
  pedal: {name: 'Pedal', tx: -200, ty: 40, tz: 470, az: 18, el: 42, d: 980},
  sonda: {name: 'Sonda (corte)', tx: SP_POS.x - 6.2 * SP_S, ty: SP_POS.y, tz: 0, az: 0, el: 9, d: 640},
  tejido: {name: 'Tejido (rodilla)', tx: TS_POS.x - 4 * TS_S, ty: TS_POS.y - 11 * TS_S, tz: 0, az: 0, el: 4, d: 1300},
};
const VIEW_KEYS = Object.keys(VIEWS);

// the tour: which view at which procedure time
function tourView(s) {
  const id = s.ph.id;
  const u = s.u;
  if (id === 'check') return 'equipo';
  if (id === 'purge') return u < 14 ? 'consola' : u < 22 ? 'trasera' : 'sonda';
  if (id === 'insert' || id === 'motor' || id === 'sensory') return 'tejido';
  if (id === 'freeze') return u < 5 ? 'pedal' : u < 34 ? 'sonda' : u < 100 ? 'tejido' : 'consola';
  if (id === 'thaw') return u < 14 ? 'sonda' : 'tejido';
  return 'equipo';
}

const el = (tag, cls, parent, html) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  if (parent) parent.appendChild(e);
  return e;
};

function run() {
  const app = document.getElementById('app');
  const canvas = el('canvas', null, app);
  canvas.id = 'gl';
  const st = createScene(canvas);
  const ui = el('div', 'ui', app);
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'ld');
  ui.appendChild(svg);

  el('div', 'hd', ui, '<h1>C3 CryoSystem · <b>crioneurolisis</b></h1><p>Consola, sonda Joule–Thomson y bola de hielo sobre la rama infrapatelar del safeno</p>');
  const vtag = el('div', 'vtag', ui);
  const tourChip = el('div', 'tour', ui);

  // ------------------------------------------------ phases panel
  const php = el('div', 'pn ph', ui);
  el('div', 'ttl', php, 'Procedimiento');
  const rows = PHASES.map((p) => {
    const r = el('div', 'row', php, `<i></i>${p.name}<span class="s">${p.sub.split(' · ')[0]}</span>`);
    r.addEventListener('click', () => {
      takeOver();
      tau = p.t0 + 0.01;
      paused = false;
    });
    return r;
  });
  const desc = el('div', 'desc', php);

  // ------------------------------------------------ readouts panel
  const rd = el('div', 'pn rd', ui);
  el('div', 'ttl', rd, 'Lecturas en vivo');
  const big = el('div', 'big', rd);
  const bigSub = el('div', 'kv', rd, '<span></span><b></b>');
  const gauge = (label, max, zones) => {
    const kv = el('div', 'kv', rd, `<span>${label}</span><b></b>`);
    const g = el('div', 'gbar', rd);
    for (const [cls, a, b] of zones) {
      const z = el('div', cls, g);
      z.style.left = `${(a / max) * 100}%`;
      z.style.width = `${((b - a) / max) * 100}%`;
    }
    const f = el('div', 'f', g);
    return (v, txt) => {
      kv.lastChild.textContent = txt;
      f.style.width = `${clamp(v / max, 0, 1) * 100}%`;
    };
  };
  const gCyl = gauge('Cilindro', 75, [['z', 40, 60], ['r', 68, 75]]);
  const gProbe = gauge('Presión en la sonda', 75, [['z', 40, 60]]);
  const gFlow = gauge('Flujo de gas', 20, [['r', 0, 5], ['z', 8, 15]]);
  el('div', 'sep', rd);
  const kv = (label) => el('div', 'kv', rd, `<span>${label}</span><b></b>`).lastChild;
  const kStim = kv('Estimulación');
  const kDist = kv('Punta → nervio');
  const kIce = kv('Hielo 0 °C (diámetro)');
  const k20 = kv('Isoterma −20 °C (diám.)');
  const kNerve = kv('Nervio dentro de −20 °C');
  const kSkin = kv('Borde del hielo → dermis');
  const warn = el('div', 'warn', rd);
  el('div', 'sep', rd);
  el('div', 'ttl', rd, 'Temperatura de la punta');
  const ch = el('canvas', 'ch', rd);
  ch.width = 580;
  ch.height = 172;

  const curves = {'1.3': tipCurve('1.3'), '2.1': tipCurve('2.1')};
  const drawChart = (s) => {
    const g = ch.getContext('2d');
    const w = ch.width;
    const h = ch.height;
    g.clearRect(0, 0, w, h);
    const y = (T) => 12 + ((40 - T) / 110) * (h - 30);
    for (const p of PHASES) {
      if (p.id === 'freeze' || p.id === 'thaw') {
        g.fillStyle = p.id === 'freeze' ? 'rgba(26,163,217,.10)' : 'rgba(239,138,58,.12)';
        g.fillRect((p.t0 / TOTAL) * w, 0, (p.dur / TOTAL) * w, h - 16);
      }
    }
    g.strokeStyle = '#d5dde5';
    g.lineWidth = 1;
    g.font = '600 17px "JetBrains Mono", monospace';
    g.fillStyle = '#8b97a3';
    for (const T of [20, 0, -20, -40, -60]) {
      g.beginPath();
      g.moveTo(0, y(T));
      g.lineTo(w, y(T));
      g.stroke();
      g.fillText(`${T}°`, 4, y(T) - 3);
    }
    const c = curves[probe];
    g.strokeStyle = '#1d2731';
    g.lineWidth = 3;
    g.beginPath();
    for (let i = 0; i < c.length; i++) {
      const x = (i / (c.length - 1)) * w;
      if (i) g.lineTo(x, y(c[i]));
      else g.moveTo(x, y(c[i]));
    }
    g.stroke();
    const cx = (s.tau / TOTAL) * w;
    g.fillStyle = '#1aa3d9';
    g.beginPath();
    g.arc(cx, y(s.tip), 7, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#7d8a97';
    g.fillText('0', 2, h - 2);
    g.textAlign = 'right';
    g.fillText(`${Math.round(TOTAL)} s`, w - 2, h - 2);
    g.textAlign = 'left';
  };

  // ------------------------------------------------ bottom bar
  const bar = el('div', 'pn bar', ui);
  const bPlay = el('div', 'b', bar, '❚❚');
  const tl = el('div', 'tl', bar);
  for (const p of PHASES) {
    const sg = el('div', `seg ${p.id === 'freeze' ? 'fz' : p.id === 'thaw' ? 'th' : ''}`, tl);
    sg.style.left = `${(p.t0 / TOTAL) * 100}%`;
    sg.style.width = `${(p.dur / TOTAL) * 100}%`;
  }
  const cur = el('div', 'cur', tl);
  const tt = el('div', 'tt', tl);
  const grp = (label) => {
    const g = el('div', 'grp', bar);
    el('span', 'lab', g, label);
    return g;
  };
  const gSpd = grp('VEL');
  const speeds = [1, 5, 15];
  const bSpd = speeds.map((v) => {
    const b = el('div', 'b', gSpd, `${v}×`);
    b.addEventListener('click', () => {
      takeOver();
      speed = v;
    });
    return b;
  });
  const gView = grp('VISTA');
  const bView = {};
  for (const k of VIEW_KEYS) {
    bView[k] = el('div', 'b', gView, VIEWS[k].name);
    bView[k].addEventListener('click', () => {
      takeOver();
      setView(k);
    });
  }
  const gOpt = grp('SONDA');
  const bProbe = {};
  for (const k of Object.keys(PROBES)) {
    bProbe[k] = el('div', 'b', gOpt, `${k.replace('.', ',')} mm`);
    bProbe[k].addEventListener('click', () => {
      takeOver();
      probe = k;
    });
  }
  const bTherm = el('div', 'b', gOpt, 'Mapa térmico');
  bTherm.addEventListener('click', () => {
    takeOver();
    thermal = !thermal;
  });
  const bLbl = el('div', 'b', gOpt, 'Rótulos');
  bLbl.addEventListener('click', () => {
    takeOver();
    showLabels = !showLabels;
  });
  el('div', 'note', ui, 'Valores del equipo según IFU C3 CryoSystem Rev. 3.2 (inomed, 04/25). Tamaño de la bola de hielo, perfil térmico y curva corriente–distancia son un modelo ilustrativo, no especificaciones del fabricante.');

  // labels
  const lblEls = st.labels.map((l) => {
    const d = el('div', 'lbl', ui, l.text);
    const ln = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    ln.setAttribute('stroke', '#6b7884');
    ln.setAttribute('stroke-width', '1.2');
    ln.setAttribute('fill', 'none');
    svg.appendChild(ln);
    const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    dot.setAttribute('r', '3.2');
    dot.setAttribute('fill', '#1aa3d9');
    svg.appendChild(dot);
    return {d, ln, dot, a: 0};
  });

  // ------------------------------------------------ state
  let tau = 0;
  let speed = 5;
  let paused = false;
  let probe = '1.3';
  let thermal = true;
  let showLabels = true;
  let view = 'equipo';
  let viewT = 0;
  const off = {az: 0, el: 0, k: 1};
  const cam = {...VIEWS.equipo, az: VIEWS.equipo.az, el: VIEWS.equipo.el};
  const clock = {real: 0, gas: 0};
  let T = 0;
  let lastInput = -99;
  let tour = true;
  const setView = (k) => {
    if (k !== view) viewT = T;
    view = k;
    Object.assign(off, {az: 0, el: 0, k: 1});
  };
  function takeOver() {
    lastInput = T;
    tour = false;
  }
  tourChip.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    if (tour) takeOver();
    else {
      tour = true;
      speed = 5;
      paused = false;
    }
  });
  bPlay.addEventListener('click', () => {
    takeOver();
    if (tau >= TOTAL - 0.05) tau = 0;
    paused = !paused;
  });
  const scrub = (e) => {
    const r = tl.getBoundingClientRect();
    tau = clamp((e.clientX - r.left) / r.width, 0, 1) * (TOTAL - 0.01);
  };
  tl.addEventListener('pointerdown', (e) => {
    takeOver();
    tl.setPointerCapture(e.pointerId);
    scrub(e);
    const mv = (ev) => scrub(ev);
    const up = () => {
      tl.removeEventListener('pointermove', mv);
      tl.removeEventListener('pointerup', up);
    };
    tl.addEventListener('pointermove', mv);
    tl.addEventListener('pointerup', up);
  });
  addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const k = e.key.toLowerCase();
    const n = Number(k);
    if (n >= 1 && n <= VIEW_KEYS.length) {
      takeOver();
      setView(VIEW_KEYS[n - 1]);
    } else if (k === ' ') bPlay.click();
    else if (k === 't') bTherm.click();
    else if (k === 'l') bLbl.click();
    else if (k === 'arrowright') {
      takeOver();
      tau = Math.min(TOTAL - 0.01, tau + 5);
    } else if (k === 'arrowleft') {
      takeOver();
      tau = Math.max(0, tau - 5);
    } else return;
    e.preventDefault();
  });
  let drag = null;
  canvas.addEventListener('pointerdown', (e) => {
    takeOver();
    drag = {x: e.clientX, y: e.clientY};
    canvas.setPointerCapture(e.pointerId);
    canvas.classList.add('drag');
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    off.az -= ((e.clientX - drag.x) / scale) * 0.3;
    off.el = clamp(off.el + ((e.clientY - drag.y) / scale) * 0.2, -30, 70);
    drag = {x: e.clientX, y: e.clientY};
    lastInput = T;
  });
  const endDrag = () => {
    drag = null;
    canvas.classList.remove('drag');
  };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      takeOver();
      off.k = clamp(off.k * Math.exp(e.deltaY * 0.0012), 0.3, 2.5);
    },
    {passive: false},
  );

  // ------------------------------------------------ fit
  let scale = 1;
  const fit = () => {
    scale = Math.min(innerWidth / W, innerHeight / H);
    app.style.transform = `translate(${(innerWidth - W * scale) / 2}px, ${(innerHeight - H * scale) / 2}px) scale(${scale})`;
    st.resize(W, H, clamp((devicePixelRatio || 1) * scale, 0.75, 2));
  };
  fit();
  addEventListener('resize', fit);

  // ------------------------------------------------ frame
  let last = performance.now();
  let n = 0;
  const frame = (now) => {
    const dt = Math.min(0.1, Math.max(0, (now - last) / 1000));
    last = now;
    T += dt;
    if (!tour && T - lastInput > IDLE) {
      tour = true;
      speed = 5;
      paused = false;
    }
    if (!paused) {
      tau += dt * speed;
      if (tau >= TOTAL) tau = tour ? 0 : TOTAL - 0.01;
      if (!tour && tau >= TOTAL - 0.01) paused = true;
    }
    const s = state(tau, {probe});
    clock.real = T;
    clock.gas += dt * (s.flow / s.P.flowOpt);
    if (tour) {
      const v = tourView(s);
      if (v !== view) setView(v);
    }
    const P = VIEWS[view];
    const tgt = {tx: P.tx, ty: P.ty, tz: P.tz, az: P.az + off.az + (tour ? 4 * Math.sin((T - viewT) * 0.25) : 0), el: clamp(P.el + off.el, -30, 80), d: P.d * off.k};
    const k = 1 - Math.exp(-dt / 0.35);
    // fly between distant groups through the distance, not the angle
    const far = Math.hypot(tgt.tx - cam.tx, tgt.ty - cam.ty) > 1500;
    const kk = far ? 1 - Math.exp(-dt / 0.22) : k;
    cam.az += wrap(tgt.az - cam.az) * kk;
    for (const key of ['tx', 'ty', 'tz', 'el', 'd']) cam[key] += (tgt[key] - cam[key]) * kk;
    st.frame(s, {...cam, az: cam.az * D2R, el: cam.el * D2R, near: view}, clock, {thermal, view});

    // panels
    rows.forEach((r, i) => {
      const p = PHASES[i];
      r.className = `row${p === s.ph ? ' on' : tau >= p.t1 ? ' done' : ''}`;
    });
    if (desc.dataset.id !== s.ph.id) {
      desc.dataset.id = s.ph.id;
      desc.innerHTML = `<b>${s.ph.name}</b> · <span class="mono" style="font-size:11px;color:#7d8a97">${s.ph.sub}</span><br>${DESCR[s.ph.id]}`;
    }
    if (s.ph.id === 'freeze') {
      big.innerHTML = `${fmtClock(s.freezeClock)} <small>congelación</small>`;
    } else if (s.ph.id === 'thaw') {
      big.innerHTML = `${fmtClock(s.thawClock)} <small>descongelación</small>`;
    } else if (s.stim.on) {
      big.innerHTML = `${s.stim.mA.toFixed(2)} <small>mA · ${s.stim.hz} Hz</small>`;
    } else {
      big.innerHTML = `${s.tip.toFixed(0)} <small>°C en la punta</small>`;
    }
    bigSub.firstChild.textContent = 'Punta';
    bigSub.lastChild.innerHTML = `<span class="${s.tip < 0 ? 'acc' : ''}">${s.tip.toFixed(1)} °C</span>`;
    gCyl(s.cylinder, `${s.cylinder.toFixed(1)} bar`);
    gProbe(s.probeP, `${s.probeP.toFixed(1)} bar${!s.exhaustOpen ? ' · escape cerrado' : ''}`);
    gFlow(s.flow, `${s.flow.toFixed(1)} L/min`);
    kStim.innerHTML = s.stim.on ? `${s.stim.hz === 2 ? 'motora' : 'sensorial'} ${s.stim.mA.toFixed(2)} mA${s.stim.hz === 2 ? ' · <span class="ok">sin contracción</span>' : s.stim.response ? ' · <span class="acc">responde</span>' : ''}` : '—';
    kDist.textContent = s.probeIn > 0.9 ? `${s.dNerve.toFixed(2)} mm` : '—';
    const iceOn = s.R0 > s.rp * 1.03;
    kIce.textContent = iceOn ? `${(2 * s.R0).toFixed(1)} × ${(2 * Math.max(s.A0, s.R0)).toFixed(1)} mm` : '—';
    k20.textContent = s.r20 > s.rp ? `${(2 * s.r20).toFixed(1)} mm` : '—';
    kNerve.innerHTML = iceOn ? (s.nerveIn20 ? '<span class="ok">sí</span>' : s.nerveInIce ? '<span class="bad">solo en hielo &gt; −20 °C</span>' : 'no') : '—';
    kSkin.innerHTML = iceOn ? `<span class="${s.skinGap < 2 ? 'bad' : ''}">${s.skinGap.toFixed(1)} mm</span>` : '—';
    warn.style.display = s.warn.length ? 'block' : 'none';
    warn.textContent = s.warn.join(' · ');
    if (n++ % 2 === 0) drawChart(s);

    bPlay.textContent = paused ? '▶' : '❚❚';
    cur.style.left = `${(tau / TOTAL) * 100}%`;
    tt.style.left = cur.style.left;
    tt.textContent = `${Math.floor(tau)} s`;
    speeds.forEach((v, i) => bSpd[i].classList.toggle('on', v === speed));
    for (const kk2 of VIEW_KEYS) bView[kk2].classList.toggle('on', kk2 === view);
    for (const kk2 of Object.keys(PROBES)) bProbe[kk2].classList.toggle('on', kk2 === probe);
    bTherm.classList.toggle('on', thermal);
    bLbl.classList.toggle('on', showLabels);
    vtag.textContent = `${VIEWS[view].name}${view === 'sonda' ? ' · ×30' : view === 'tejido' ? ' · ×12 · corte' : ''}`;
    tourChip.classList.toggle('on', tour);
    tourChip.innerHTML = tour ? '<i></i>TOUR AUTOMÁTICO · CLIC PARA TOMAR EL CONTROL' : '▶ REANUDAR TOUR';

    // labels with leaders
    const settled = Math.hypot(cam.tx - P.tx, cam.ty - P.ty) < 60 && T - viewT > 0.6;
    st.labels.forEach((l, i) => {
      const e = lblEls[i];
      const want = showLabels && settled && l.view.includes(view) && (!l.when || l.when(s));
      e.a += ((want ? 1 : 0) - e.a) * Math.min(1, dt * 8);
      if (e.a < 0.02) {
        e.d.style.opacity = 0;
        e.ln.setAttribute('d', '');
        e.dot.setAttribute('r', 0);
        return;
      }
      const p = st.project(l.at());
      if (!p.ok) {
        e.d.style.opacity = 0;
        return;
      }
      const side = l.side === 'down' ? 1 : l.side === 'up' ? -1 : p.y > 430 ? 1 : -1;
      const lx = clamp(p.x + (l.dx ?? (p.x > 800 ? 40 : -40)), 500, 1100);
      const ly = clamp(p.y + side * 52, 90, 760);
      e.d.style.left = `${lx}px`;
      e.d.style.top = `${ly}px`;
      e.d.style.opacity = e.a;
      e.ln.setAttribute('d', `M${p.x},${p.y} L${lx},${ly + (side > 0 ? -11 : 11)}`);
      e.ln.setAttribute('opacity', e.a);
      e.dot.setAttribute('cx', p.x);
      e.dot.setAttribute('cy', p.y);
      e.dot.setAttribute('r', 3.2 * e.a);
    });
    if (!window.SIM_SHOWN) {
      window.SIM_SHOWN = true;
      dispatchEvent(new Event('simframe'));
    }
    requestAnimationFrame(frame);
  };
  window.LIVE = {
    st,
    seek: (t, v, opts = {}) => {
      tour = false;
      lastInput = 1e9;
      paused = true;
      tau = t;
      if (v) {
        setView(v);
        viewT = -10;
        Object.assign(cam, VIEWS[v]);
      }
      if (opts.probe) probe = opts.probe;
      if (opts.thermal != null) thermal = opts.thermal;
    },
  };
  requestAnimationFrame(frame);
}

run();
