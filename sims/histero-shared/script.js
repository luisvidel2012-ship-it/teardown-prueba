// The operator's script: views, toggles, grip strokes, all a pure function of time. The film plays it; the live page
// plays it as the auto tour. The two integrated quantities (fluid phase, resected tissue) are tabulated once at load.
import {BAG, clamp, ss} from './model.js';

export const DURATION = 44;
export const VIEWS = ['hero', 'handle', 'tip', 'axial'];
export const VIEW_LABEL = {hero: 'CONJUNTO', handle: 'MANGO', tip: 'PUNTA', axial: 'AXIAL'};
export const TOGGLES = ['labels', 'glass', 'section', 'flow', 'energy'];
export const TOGGLE_LABEL = {labels: 'ETIQUETAS', glass: 'CRISTAL', section: 'CORTE', flow: 'FLUJO', energy: 'ENERGÍA'};

export const CAMS = {
  hero: {tx: 4.4, ty: -3.6, tz: 0, az: -24, el: 10, d: 66},
  handle: {tx: -3.8, ty: -3.4, tz: 0, az: -28, el: 11, d: 58},
  tip: {tx: 15.4, ty: 0.1, tz: 0, az: -34, el: 14, d: 12},
  axial: {tx: 17.6, ty: 0.1, tz: 0, az: 64, el: 9, d: 9},
};

// view changes, toggle events (value after the time), grip strokes, size, captions. Every number in seconds.
const VIEW_EV = [[0, 'hero'], [6, 'handle'], [12.5, 'hero'], [17, 'tip'], [28.5, 'hero'], [34, 'axial'], [38, 'hero']];
const TOG_EV = {
  labels: [[0, 0], [1.2, 1], [4.8, 0], [6.8, 1], [11, 0], [17.8, 1], [20.5, 0], [29.2, 1], [33.2, 0]],
  glass: [[0, 0], [12.8, 1], [36, 0]],
  section: [[0, 0], [15.5, 1], [19.3, 0]],
  flow: [[0, 0], [13.2, 1]],
  energy: [[0, 0], [21, 1], [27.5, 0]],
};
const FR_EV = [[0, 13], [30, 17], [34, 13], [40.5, 13]];
const STROKES = [[2.6, 2.4], [8, 2.2], [10.4, 2.2], [14.4, 2.6], [18.2, 2.6], [21.2, 2.6], [23.7, 2.6], [26.2, 2.4], [30.8, 2.6], [41, 2.4]];
export const CAPTIONS = [
  [0, 'UteriS® XS · el histeroscopio bipolar más pequeño del mundo: 13 Fr (también en 17 Fr)'],
  [6, 'Al apretar el mango, el asa bipolar se retrae por la punta; al soltar, vuelve a su posición'],
  [12.5, 'Dos llaves y una camisa perforada: el líquido entra por una y sale por los orificios distales'],
  [17, 'Asa bipolar: cortes precisos y coagulación eficiente con mínima dispersión térmica'],
  [22, 'Resección de pólipos y miomas submucosos pequeños, con visualización directa'],
  [28.5, '13 Fr = 4,3 mm · 17 Fr = 5,7 mm: menos dilatación cervical y, en muchos casos, sin anestesia general'],
  [34, 'Una sección tan pequeña reduce el trauma cervical y mejora la experiencia de la paciente'],
  [38, 'Compatible con sistemas Full HD como el SmartPack System de INVIDIA® · ideal para consulta ambulatoria'],
];
export const BAG_EV = [[0, 0.9]];

const lastEv = (ev, t) => {
  let i = 0;
  while (i < ev.length - 1 && t >= ev[i + 1][0]) i++;
  return i;
};
const eased = (ev, t, dur = 0.8) => {
  const i = lastEv(ev, t);
  const prev = i ? ev[i - 1][1] : ev[0][1];
  return prev + (ev[i][1] - prev) * ss(ev[i][0], ev[i][0] + dur, t);
};
export const viewAtT = (t) => VIEW_EV[lastEv(VIEW_EV, t)];
const camPart = (v) => CAMS[v];
export const camAt = (t) => {
  const i = lastEv(VIEW_EV, t);
  const a = camPart(i ? VIEW_EV[i - 1][1] : VIEW_EV[0][1]);
  const b = camPart(VIEW_EV[i][1]);
  const k = ss(VIEW_EV[i][0], VIEW_EV[i][0] + 1.6, t);
  const c = {};
  for (const key of Object.keys(a)) c[key] = a[key] + (b[key] - a[key]) * k;
  if (t > 38) c.az += (t - 38) * 7;
  return c;
};

// one grip stroke: squeeze (cut) 0..0.52, hold to 0.6, release to 1
const strokeAt = (t0, D, t) => {
  const u = (t - t0) / D;
  if (u < 0 || u > 1) return {g: 0, cut: 0};
  const g = u < 0.52 ? ss(0, 0.52, u) : u < 0.6 ? 1 : 1 - ss(0.6, 1, u);
  return {g, cut: u > 0.05 && u < 0.52 ? 1 : 0};
};
export const gripAt = (t) => {
  let g = 0;
  let cut = 0;
  for (const [t0, D] of STROKES) {
    const s = strokeAt(t0, D, t);
    if (s.g > g) g = s.g;
    cut = Math.max(cut, s.cut);
  }
  return {g, cut};
};

// tabulated once: fluid phase and the share of the polyp resected
const DT = 1 / 120;
const TAB = (() => {
  const n = Math.ceil(DURATION / DT) + 2;
  const phase = new Float32Array(n);
  const resect = new Float32Array(n);
  for (let i = 1; i < n; i++) {
    const t = i * DT;
    const flow = eased(TOG_EV.flow, t, 0.6);
    phase[i] = phase[i - 1] + flow * DT;
    const a = gripAt(t - DT).g;
    const b = gripAt(t).g;
    const en = eased(TOG_EV.energy, t, 0.2) > 0.5 && gripAt(t).cut ? 1 : 0;
    resect[i] = Math.min(1, resect[i - 1] + (en ? Math.max(0, b - a) * 0.36 : 0));
  }
  return {phase, resect};
})();
const tab = (arr, t) => {
  const x = clamp(t / DT, 0, arr.length - 2);
  const i = Math.floor(x);
  return arr[i] + (arr[i + 1] - arr[i]) * (x - i);
};

export const stateAt = (t) => {
  const grip = gripAt(t);
  const energyOn = eased(TOG_EV.energy, t, 0.2) > 0.5;
  const ci = lastEv(CAPTIONS, t);
  return {
    g: grip.g,
    cut: grip.cut,
    fr: eased(FR_EV, t, 1.6),
    glass: eased(TOG_EV.glass, t),
    section: eased(TOG_EV.section, t, 0.2) > 0.5 ? 1 : 0,
    labels: eased(TOG_EV.labels, t, 0.6),
    flow: eased(TOG_EV.flow, t, 0.6),
    phase: tab(TAB.phase, t),
    armed: energyOn ? 1 : 0,
    energy: energyOn ? grip.cut * (0.65 + 0.35 * Math.sin(t * 42) ** 2) : 0,
    resect: tab(TAB.resect, t),
    bag: BAG_EV[0][1],
    view: viewAtT(t)[1],
    viewT0: viewAtT(t)[0],
    caption: CAPTIONS[ci][1],
    captionT0: CAPTIONS[ci][0],
  };
};

// the operator's pointer: the control it touches at each event
export const EVENTS = (() => {
  const out = [];
  for (const [t, v] of VIEW_EV.slice(1)) out.push({t, key: v});
  for (const k of TOGGLES) for (const [t] of TOG_EV[k].slice(1)) out.push({t, key: k});
  for (const [t, fr] of FR_EV.slice(1)) if (fr !== FR_EV[FR_EV.indexOf(FR_EV.find((e) => e[0] === t)) - 1][1]) out.push({t: t - 0.2, key: fr === 17 ? 'fr17' : 'fr13'});
  return out.sort((a, b) => a.t - b.t);
})();
