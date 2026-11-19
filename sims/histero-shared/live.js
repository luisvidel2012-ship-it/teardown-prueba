// UteriS XS as a page you drive: drag the grip slider (or hold SPACE), arm the bipolar energy and resect the polyp,
// open the flow, switch the sheath to glass or a section, 13 / 17 Fr, four views, orbit and zoom. Left alone it plays
// the film's script as an auto tour with a cursor; any click, drag, wheel or key hands control over, 25 s of quiet
// hands it back.
import {BAG, clamp, FR_RANGE, ss} from './model.js';
import {createConsole} from './console.js';
import {makeCursor, toStageCam} from './film.js';
import {CAMS, camAt, DURATION, stateAt, TOGGLES, VIEWS} from './script.js';
import {createStage} from './stage.js';

const W = 1600;
const H = 900;
const IDLE = 25;
const wrap = (d) => ((((d + 180) % 360) + 360) % 360) - 180;

const CSS = `
html,body{background:#e6ecef;overflow:hidden}
#app{position:absolute!important;inset:auto!important;left:0;top:0;width:${W}px;height:${H}px;transform-origin:0 0}
#gl{touch-action:none;cursor:grab;position:absolute;left:0;top:0;width:${W}px;height:${H}px}
#gl.drag{cursor:grabbing}
.bt{pointer-events:auto;cursor:pointer}
.bt:hover{filter:brightness(.96)}
.hit{position:absolute;pointer-events:auto;cursor:ew-resize}
.tourchip{position:absolute;left:800px;top:128px;transform:translateX(-50%);display:flex;align-items:center;gap:7px;height:24px;padding:0 12px;border:1px solid #e0e8ec;border-radius:5px;background:rgba(252,254,254,.95);color:#1d2a30;font:700 10px 'JetBrains Mono',monospace;letter-spacing:1.3px;white-space:nowrap;cursor:pointer;pointer-events:auto}
.tourchip i{display:block;width:6px;height:6px;border-radius:50%;background:#19a7b0}
.tourchip.on i{animation:blink 1.2s steps(2) infinite}
@keyframes blink{50%{opacity:.15}}
.turn{position:fixed;left:0;right:0;bottom:18px;text-align:center;font:600 12px/1.4 'JetBrains Mono',monospace;letter-spacing:1px;color:#7b8b93;text-transform:uppercase;display:none}
@media (orientation:portrait) and (max-width:820px){.turn{display:block}}
`;

export function runLive() {
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);
  const app = document.getElementById('app');
  const canvas = document.createElement('canvas');
  canvas.id = 'gl';
  app.appendChild(canvas);
  const st = createStage({canvas});
  const ui = createConsole(app);
  const tourCursor = makeCursor(ui);
  const TIERS = [{pr: 2}, {pr: 1.5}, {pr: 1}];
  let tier = matchMedia('(pointer: coarse)').matches || Math.min(innerWidth, innerHeight) < 700 ? 2 : 0;
  let scale = 1;
  const fit = () => {
    scale = Math.min(innerWidth / W, innerHeight / H);
    app.style.transform = `translate(${(innerWidth - W * scale) / 2}px, ${(innerHeight - H * scale) / 2}px) scale(${scale})`;
    st.resize(W, H, clamp((devicePixelRatio || 1) * scale, 0.75, TIERS[tier].pr));
    ui.measure();
  };
  fit();
  addEventListener('resize', fit);
  const toStage = (cx) => (cx - app.getBoundingClientRect().left) / scale;
  const tourChip = document.createElement('div');
  tourChip.className = 'tourchip';
  ui.root.appendChild(tourChip);
  const note = document.createElement('div');
  note.className = 'turn';
  note.textContent = 'Gira el teléfono para ver toda la consola';
  document.body.appendChild(note);

  // ------------------------------------------------------------ manual state
  let T = 0;
  const M = {g: 0, fr: 13, frT: 13, glass: 0, glassT: 0, section: 0, labels: 1, labelsT: 1, flow: 0, flowT: 0, phase: 0, armed: 0, energy: 0, resect: 0, bag: 0.9, view: 'hero', viewT0: 0};
  const off = {az: 0, el: 0, k: 1};
  const cam = {...CAMS.hero};
  let ring = {t: -9, x: 0, y: 0};
  let cycle = null; // a SPACE stroke in progress
  let gPrev = 0;
  const AP = {on: true, t0: 0};
  let lastInput = 0;
  const pulse = (k) => ui.spots[k] && (ring = {t: T, x: ui.spots[k][0], y: ui.spots[k][1]});

  const startTour = () => {
    AP.on = true;
    AP.t0 = T;
    Object.assign(off, {az: 0, el: 0, k: 1});
    cycle = null;
  };
  const takeOver = () => {
    lastInput = T;
    if (!AP.on) return;
    const s = stateAt((T - AP.t0) % DURATION);
    AP.on = false;
    Object.assign(M, {g: s.g, fr: s.fr, frT: Math.round(s.fr) < 15 ? 13 : 17, glass: s.glass, glassT: s.glass > 0.5 ? 1 : 0, section: s.section, labels: s.labels, labelsT: s.labels > 0.5 ? 1 : 0, flow: s.flow, flowT: s.flow > 0.5 ? 1 : 0, phase: s.phase, armed: s.armed, resect: s.resect, view: s.view, viewT0: T});
    Object.assign(cam, camAt((T - AP.t0) % DURATION));
  };
  tourChip.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    lastInput = T;
    if (AP.on) takeOver();
    else startTour();
  });
  addEventListener('pointerdown', (e) => {
    if (e.target !== tourChip) takeOver();
  });

  // ------------------------------------------------------------ controls
  for (const v of VIEWS)
    ui.btn[v].addEventListener('click', () => {
      takeOver();
      pulse(v);
      M.view = v;
      Object.assign(off, {az: 0, el: 0, k: 1});
    });
  const flip = {
    labels: () => (M.labelsT = M.labelsT ? 0 : 1),
    glass: () => (M.glassT = M.glassT ? 0 : 1),
    section: () => (M.section = M.section ? 0 : 1),
    flow: () => (M.flowT = M.flowT ? 0 : 1),
    energy: () => (M.armed = M.armed ? 0 : 1),
  };
  for (const k of TOGGLES)
    ui.btn[k].addEventListener('click', () => {
      takeOver();
      pulse(k);
      flip[k]();
    });
  for (const fr of FR_RANGE)
    ui.btn[`fr${fr}`].addEventListener('click', () => {
      takeOver();
      pulse(`fr${fr}`);
      M.frT = fr;
    });
  ui.btn.reset.addEventListener('click', () => {
    takeOver();
    pulse('reset');
    M.resect = 0;
  });
  const slider = (x0, w, y, apply) => {
    const d = document.createElement('div');
    d.className = 'hit';
    Object.assign(d.style, {left: `${x0 - 10}px`, top: `${y - 14}px`, width: `${w + 20}px`, height: '28px'});
    const move = (e) => {
      apply(clamp((toStage(e.clientX) - x0) / w, 0, 1));
      lastInput = T;
    };
    d.addEventListener('pointerdown', (e) => {
      takeOver();
      d.setPointerCapture(e.pointerId);
      const up = () => {
        removeEventListener('pointermove', move);
        removeEventListener('pointerup', up);
      };
      addEventListener('pointermove', move);
      addEventListener('pointerup', up);
      move(e);
    });
    ui.root.appendChild(d);
  };
  slider(ui.GRIP.x, ui.GRIP.w, ui.GRIP.y, (k) => {
    cycle = null;
    M.g = k;
  });
  slider(ui.BAGS.x, ui.BAGS.w, ui.BAGS.y, (k) => (M.bag = BAG[0] + k * (BAG[1] - BAG[0])));
  addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const key = e.key.toLowerCase();
    const v = {1: 'hero', 2: 'handle', 3: 'tip', 4: 'axial'}[key];
    if (v) ui.btn[v].click();
    else if (key === ' ') {
      takeOver();
      if (!cycle) cycle = {t0: T};
    } else if (key === 'e') ui.btn.energy.click();
    else if (key === 'f') ui.btn.flow.click();
    else if (key === 'g') ui.btn.glass.click();
    else if (key === 'c') ui.btn.section.click();
    else if (key === 'l') ui.btn.labels.click();
    else if (key === 'r') ui.btn.reset.click();
    else return;
    e.preventDefault();
  });
  let drag = null;
  canvas.addEventListener('pointerdown', (e) => {
    drag = {x: e.clientX, y: e.clientY};
    canvas.setPointerCapture(e.pointerId);
    canvas.classList.add('drag');
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    off.az += ((e.clientX - drag.x) / scale) * 0.3;
    off.el = clamp(off.el + ((e.clientY - drag.y) / scale) * 0.2, -25, 60);
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
      off.k = clamp(off.k * Math.exp(e.deltaY * 0.0012), 0.35, 2.4);
    },
    {passive: false},
  );

  // ------------------------------------------------------------ the frame
  startTour();
  let last = performance.now();
  const perf = {n: 0, sum: 0, slow: 0, age: 0};
  const approach = (a, b, dt, tau) => a + (b - a) * (1 - Math.exp(-dt / tau));
  const frame = (now) => {
    const dt = Math.min(0.1, Math.max(0, (now - last) / 1000));
    last = now;
    T += dt;
    if (tier < TIERS.length - 1) {
      perf.age += dt;
      if (perf.age > 0.6) {
        perf.sum += dt;
        perf.n++;
        if (perf.sum >= 0.5 && perf.n >= 6) {
          perf.slow = perf.sum / perf.n > 0.026 ? perf.slow + 1 : 0;
          perf.sum = 0;
          perf.n = 0;
          if (perf.slow >= (perf.age < 6 ? 1 : 2)) {
            tier++;
            fit();
            Object.assign(perf, {age: 0, slow: 0});
          }
        }
      }
    }
    let s;
    let tgt;
    let cursor;
    if (AP.on) {
      const c = (T - AP.t0) % DURATION;
      s = stateAt(c);
      tgt = camAt(c);
      cursor = tourCursor(c);
    } else {
      if (T - lastInput > IDLE) startTour();
      if (cycle) {
        const u = (T - cycle.t0) / 1.8;
        M.g = u < 0.5 ? ss(0, 0.5, u) : u < 0.58 ? 1 : 1 - ss(0.58, 1, u);
        if (u >= 1) {
          cycle = null;
          M.g = 0;
        }
      }
      M.fr = approach(M.fr, M.frT, dt, 0.35);
      M.glass = approach(M.glass, M.glassT, dt, 0.25);
      M.labels = approach(M.labels, M.labelsT, dt, 0.2);
      M.flow = approach(M.flow, M.flowT, dt, 0.25);
      M.phase += M.flow * dt;
      // cutting: the loop is drawn back while the energy is armed
      const dg = M.g - gPrev;
      const cutting = M.armed && dg > 0.0008;
      M.energy = cutting ? 0.65 + 0.35 * Math.sin(T * 42) ** 2 : approach(M.energy, 0, dt, 0.06);
      if (cutting) M.resect = Math.min(1, M.resect + dg * 0.36);
      gPrev = M.g;
      s = {...M, cut: cutting ? 1 : 0, caption: 'Aprieta el mando, abre el flujo, arma la energía y reseca el pólipo · espacio = un apretón', captionT0: 0};
      tgt = {...CAMS[M.view]};
      tgt.az += off.az;
      tgt.el = clamp(tgt.el + off.el, -20, 88);
      tgt.d *= off.k;
      const rk = Math.max(0, 1 - (T - ring.t) / 0.55);
      cursor = {x: -99, y: -99, press: false, ring: rk, ringX: ring.x, ringY: ring.y};
    }
    const k = 1 - Math.exp(-dt / (AP.on ? 0.12 : 0.4));
    cam.az += wrap(tgt.az - cam.az) * k;
    for (const key of ['tx', 'ty', 'tz', 'el', 'd']) cam[key] += (tgt[key] - cam[key]) * k;
    st.frame(s, toStageCam(cam));
    if (tourChip.classList.contains('on') !== AP.on || !tourChip.firstChild) {
      tourChip.classList.toggle('on', AP.on);
      tourChip.innerHTML = AP.on ? '<i></i>RECORRIDO AUTOMÁTICO · CLIC PARA TOMAR EL CONTROL' : '▶ REANUDAR RECORRIDO';
    }
    ui.update({...s, project: st.project, cursor}, T);
    if (!window.SIM_SHOWN) {
      window.SIM_SHOWN = true;
      dispatchEvent(new Event('simframe'));
    }
    requestAnimationFrame(frame);
  };
  st.renderer.compileAsync(st.scene, st.camera).catch(() => {}).then(() => requestAnimationFrame(frame));
  window.LIVE = {st, cam, M, startTour, takeOver, get T() {
    return T;
  }};
}
