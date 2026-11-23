// C3 CryoSystem: the procedure as one function of time. No three.js here.
// Every number on screen and every pose comes from state(tau, opts).
//
// Device values: IFU "C3 CryoSystem" D010304-ES Rev. 3.2 (inomed, 04/25).
//   supply 40–60 bar CO2/N2O, alarm > 68 bar · flow 5–20 L/min, optimal 8–15, < 5 = probe possibly blocked
//   tip ≈ −60 °C (Joule–Thomson) · freeze AUTO default 2 min · thaw by closing exhaust and refilling at high pressure
//   locator: motor 2 Hz, sensory 100 Hz, 0.01–25 mA, 200 µs, target sensory threshold < 0.5 mA
//   probes: 1.3 mm blunt (needs 15G cannula) / 2.1 mm sharp (12G cannula optional), shaft 133 mm, handle 140 mm, hose 2 m
//   cannula rings every 10 mm; retract ≥ 10 mm (one ring) before stimulating or freezing
// Illustrative (NOT from the manufacturer): ice-ball size, its growth rate, the radial temperature profile, the
// threshold-current vs distance curve and the purge pulse shape. The page says so.

export const PROBES = {
  '1.3': {d: 1.3, tip: 'roma', cannula: '15G × 65 (Ø 1,8 mm)', cannulaOD: 1.8, needsCannula: true, iceR: 3.6, iceAx: 5.0, flowOpt: 10},
  '2.1': {d: 2.1, tip: 'afilada', cannula: '12G × 62 (Ø 2,6 mm)', cannulaOD: 2.6, needsCannula: false, iceR: 5.2, iceAx: 6.8, flowOpt: 13},
};

export const T_BODY = 34; // subcutaneous tissue at the knee, °C
export const T_TIP = -60; // IFU: "temperaturas de hasta aproximadamente −60 °C"
export const T_ROOM = 21;

// Phases in procedure seconds. Freeze 120 s is the factory AUTO default; thaw duration is configurable (30 s here).
export const PHASES = [
  {id: 'check', name: 'Inicio', sub: 'autoverificación', dur: 6},
  {id: 'purge', name: 'Purga', sub: '45 s · expulsa aire y agua', dur: 45},
  {id: 'insert', name: 'Inserción', sub: 'cánula + sonda, retirar 10 mm', dur: 14},
  {id: 'motor', name: 'Estim. motora', sub: '2 Hz · descartar nervio motor', dur: 18},
  {id: 'sensory', name: 'Estim. sensorial', sub: '100 Hz · umbral < 0,5 mA', dur: 26},
  {id: 'freeze', name: 'Congelación', sub: 'AUTO 2 min · Joule–Thomson', dur: 120},
  {id: 'thaw', name: 'Descongelación', sub: 'escape cerrado · no se interrumpe', dur: 30},
  {id: 'remove', name: 'Retiro', sub: 'solo con descongelación completa', dur: 10},
];
let acc = 0;
for (const p of PHASES) {
  p.t0 = acc;
  acc += p.dur;
  p.t1 = acc;
}
export const TOTAL = acc;
export const phaseAt = (tau) => PHASES.find((p) => tau < p.t1) || PHASES[PHASES.length - 1];

export const DESCR = {
  check:
    'Al encender, la consola verifica la sonda conectada (su memoria guarda tipo, presión requerida y nº de usos: aviso a 40, envío a servicio a 50, descarte a 100) y la presión del cilindro: 40–60 bar. Sobre 68 bar avisa y obliga a desconectar.',
  purge:
    'La purga hace circular gas por la sonda para expulsar aire y agua; dura p. ej. 45 s, no se interrumpe y bloquea el tratamiento. Si no termina con el visto verde, la sonda puede estar bloqueada por humedad: repetir (a veces 5–8 veces) con la punta en suero tibio.',
  insert:
    'La sonda de 1,3 mm es roma y entra por una cánula 15G con mandril; la de 2,1 mm es afilada y la cánula 12G es opcional. Los anillos de la cánula marcan cada 10 mm: antes de estimular o congelar se retira al menos un anillo para dejar la punta activa expuesta.',
  motor:
    'Localizador motor a 2 Hz: la corriente sale solo por la punta (monopolar) y vuelve por el electrodo neutro de 96,8 cm² en el muslo. Se sube la intensidad buscando contracción: si aparece, hay un ramo motor cerca y hay que reposicionar.',
  sensory:
    'Localizador sensorial a 100 Hz: se sube la corriente hasta que el paciente siente hormigueo o su dolor habitual, y luego se baja mientras se ajusta la punta hasta provocarlo con menos de 0,5 mA. A mayor corriente umbral, más lejos está el nervio.',
  freeze:
    'El gas a 40–60 bar baja por un capilar y se expande por un orificio hacia la cámara de la punta: la caída de presión (efecto Joule–Thomson) enfría la punta hasta ≈ −60 °C. El gas vuelve por el espacio anular y sale por el escape. El reloj cuenta solo con flujo suficiente (óptimo 8–15 L/min).',
  thaw:
    'La consola cierra el escape y rellena la sonda con gas a alta presión: con presión igual a ambos lados del orificio no hay expansión ni frío, y la punta se calienta. La descongelación no se puede interrumpir; el pedal derecho mantenido la prolonga.',
  remove:
    'Con el símbolo de descongelación quieto, el hielo se ha soltado de la punta y la sonda se retira. Moverla antes arranca tejido adherido. El tratamiento queda en el protocolo del paciente (flujo, presión, tiempos, corriente).',
};

const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const sm = (x) => {
  const u = clamp(x, 0, 1);
  return u * u * (3 - 2 * u);
};
const ss = (a, b, t) => sm((t - a) / (b - a));

// Threshold current (mA) for a response at distance d (mm) from the active tip. Illustrative I ∝ r² law.
export const thresholdMA = (d) => 0.18 + 0.55 * d * d;

// Distance from the active tip to the nerve surface as the operator works (mm).
function nerveDist(tau) {
  const s = PHASES[4];
  if (tau < PHASES[3].t0) return 4.2;
  if (tau < s.t0) return 3.2;
  // approach during the sensory search
  return 3.2 - 2.75 * ss(s.t0 + 4, s.t1 - 3, tau);
}

// Stimulation current the operator dials (mA) and whether the patient reports a response.
function stimAt(tau, ph) {
  if (ph.id === 'motor') {
    const u = (tau - ph.t0) / ph.dur;
    const mA = u < 0.85 ? 0.01 + 2.0 * sm(u / 0.85) : 0;
    return {on: u < 0.85, hz: 2, mA, response: false};
  }
  if (ph.id === 'sensory') {
    const u = tau - ph.t0;
    const d = nerveDist(tau);
    // ramp up to first response, then step down while the tip is moved closer
    const up = 0.01 + 1.6 * sm(u / 6);
    const th = thresholdMA(d);
    const mA = u < 6 ? up : Math.max(th * 1.04, 0.36);
    const on = u < ph.dur - 2;
    return {on, hz: 100, mA: on ? mA : 0, response: on && mA >= th};
  }
  return {on: false, hz: 0, mA: 0, response: false};
}

// Purge: three gas pulses with the exhaust open.
function purgeFlow(tau, ph, flowOpt) {
  const u = tau - ph.t0;
  let f = 0;
  for (let k = 0; k < 3; k++) {
    const a = 2 + k * 14.5;
    f = Math.max(f, ss(a, a + 1.5, u) * (1 - ss(a + 10, a + 12, u)));
  }
  return f * flowOpt;
}

/**
 * Full state of the system at procedure time tau (s).
 * opts: {probe: '1.3' | '2.1'}
 */
export function state(tau, opts = {}) {
  tau = clamp(tau, 0, TOTAL - 1e-6);
  const P = PROBES[opts.probe || '1.3'];
  const ph = phaseAt(tau);
  const fz = PHASES[5];
  const th = PHASES[6];
  const u = tau - ph.t0;

  const cylinder = 52 - 1.5 * (tau / TOTAL); // bar, slowly draining
  let flow = 0;
  let probeP = 0; // bar inside the probe supply line
  let exhaustOpen = true;
  if (ph.id === 'purge') {
    flow = purgeFlow(tau, ph, P.flowOpt);
    probeP = (flow / P.flowOpt) * (cylinder - 6);
  } else if (ph.id === 'freeze') {
    const ramp = ss(0, 2.5, u);
    flow = P.flowOpt * ramp * (1 + 0.04 * Math.sin(u * 2.1));
    probeP = ramp * (cylinder - 6);
  } else if (ph.id === 'thaw') {
    exhaustOpen = false;
    flow = 0;
    probeP = cylinder * ss(0, 1.5, u);
  }

  // freeze clock: counts only once the minimum flow is reached (5 L/min)
  const freezeOn = ph.id === 'freeze';
  const freezeClock = freezeOn ? Math.max(0, u - 1.2) : tau >= fz.t1 ? fz.dur - 1.2 : 0;
  const thawClock = ph.id === 'thaw' ? u : tau >= th.t1 ? th.dur : 0;

  // tip temperature
  let tip = T_BODY;
  if (tau < PHASES[2].t0) tip = T_ROOM; // out of the patient
  if (ph.id === 'purge') tip = T_ROOM - (flow / P.flowOpt) * 38;
  if (ph.id === 'insert') tip = T_ROOM + (T_BODY - T_ROOM) * ss(2, 10, u);
  if (freezeOn) tip = T_TIP + (T_BODY - T_TIP) * Math.exp(-Math.max(0, u - 0.6) / 5.5);
  if (ph.id === 'thaw') {
    const tEnd = T_TIP + (T_BODY - T_TIP) * Math.exp(-(fz.dur - 0.6) / 5.5);
    tip = 24 + (tEnd - 24) * Math.exp(-u / 4.5);
  }
  if (ph.id === 'remove') tip = 24 + (T_BODY - 24) * ss(0, 8, u);

  // ice ball: 0 °C isotherm radius (mm, perpendicular to shaft) and half-length along it. Illustrative.
  let grow = 0;
  if (freezeOn) grow = 1 - Math.exp(-Math.max(0, u - 1) / 32);
  else if (ph.id === 'thaw' || ph.id === 'remove') {
    const g1 = 1 - Math.exp(-(fz.dur - 1) / 32);
    const v = tau - th.t0;
    grow = g1 * (1 - ss(2, th.dur + 4, v)) ** 1.2;
  }
  const rp = P.d / 2;
  const R0 = rp + (P.iceR - rp) * grow;
  const A0 = rp + (P.iceAx - rp) * grow;
  // log profile inside the ice from the wall (tissue at the wall tracks the tip) to 0 °C at R0
  const wallT = Math.min(0, tip);
  const iso = (T) => (R0 <= rp * 1.02 || wallT >= T ? 0 : rp * Math.pow(R0 / rp, (T - wallT) / (0 - wallT)));
  const r20 = iso(-20);
  const r40 = iso(-40);
  const stuck = (freezeOn || ph.id === 'thaw') && R0 > rp * 1.05 && !(ph.id === 'thaw' && thawClock > th.dur - 0.5);

  const dNerve = nerveDist(tau);
  const stim = stimAt(tau, ph);

  // geometry in the tissue (mm): nerve IPBSN 9 mm deep, skin surface y = 0
  const nerveDepth = 9;
  const nerveR = 1.0;
  const iceTop = nerveDepth - R0; // depth of the ice front toward the skin above the tip
  const skinGap = Math.max(0, iceTop - 2); // to the dermis (2 mm thick skin)
  const nerveInIce = dNerve + 2 * nerveR <= R0;
  const nerveIn20 = r20 > 0 && dNerve + 2 * nerveR <= r20;

  // insertion: cannula then probe, then cannula pulled back 10 mm
  const ins = PHASES[2];
  const cannulaIn = ss(ins.t0, ins.t0 + 5, tau) - (tau > PHASES[7].t0 + 2 ? ss(PHASES[7].t0 + 2, PHASES[7].t1, tau) : 0);
  const probeIn = ss(ins.t0 + 5.5, ins.t0 + 9, tau) - (tau > PHASES[7].t0 ? ss(PHASES[7].t0, PHASES[7].t0 + 6, tau) : 0);
  const cannulaBack = ss(ins.t0 + 10, ins.t0 + 13, tau); // 0..1 → 0..10 mm

  // foot switch: blue pedal taps at freeze start and at the stop of a manual freeze; held = nothing here
  const tap = (t) => Math.max(0, 1 - Math.abs(tau - t) / 0.6);
  const bluePedal = Math.max(tap(fz.t0 - 0.3), tap(PHASES[4].t0 - 0.2), tap(PHASES[3].t0 - 0.2));

  // warnings
  const warn = [];
  if (cylinder > 68) warn.push('Presión del cilindro demasiado alta');
  if ((freezeOn && u > 3) && flow < 5) warn.push('Flujo bajo: sonda posiblemente bloqueada');
  if (freezeOn && skinGap < 2) warn.push('Hielo cerca de la piel');

  return {
    tau, ph, u, P,
    cylinder, flow, probeP, exhaustOpen,
    freezeOn, freezeClock, thawClock,
    tip, rp, R0, A0, r20, r40, grow, stuck, wallT,
    dNerve, nerveDepth, nerveR, nerveInIce, nerveIn20, skinGap,
    stim, cannulaIn, probeIn, cannulaBack, bluePedal,
    warn,
  };
}

// Tip temperature history for the chart (sampled once per probe type).
export function tipCurve(probe, n = 540) {
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = state((i / (n - 1)) * TOTAL, {probe}).tip;
  return out;
}

export const fmtClock = (s) => {
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${String(m).padStart(2, '0')}'${String(r).padStart(2, '0')}"`;
};
