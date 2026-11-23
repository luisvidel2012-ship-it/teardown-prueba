// The geometry: the C3 console on its cart with the gas cylinder, hoses and foot switch (mm, real dimensions from the
// IFU where given), the probe tip cut open (×14), and a knee tissue section with the ice ball (×12).
// update(s, opts) poses everything from the model state; nothing is keyframed.
import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {T_BODY} from './model.js';

export const ACCENT = '#1aa3d9';
const V = (x, y, z) => new THREE.Vector3(x, y, z);

const mat = (color, o = {}) => new THREE.MeshStandardMaterial({color, roughness: 0.55, metalness: 0.0, envMapIntensity: 0.6, ...o});
const metal = (color = '#c9ced4', o = {}) => mat(color, {metalness: 0.85, roughness: 0.32, ...o});

function stripeTex(c1, c2, n = 8) {
  const cv = document.createElement('canvas');
  cv.width = 64;
  cv.height = 8;
  const g = cv.getContext('2d');
  g.fillStyle = '#000000';
  g.fillRect(0, 0, 64, 8);
  void c1;
  g.fillStyle = c2;
  for (let i = 0; i < n / 4; i++) g.fillRect(i * 32 + 4, 0, 14, 8);
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// A hose whose stripes travel with the gas.
function hose(points, radius, color, flowColor) {
  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
  const len = curve.getLength();
  const tex = stripeTex(color, flowColor);
  tex.repeat.set(len / 60, 1);
  const m = mat(color, {roughness: 0.6, emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0, emissiveMap: tex});
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, Math.max(40, Math.round(len / 12)), radius, 12, false), m);
  mesh.castShadow = true;
  mesh.userData = {tex, curve, len};
  return mesh;
}

// ----------------------------------------------------------------------------------- console screen
function makeScreen() {
  const cv = document.createElement('canvas');
  cv.width = 340;
  cv.height = 430;
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const g = cv.getContext('2d');
  const bar = (y, label, v, max, lo, hi, unit, txt) => {
    g.fillStyle = '#eef2f6';
    g.fillRect(18, y, 304, 62);
    g.strokeStyle = '#c4ccd6';
    g.strokeRect(18.5, y + 0.5, 303, 61);
    g.fillStyle = '#2d3742';
    g.font = '600 15px Inter, sans-serif';
    g.fillText(label, 28, y + 24);
    g.textAlign = 'right';
    g.fillText(txt ?? `${v.toFixed(0)} ${unit}`, 312, y + 24);
    g.textAlign = 'left';
    const x0 = 120;
    const w = 190;
    g.fillStyle = '#d64545';
    g.fillRect(x0, y + 40, w, 8);
    g.fillStyle = '#3aa655';
    g.fillRect(x0 + (lo / max) * w, y + 40, ((hi - lo) / max) * w, 8);
    g.fillStyle = '#1c2530';
    const px = x0 + Math.min(1, v / max) * w;
    g.fillRect(px - 1.5, y + 32, 3, 22);
  };
  const draw = (s) => {
    g.fillStyle = '#f7f9fb';
    g.fillRect(0, 0, 340, 430);
    g.fillStyle = '#dfe6ee';
    g.fillRect(0, 0, 340, 34);
    g.fillStyle = '#2d3742';
    g.font = '700 17px Inter, sans-serif';
    g.textAlign = 'center';
    const title = {check: 'Inicio de tratamiento', purge: 'Purga', insert: 'Localizador de nervios', motor: 'Localizador · Motor', sensory: 'Localizador · Sensorial', freeze: 'Congelación', thaw: 'Congelación', remove: 'Congelación'}[s.ph.id];
    g.fillText(title, 170, 23);
    // big readout
    g.fillStyle = '#e9eef4';
    g.fillRect(18, 46, 304, 150);
    g.fillStyle = '#1c2530';
    g.font = '700 46px "JetBrains Mono", monospace';
    let big = '';
    let sub = '';
    if (s.ph.id === 'motor' || s.ph.id === 'sensory') {
      big = `${s.stim.mA.toFixed(2)} mA`;
      sub = `${s.stim.hz} Hz · 200 µs`;
    } else if (s.ph.id === 'purge') {
      big = `${String(Math.floor(s.u)).padStart(2, '0')} s`;
      sub = 'Purga en curso…';
    } else if (s.ph.id === 'thaw') {
      big = `00'${String(Math.floor(s.thawClock)).padStart(2, '0')}"`;
      sub = 'Descongelando…';
    } else if (s.ph.id === 'freeze' || s.ph.id === 'remove') {
      const c = s.ph.id === 'freeze' ? s.freezeClock : s.thawClock;
      big = `${String(Math.floor(c / 60)).padStart(2, '0')}'${String(Math.floor(c % 60)).padStart(2, '0')}"`;
      sub = s.ph.id === 'freeze' ? 'Congelación iniciada' : '✓ Descongelación completa';
    } else {
      big = s.ph.id === 'check' ? 'OK' : '—';
      sub = s.ph.id === 'check' ? 'Sonda · Gas · Electrodo' : 'Listo';
    }
    g.fillText(big, 170, 128);
    g.font = '600 16px Inter, sans-serif';
    g.fillStyle = s.ph.id === 'freeze' ? ACCENT : '#4b5867';
    g.fillText(sub, 170, 172);
    g.textAlign = 'left';
    bar(214, 'Presión de gas', s.probeP, 70, 40, 60, 'bar');
    bar(290, 'Flujo de gas', s.flow, 20, 8, 15, 'l/min', `${s.flow.toFixed(1)} l/min`);
    // soft keys
    g.fillStyle = '#4b5867';
    g.font = '600 13px Inter, sans-serif';
    g.fillText(`Sonda ${s.P.d.toString().replace('.', ',')} mm ${s.P.tip}`, 22, 390);
    g.textAlign = 'right';
    g.fillText(`Cilindro ${s.cylinder.toFixed(0)} bar`, 318, 390);
    g.textAlign = 'left';
    if (s.stim.on) {
      g.fillStyle = '#e8c547';
      g.fillRect(18, 400, 304, 20);
      g.fillStyle = '#1c2530';
      g.font = '700 12px Inter, sans-serif';
      g.fillText('CONFIRMAR CORRIENTE', 110, 414);
    }
    tex.needsUpdate = true;
  };
  return {tex, draw};
}

// ----------------------------------------------------------------------------------- equipment
function buildEquipment(root, labels) {
  const g = new THREE.Group();
  root.add(g);
  const white = mat('#eef0f2', {roughness: 0.45});
  const blue = mat('#cbd9e8', {roughness: 0.45});
  const grey = mat('#9aa3ad');
  const dark = mat('#2b3138', {roughness: 0.5});

  // cart: 5-spoke base, column, shelf with drawers, handles
  const base = new THREE.Group();
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.3;
    const arm = new THREE.Mesh(new RoundedBoxGeometry(320, 34, 60, 3, 10), white);
    arm.position.set(Math.cos(a) * 160, 80, Math.sin(a) * 160);
    arm.rotation.y = -a;
    base.add(arm);
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(38, 38, 26, 24), dark);
    wheel.rotation.z = Math.PI / 2;
    wheel.rotation.y = -a;
    wheel.position.set(Math.cos(a) * 300, 38, Math.sin(a) * 300);
    base.add(wheel);
  }
  base.traverse((o) => (o.castShadow = true));
  g.add(base);
  const col = new THREE.Mesh(new RoundedBoxGeometry(110, 640, 110, 3, 14), white);
  col.position.set(0, 420, -20);
  g.add(col);
  const shelf = new THREE.Mesh(new RoundedBoxGeometry(400, 200, 300, 4, 16), white);
  shelf.position.set(0, 760, 0);
  g.add(shelf);
  for (const y of [720, 800]) {
    const dr = new THREE.Mesh(new RoundedBoxGeometry(370, 66, 6, 2, 3), mat('#f6f7f8'));
    dr.position.set(0, y, 151);
    g.add(dr);
    const pull = new THREE.Mesh(new RoundedBoxGeometry(120, 10, 10, 2, 4), grey);
    pull.position.set(0, y, 157);
    g.add(pull);
  }
  for (const sx of [-1, 1]) {
    const h = new THREE.Mesh(new THREE.TorusGeometry(70, 9, 10, 24, Math.PI), white);
    h.rotation.y = sx * Math.PI / 2;
    h.position.set(sx * 205, 860, 0);
    g.add(h);
  }

  // console 270 W × 400 H × 240 D, 7.5 kg (IFU table 9-2)
  const con = new THREE.Group();
  con.position.set(0, 860, -10);
  g.add(con);
  const body = new THREE.Mesh(new RoundedBoxGeometry(270, 400, 240, 5, 26), white);
  body.position.y = 200;
  con.add(body);
  const bezel = new THREE.Mesh(new RoundedBoxGeometry(236, 270, 10, 3, 14), blue);
  bezel.position.set(0, 248, 118);
  con.add(bezel);
  const scr = makeScreen();
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(150, 190), new THREE.MeshBasicMaterial({map: scr.tex, toneMapped: false}));
  screen.position.set(-24, 252, 123.6);
  con.add(screen);
  const keys = [];
  for (let i = 0; i < 6; i++) {
    const k = new THREE.Mesh(new THREE.CylinderGeometry(8, 8, 4, 20), mat('#dde4ec'));
    k.rotation.x = Math.PI / 2;
    k.position.set(78, 330 - i * 30, 124);
    con.add(k);
    keys.push(k);
  }
  const led = new THREE.Mesh(new THREE.SphereGeometry(4, 12, 8), mat('#3bd16f', {emissive: '#3bd16f', emissiveIntensity: 1.2}));
  led.position.set(88, 368, 124);
  con.add(led);
  const knobPanel = new THREE.Mesh(new RoundedBoxGeometry(236, 60, 10, 3, 12), blue);
  knobPanel.position.set(0, 76, 118);
  con.add(knobPanel);
  const knob = new THREE.Mesh(new THREE.CylinderGeometry(22, 24, 22, 32), dark);
  knob.rotation.x = Math.PI / 2;
  knob.position.set(0, 76, 130);
  con.add(knob);
  // probe connector panel (pneumatic + electric coupling) and neutral electrode socket, below the console face
  const plate = new THREE.Mesh(new RoundedBoxGeometry(236, 56, 10, 3, 12), mat('#e2e8ee'));
  plate.position.set(0, 22, 118);
  con.add(plate);
  const coupling = new THREE.Mesh(new THREE.CylinderGeometry(19, 19, 16, 28), metal());
  coupling.rotation.x = Math.PI / 2;
  coupling.position.set(30, 22, 128);
  con.add(coupling);
  const nsock = new THREE.Mesh(new THREE.CylinderGeometry(5, 5, 8, 14), dark);
  nsock.rotation.x = Math.PI / 2;
  nsock.position.set(-40, 22, 124);
  con.add(nsock);
  // rear: F2 power, F3 exhaust, F4 gas supply, F5 foot switch
  const rear = {};
  for (const [k, x, y, r, m] of [['power', -90, 60, 16, dark], ['exhaust', -45, 150, 12, metal()], ['supply', 45, 150, 12, metal('#d4b36a')], ['pedal', 95, 60, 10, dark]]) {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 18, 20), m);
    c.rotation.x = Math.PI / 2;
    c.position.set(x, y, -124);
    con.add(c);
    rear[k] = c;
  }
  con.traverse((o) => (o.castShadow = true));

  // gas cylinder (≤ 20 kg on the cart), siphon-free, upright
  const cyl = new THREE.Group();
  cyl.position.set(-250, 0, -200);
  g.add(cyl);
  const shell = new THREE.Mesh(new THREE.CylinderGeometry(78, 78, 820, 40), mat('#8f979f', {roughness: 0.38, metalness: 0.4}));
  shell.position.y = 470;
  const dome = new THREE.Mesh(new THREE.SphereGeometry(78, 40, 16, 0, Math.PI * 2, 0, Math.PI / 2), shell.material);
  dome.position.y = 880;
  const valve = new THREE.Mesh(new THREE.CylinderGeometry(18, 24, 80, 20), metal('#c7a65a'));
  valve.position.y = 990;
  const wheelV = new THREE.Mesh(new THREE.TorusGeometry(26, 5, 8, 24), dark);
  wheelV.rotation.x = Math.PI / 2;
  wheelV.position.y = 1030;
  const band = new THREE.Mesh(new THREE.CylinderGeometry(79, 79, 50, 40), mat('#3c5a7d'));
  band.position.y = 860;
  cyl.add(shell, dome, valve, wheelV, band);
  cyl.traverse((o) => (o.castShadow = true));
  for (const y of [520, 760]) {
    const strap = new THREE.Mesh(new THREE.TorusGeometry(84, 6, 8, 32), mat('#b8763e'));
    strap.rotation.x = Math.PI / 2;
    strap.position.set(-250, y, -200);
    g.add(strap);
  }

  // hoses: high pressure (0.9 m), exhaust (5 m, to ventilation), probe hose (2 m), foot switch cable
  const conRear = (o) => o.getWorldPosition(new THREE.Vector3());
  g.updateMatrixWorld(true);
  const sup = conRear(rear.supply);
  const exh = conRear(rear.exhaust);
  const ped = conRear(rear.pedal);
  const cpl = coupling.getWorldPosition(new THREE.Vector3());
  const hp = hose([V(-250, 1000, -200), V(-250, 1080, -205), V(-120, 1070, -240), V(sup.x, sup.y + 30, sup.z - 70), V(sup.x, sup.y, sup.z - 8)], 7, '#26313d', ACCENT);
  const ex = hose([V(exh.x, exh.y, exh.z - 8), V(exh.x, exh.y - 20, exh.z - 110), V(120, 800, -380), V(380, 300, -620), V(700, 18, -820), V(1100, 18, -950)], 11, '#8a96a3', '#d6e6f3');
  const handleEnd = V(470, 760, 420);
  const pr = hose([V(cpl.x, cpl.y, cpl.z + 8), V(cpl.x, cpl.y, cpl.z + 110), V(140, 760, 330), V(230, 520, 420), V(380, 560, 470), V(handleEnd.x - 40, handleEnd.y + 20, handleEnd.z)], 6, '#20262d', ACCENT);
  const fsw = V(-200, 0, 470);
  const pc = hose([V(ped.x, ped.y, ped.z - 8), V(ped.x, ped.y - 40, ped.z - 80), V(60, 420, -240), V(-120, 60, 60), V(fsw.x + 20, 14, fsw.z - 110)], 4, '#30363d', '#30363d');
  g.add(hp, ex, pr, pc);

  // probe in the equipment view: handle 140 mm + shaft 133 mm
  const probe = new THREE.Group();
  probe.position.copy(handleEnd);
  const dir = V(0.35, -0.75, 0.56).normalize();
  probe.quaternion.setFromUnitVectors(V(0, -1, 0), dir);
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(11, 9, 140, 24), dark);
  handle.position.y = -70;
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 133, 12), metal());
  shaft.position.y = -140 - 66;
  const eqTip = new THREE.Mesh(new THREE.SphereGeometry(6, 16, 12), mat('#ffffff', {transparent: true, opacity: 0, roughness: 0.9, emissive: ACCENT, emissiveIntensity: 0}));
  eqTip.position.y = -273;
  probe.add(handle, shaft, eqTip);
  probe.traverse((o) => (o.castShadow = true));
  g.add(probe);

  // foot switch: 2 pedals (black = menus, blue = start/stop) and a push button (current direction)
  const fs = new THREE.Group();
  fs.position.copy(fsw);
  fs.rotation.y = 0.25;
  const fbase = new THREE.Mesh(new RoundedBoxGeometry(340, 46, 210, 4, 16), mat('#d9dee3'));
  fbase.position.y = 23;
  const black = new THREE.Mesh(new RoundedBoxGeometry(120, 22, 150, 3, 8), dark);
  black.position.set(-90, 52, 10);
  const bluePed = new THREE.Mesh(new RoundedBoxGeometry(120, 22, 150, 3, 8), mat('#2f7fd6'));
  bluePed.position.set(90, 52, 10);
  const btn = new THREE.Mesh(new THREE.CylinderGeometry(16, 16, 14, 20), dark);
  btn.position.set(0, 52, -40);
  fs.add(fbase, black, bluePed, btn);
  fs.traverse((o) => (o.castShadow = true));
  g.add(fs);

  // floor
  const floor = new THREE.Mesh(new THREE.CircleGeometry(2600, 64), new THREE.ShadowMaterial({opacity: 0.16, polygonOffset: true, polygonOffsetFactor: -1}));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  g.add(floor);

  const wp = (o, off = V(0, 0, 0)) => () => o.localToWorld(off.clone());
  labels.push(
    {view: ['equipo', 'consola'], at: wp(screen, V(0, 60, 0)), text: 'Pantalla · menús de tratamiento'},
    {view: ['consola'], at: wp(keys[0]), text: 'Teclas de función B1–B6'},
    {view: ['equipo', 'consola'], at: wp(knob), text: 'Interruptor rotativo «Control»'},
    {view: ['consola'], at: wp(coupling), text: 'Acople de sonda: gas + eléctrico'},
    {view: ['consola'], at: wp(nsock), text: 'Electrodo neutro'},
    {view: ['equipo', 'trasera'], at: wp(valve), text: 'Cilindro CO₂ / N₂O sin sifón · 40–60 bar', side: 'up'},
    {view: ['trasera'], at: wp(rear.supply), text: 'F4 Suministro de gas', side: 'up', dx: -110},
    {view: ['trasera'], at: wp(rear.exhaust), text: 'F3 Escape → ventilación', side: 'up', dx: 120},
    {view: ['trasera'], at: wp(rear.pedal), text: 'F5 Pedal', side: 'down', dx: -60},
    {view: ['trasera'], at: wp(rear.power), text: 'F2 Interruptor principal', side: 'down', dx: 90},
    {view: ['equipo'], at: () => ex.userData.curve.getPoint(0.7), text: 'Manguera de escape 5 m', side: 'up'},
    {view: ['equipo'], at: wp(handle), text: 'CryoProbe · mango 140 mm · manguera 2 m', side: 'down'},
    {view: ['equipo', 'pedal'], at: wp(bluePed, V(0, 12, 0)), text: 'Pedal azul: iniciar / detener'},
    {view: ['pedal'], at: wp(black, V(0, 12, 0)), text: 'Pedal negro: cambiar de menú'},
    {view: ['pedal'], at: wp(btn, V(0, 8, 0)), text: 'Botón: subir / bajar corriente'},
  );

  return {
    update(s, clock) {
      scr.draw(s);
      const ff = s.flow / s.P.flowOpt;
      for (const [h, on, speed] of [[hp, s.probeP > 1, ff], [pr, s.probeP > 1, ff], [ex, s.exhaustOpen && s.flow > 0.5, ff * 1.6]]) {
        h.userData.tex.offset.x = -clock.gas * (h === ex ? 1.1 : 0.6);
        h.material.emissiveIntensity = on ? 0.55 : 0;
        void speed;
      }
      led.material.emissiveIntensity = 1.2;
      const cold = Math.max(0, Math.min(1, -s.tip / 40));
      eqTip.material.opacity = cold * 0.85;
      eqTip.material.emissiveIntensity = cold * 0.5;
      eqTip.scale.setScalar(0.4 + 0.9 * cold);
      bluePed.position.y = 52 - 10 * s.bluePedal;
      bluePed.rotation.x = 0.06 * s.bluePedal;
      knob.rotation.y = s.stim.mA * 0.8;
      for (let i = 0; i < keys.length; i++) keys[i].material.emissiveIntensity = 0;
    },
  };
}

// ----------------------------------------------------------------------------------- probe cutaway (×14)
export const SP_POS = V(5200, 900, 0);
export const SP_S = 30;
function buildProbeCut(root, labels) {
  const g = new THREE.Group();
  g.position.copy(SP_POS);
  g.scale.setScalar(SP_S);
  root.add(g);
  const clip = [new THREE.Plane(V(0, 0, -1), SP_POS.z + 0.001)]; // keep z <= 0 half
  const parts = new THREE.Group();
  g.add(parts);
  const L = 24;
  const mk = (geo, m) => {
    const o = new THREE.Mesh(geo, m);
    parts.add(o);
    return o;
  };
  const shaftM = metal('#c3cad1', {side: THREE.DoubleSide, clippingPlanes: clip, roughness: 0.4});
  const tipM = metal('#d9dee3', {side: THREE.DoubleSide, clippingPlanes: clip, roughness: 0.35, emissive: new THREE.Color('#ffd34d'), emissiveIntensity: 0});
  const capM = metal('#9ba6b1', {side: THREE.DoubleSide, clippingPlanes: clip});
  const insM = mat('#f4f4f0', {side: THREE.DoubleSide, clippingPlanes: clip, roughness: 0.7});
  const meshes = {};
  const frostM = new THREE.MeshStandardMaterial({color: '#ffffff', roughness: 1, transparent: true, opacity: 0, depthWrite: false, clippingPlanes: clip, side: THREE.DoubleSide});
  const iceM = new THREE.MeshStandardMaterial({color: '#cfeefc', roughness: 0.15, metalness: 0, transparent: true, opacity: 0.32, depthWrite: false, clippingPlanes: clip, side: THREE.DoubleSide, envMapIntensity: 1});
  const ice = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), iceM);
  ice.rotation.z = Math.PI / 2;
  ice.renderOrder = 3;
  g.add(ice);

  // tissue backdrop for scale
  const back = new THREE.Mesh(new THREE.PlaneGeometry(36, 16), mat('#f3e2c6', {roughness: 0.9}));
  back.position.set(-9, 0, -7);
  g.add(back);

  let built = null;
  const build = (P) => {
    if (built === P.d) return;
    built = P.d;
    parts.clear();
    const rp = P.d / 2;
    const wall = P.d > 2 ? 0.16 : 0.12;
    const rc = P.d > 2 ? 0.28 : 0.2; // capillary outer radius (illustrative)
    const xo = -3.2; // JT orifice
    const tipLen = 3.6; // active (uninsulated) tip
    // outer shaft: lathe profile from x=-L to the tip, blunt dome or sharp bevel
    const prof = [];
    prof.push(new THREE.Vector2(rp, -L));
    prof.push(new THREE.Vector2(rp, -rp));
    if (P.tip === 'roma') for (let i = 1; i <= 10; i++) prof.push(new THREE.Vector2(rp * Math.cos((i / 10) * Math.PI / 2), -rp + rp * Math.sin((i / 10) * Math.PI / 2)));
    else prof.push(new THREE.Vector2(0.05, 1.6 * rp));
    const tipStart = -tipLen;
    // split visually: insulated shaft + active tip by two meshes with different materials via groups
    meshes.shaft = mk(new THREE.CylinderGeometry(rp, rp, L - tipLen - 0.6, 48, 1, true).rotateZ(Math.PI / 2).translate(-(L + tipLen + 0.6) / 2, 0, 0), shaftM);
    meshes.ins = mk(new THREE.CylinderGeometry(rp + 0.03, rp + 0.03, 0.6, 48, 1, true).rotateZ(Math.PI / 2).translate(tipStart - 0.3, 0, 0), insM);
    const tipProf = prof.filter((p) => p.y >= tipStart);
    tipProf.unshift(new THREE.Vector2(rp, tipStart));
    meshes.tip = mk(new THREE.LatheGeometry(tipProf, 48).rotateZ(-Math.PI / 2), tipM);
    // capillary (high-pressure supply) and the orifice
    meshes.cap = mk(new THREE.CylinderGeometry(rc, rc, L + xo, 24, 1, true).rotateZ(Math.PI / 2).translate((-L + xo) / 2, 0, 0), capM);
    meshes.orifice = mk(new THREE.TorusGeometry(rc * 0.75, rc * 0.28, 10, 28).rotateY(Math.PI / 2).translate(xo, 0, 0), metal('#6d7782', {clippingPlanes: clip}));
    // inner wall shading for the cut faces
    meshes.innerShaft = mk(new THREE.CylinderGeometry(rp - wall, rp - wall, L - 0.3, 48, 1, true).rotateZ(Math.PI / 2).translate(-(L + 0.3) / 2, 0, 0), mat('#8f9aa5', {side: THREE.BackSide, clippingPlanes: clip}));
    const frost = new THREE.Mesh(new THREE.LatheGeometry(prof.filter((p) => p.y > -6).map((p) => new THREE.Vector2(p.x + 0.12, p.y)), 48).rotateZ(-Math.PI / 2), frostM);
    parts.add(frost);
    meshes.frost = frost;
    meshes.geo = {rp, wall, rc, xo, tipLen};
  };

  // gas particles: supply → orifice → expansion → return annulus → exhaust
  const N = 900;
  const pm = new THREE.MeshBasicMaterial({vertexColors: false, clippingPlanes: clip, toneMapped: false});
  const parts3 = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), pm, N);
  parts3.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(N * 3), 3);
  parts3.frustumCulled = false;
  g.add(parts3);
  const seed = new Float32Array(N * 3);
  let h = 12345;
  const rnd = () => ((h = (h * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  for (let i = 0; i < N * 3; i++) seed[i] = rnd();
  const M = new THREE.Matrix4();
  const Q = new THREE.Quaternion();
  const C = new THREE.Color();
  const cSup = new THREE.Color('#1f4fd1');
  const cExp = new THREE.Color('#e9fbff');
  const cRet = new THREE.Color('#78c7ea');
  const cHot = new THREE.Color('#ef8a3a');

  // stimulation pulse shells
  const pulseM = new THREE.MeshBasicMaterial({color: '#ffcf33', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, clippingPlanes: clip});
  const pulse = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), pulseM);
  g.add(pulse);

  const lp = (x, y, z) => () => g.localToWorld(V(x, y, z));
  labels.push(
    {view: ['sonda'], at: lp(-10, 0, 0), text: 'Capilar de alta presión (40–60 bar)', side: 'up', dx: -40},
    {view: ['sonda'], at: () => g.localToWorld(V(meshes.geo.xo, 0, 0)), text: 'Orificio Joule–Thomson', side: 'up', dx: -90},
    {view: ['sonda'], at: lp(-1.4, 0, 0), text: 'Cámara de expansión → ≈ −60 °C', side: 'down', dx: 40},
    {view: ['sonda'], at: () => g.localToWorld(V(-8, -(meshes.geo.rp - meshes.geo.wall) * 0.75, 0)), text: 'Retorno del gas → escape', side: 'down', dx: -40},
    {view: ['sonda'], at: () => g.localToWorld(V(-meshes.geo.tipLen - 0.3, meshes.geo.rp, 0)), text: 'Aislamiento · la estimulación sale solo por la punta', side: 'up'},
  );

  return {
    update(s, clock, show) {
      build(s.P);
      const {rp, wall, rc, xo} = meshes.geo;
      const ri = rp - wall;
      const flowK = s.flow / s.P.flowOpt;
      const thaw = s.ph.id === 'thaw' ? 1 - Math.min(1, Math.max(0, (s.u - 22) / 8)) : 0;
      const nOn = Math.round(N * Math.min(1, Math.max(flowK, thaw)));
      for (let i = 0; i < N; i++) {
        const a = seed[i * 3];
        const b = seed[i * 3 + 1];
        const c = seed[i * 3 + 2];
        let x;
        let y;
        let z;
        let r = 0.035;
        if (i >= nOn || !show) {
          M.makeScale(0, 0, 0);
          parts3.setMatrixAt(i, M);
          continue;
        }
        if (thaw > 0 && flowK < 0.05) {
          // exhaust closed: the probe fills to supply pressure, gas sits still on both sides of the orifice
          const inCap = a < 0.35;
          x = inCap ? -L + (L + xo) * b + Math.sin(clock.real * 3 + i) * 0.05 : xo + (-xo - 0.25) * b;
          const rr = inCap ? rc * 0.7 * Math.sqrt(c) : ri * 0.9 * Math.sqrt(c);
          const th = a * 40 + clock.real * 0.6;
          y = rr * Math.cos(th);
          z = -Math.abs(rr * Math.sin(th));
          C.copy(cHot);
          r = 0.04;
        } else {
          const s1 = (a + clock.gas * 0.22) % 1;
          const th = c * Math.PI * 2;
          if (s1 < 0.5) {
            const k = s1 / 0.5;
            x = -L + (L + xo) * k;
            const rr = rc * 0.65 * Math.sqrt(b);
            y = rr * Math.cos(th);
            z = -Math.abs(rr * Math.sin(th));
            C.copy(cSup);
            r = 0.03;
          } else if (s1 < 0.62) {
            const k = (s1 - 0.5) / 0.12;
            x = xo + (-xo - 0.3) * Math.pow(k, 0.7);
            const rr = Math.min(ri * 0.95, rc * 0.5 + ri * Math.pow(k, 0.6) * Math.sqrt(b));
            y = rr * Math.cos(th);
            z = -Math.abs(rr * Math.sin(th));
            C.copy(cSup).lerp(cExp, Math.min(1, k * 1.6));
            r = 0.03 + 0.03 * k;
          } else {
            const k = (s1 - 0.62) / 0.38;
            x = -0.4 - (L - 0.4) * k;
            const rr = rc + 0.03 + (ri - rc - 0.06) * b;
            y = rr * Math.cos(th);
            z = -Math.abs(rr * Math.sin(th));
            C.copy(cExp).lerp(cRet, Math.min(1, k * 2));
            r = 0.05;
          }
          if (s.ph.id === 'purge') C.lerp(new THREE.Color('#9fb3c8'), 0.35);
        }
        M.compose(V(x, y, z), Q, V(r, r, r));
        parts3.setMatrixAt(i, M);
        parts3.setColorAt(i, C);
      }
      parts3.instanceMatrix.needsUpdate = true;
      parts3.instanceColor.needsUpdate = true;

      const cold = Math.max(0, Math.min(1, -s.tip / 50));
      frostM.opacity = 0.75 * cold;
      // ice in contact with the tip (same R0/A0 as the tissue view)
      const show3 = s.R0 > rp * 1.03 && s.probeIn > 0.9;
      ice.visible = show3;
      ice.scale.set(s.R0, Math.max(s.A0, s.R0), s.R0);
      ice.position.set(-Math.max(s.A0, s.R0) * 0.55, 0, 0);
      back.visible = s.probeIn > 0.9;
      // stimulation: current leaves through the active tip only
      if (s.stim.on) {
        const f = s.stim.hz === 2 ? (clock.real * 2) % 1 : (clock.real * 6) % 1;
        pulse.visible = true;
        pulse.scale.setScalar(rp + 2.5 * f);
        pulse.position.set(-1.2, 0, 0);
        pulseM.opacity = 0.35 * (1 - f) * Math.min(1, s.stim.mA / 0.4);
        tipM.emissiveIntensity = 0.5;
      } else {
        pulse.visible = false;
        tipM.emissiveIntensity = 0;
      }
    },
  };
}

// ----------------------------------------------------------------------------------- tissue section (×12)
export const TS_POS = V(-5200, 900, 0);
export const TS_S = 12;
const THERM_VS = `
varying vec3 vP;
void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;
// Same profile as model.js: log in the ice from the wall (wallT) to 0 °C at R0, decaying to body temperature outside.
const THERM_FS = `
uniform vec3 uC; uniform vec3 uD; uniform float uR0; uniform float uA0; uniform float uRp; uniform float uWall; uniform float uTb; uniform float uOn;
varying vec3 vP;
vec3 ramp(float T){
  vec3 c1 = vec3(0.07,0.16,0.55), c2 = vec3(0.10,0.55,0.90), c3 = vec3(0.70,0.93,1.0), c4 = vec3(1.0);
  if (T < -40.0) return mix(c1,c2, clamp((T+60.0)/20.0,0.0,1.0));
  if (T < -20.0) return mix(c2,c3, (T+40.0)/20.0);
  return mix(c3,c4, clamp((T+20.0)/20.0,0.0,1.0));
}
void main(){
  vec3 q = vP - uC;
  float a = dot(q,uD);
  float b = length(q - a*uD);
  float A = max(uA0, uR0);
  float re = uR0 * sqrt((a/A)*(a/A) + (b/uR0)*(b/uR0));
  float T;
  if (re <= uRp) T = uWall;
  else if (re < uR0) T = uWall + (0.0-uWall) * log(re/uRp) / max(log(uR0/uRp), 1e-3);
  else T = uTb - uTb * exp(-(re-uR0)/1.6);
  if (uR0 <= uRp*1.03) T = uTb;
  float alpha = clamp((uTb - T)/ (uTb + 10.0), 0.0, 1.0);
  alpha = T <= 0.0 ? 0.9 : alpha * 0.55;
  vec3 col = T <= 0.0 ? ramp(T) : mix(vec3(0.75,0.92,1.0), vec3(1.0), clamp(T/uTb,0.0,1.0));
  // isotherms -40, -20, 0
  float w = fwidth(T) * 1.2;
  float line = 0.0;
  for (int i=0;i<3;i++){ float L = -40.0 + 20.0*float(i); line = max(line, 1.0 - smoothstep(0.0, w, abs(T - L))); }
  col = mix(col, vec3(0.03,0.08,0.2), line*0.9*step(T, 1.0));
  gl_FragColor = vec4(col, max(alpha, line*0.9*step(T,1.0)) * uOn);
}`;

function buildTissue(root, labels) {
  const g = new THREE.Group();
  g.position.copy(TS_POS);
  g.scale.setScalar(TS_S);
  root.add(g);
  const X0 = -32;
  const X1 = 30;
  const Z0 = -22;
  const layer = (y0, y1, color, o = {}) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(X1 - X0, y1 - y0, -Z0), mat(color, {roughness: 0.85, ...o}));
    m.position.set((X0 + X1) / 2, (y0 + y1) / 2, Z0 / 2);
    g.add(m);
    return m;
  };
  const skin = layer(-2, 0, '#d79c86');
  const fat = layer(-15, -2, '#f0d48c');
  const fascia = layer(-16.2, -15, '#cdb8a2');
  const bone = layer(-26, -16.2, '#ece2ca', {roughness: 0.95});
  // dermis line accent
  const dermis = new THREE.Mesh(new THREE.BoxGeometry(X1 - X0, 0.25, 0.05), mat('#b97764'));
  dermis.position.set((X0 + X1) / 2, -2, 0.03);
  g.add(dermis);

  // nerve: infrapatellar branch of the saphenous nerve, running across the section (along z)
  const NX = 4;
  const nerveM = mat('#f6e6a4', {roughness: 0.5, emissive: new THREE.Color('#ffc21a'), emissiveIntensity: 0});
  const nerve = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, -Z0 + 0.1, 32).rotateX(Math.PI / 2), nerveM);
  nerve.position.set(NX, -9, Z0 / 2 + 0.04);
  g.add(nerve);
  // fascicles on the cut face
  for (const [fx, fy] of [[-0.35, 0.3], [0.35, 0.25], [0, -0.35], [-0.4, -0.25], [0.42, -0.3]]) {
    const f = new THREE.Mesh(new THREE.CircleGeometry(0.22, 18), mat('#e5c662'));
    f.position.set(NX + fx, -9 + fy, 0.07);
    g.add(f);
  }
  const nOut = new THREE.Mesh(new THREE.RingGeometry(0.93, 1.07, 48), new THREE.MeshBasicMaterial({color: '#b8860b', transparent: true, depthWrite: false}));
  nOut.position.set(NX, -9, 0.14);
  nOut.renderOrder = 7;
  g.add(nOut);
  // a genicular artery deeper, as a heat sink to avoid
  const art = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, -Z0, 24).rotateX(Math.PI / 2), mat('#c0392b', {roughness: 0.4}));
  art.position.set(16, -14, Z0 / 2);
  g.add(art);

  // warm pad on the skin + hydrodissection pocket under the dermis
  const pad = new THREE.Mesh(new RoundedBoxGeometry(22, 2.2, 18, 2, 0.8), mat('#f08a4b', {roughness: 0.8}));
  pad.position.set(4, 1.1, -9);
  g.add(pad);
  const hydro = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), new THREE.MeshStandardMaterial({color: '#7cc3ea', transparent: true, opacity: 0.35, roughness: 0.2, depthWrite: false}));
  hydro.scale.set(8, 1.4, 7);
  hydro.position.set(4, -4.2, -3);
  g.add(hydro);

  // entry, final tip position and direction
  const entry = V(X0 + 4, 0, 0);
  const finalTip = (s) => V(NX - 1 - 0.45, -9, 0);
  const dirFor = (s) => finalTip(s).clone().sub(entry).normalize();

  const clip = [new THREE.Plane(V(0, 0, -1), TS_POS.z + 0.001)];
  const probeM = metal('#cdd3d9', {emissive: new THREE.Color('#ffd34d'), emissiveIntensity: 0});
  const probe = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 32, 1, false), probeM);
  g.add(probe);
  const tipCap = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12), probeM);
  g.add(tipCap);
  const ringTex = (() => {
    const cv = document.createElement('canvas');
    cv.width = 4;
    cv.height = 64;
    const c = cv.getContext('2d');
    c.fillStyle = '#e6eaee';
    c.fillRect(0, 0, 4, 64);
    c.fillStyle = '#2a2f35';
    c.fillRect(0, 58, 4, 6);
    const t = new THREE.CanvasTexture(cv);
    t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })();
  const canM = new THREE.MeshStandardMaterial({color: '#ffffff', map: ringTex, roughness: 0.35, metalness: 0.5, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false});
  const cannula = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 32, 1, true), canM);
  g.add(cannula);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 24), mat('#3a78c2'));
  g.add(hub);
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(1, 0.85, 1, 24), mat('#2b3138'));
  g.add(handle);

  // ice ball: 3D shell behind the cut, plus the thermal map on the cut face
  const iceM = new THREE.MeshStandardMaterial({color: '#e4f6ff', roughness: 0.1, transparent: true, opacity: 0.6, depthWrite: false, envMapIntensity: 1.2});
  const ice = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), iceM);
  ice.renderOrder = 4;
  g.add(ice);
  const uni = {uC: {value: V(0, 0, 0)}, uD: {value: V(1, 0, 0)}, uR0: {value: 1}, uA0: {value: 1}, uRp: {value: 0.65}, uWall: {value: 0}, uTb: {value: T_BODY}, uOn: {value: 1}};
  const therm = new THREE.Mesh(
    new THREE.PlaneGeometry(X1 - X0, 26, 1, 1),
    new THREE.ShaderMaterial({uniforms: uni, vertexShader: THERM_VS, fragmentShader: THERM_FS, transparent: true, depthWrite: false}),
  );
  therm.geometry.translate((X0 + X1) / 2, -13, 0);
  therm.position.z = 0.09;
  therm.renderOrder = 5;
  g.add(therm);
  // stimulation field ring on the cut face
  const ringM = new THREE.MeshBasicMaterial({color: '#ffcf33', transparent: true, opacity: 0, depthWrite: false});
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 48), ringM);
  ring.renderOrder = 6;
  g.add(ring);

  const Y = V(0, 1, 0);
  const placeCyl = (m, a, b, r) => {
    const d = b.clone().sub(a);
    const len = Math.max(1e-3, d.length());
    m.position.copy(a).add(b).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(Y, d.normalize());
    m.scale.set(r, len, r);
  };
  const cur = {tip: V(), center: V(), dir: V(1, 0, 0)};
  const lp = (x, y, z) => () => g.localToWorld(V(x, y, z));
  labels.push(
    {view: ['tejido'], at: lp(NX + 1, -9, 0.1), text: 'Rama infrapatelar del safeno (IPBSN)', side: 'down'},
    {view: ['tejido'], at: lp(X0 + 2, -1, 0), text: 'Piel', side: 'up'},
    {view: ['tejido'], at: lp(X0 + 8, -12.5, 0), text: 'Tejido subcutáneo', side: 'down'},
    {view: ['tejido'], at: lp(10, 2.2, -6), text: 'Almohadilla térmica', side: 'up'},
    {view: ['tejido'], at: lp(-1, -3.6, 0), text: 'Hidrodisección (suero)', side: 'up'},
    {view: ['tejido'], at: lp(16, -14, 0), text: 'Arteria genicular: disipa frío', side: 'down'},
    {view: ['tejido'], at: lp(-10, -21, 0), text: 'Hueso (tibia)', side: 'down'},
    {view: ['tejido'], at: () => g.localToWorld(cur.tip.clone().addScaledVector(cur.dir, -14)), text: 'Cánula · anillo cada 10 mm', side: 'down', when: (s) => s.P.needsCannula && s.cannulaIn > 0.5},
  );

  return {
    nerveWorld: () => g.localToWorld(V(NX, -9, 0)),
    update(s, clock, opt) {
      const rp = s.P.d / 2;
      const dir = dirFor(s);
      const fT = finalTip(s);
      const L = fT.distanceTo(entry);
      // tip pulled back along the track while the nerve is still far, then advanced during the sensory search
      const back = (s.dNerve - 0.45) * 1.04;
      const inLen = Math.max(0, L * s.probeIn - back);
      const tip = entry.clone().addScaledVector(dir, inLen);
      const out = entry.clone().addScaledVector(dir, -26);
      const shown = s.probeIn > 0.001;
      probe.visible = tipCap.visible = handle.visible = shown;
      if (shown) {
        placeCyl(probe, out, tip, rp);
        tipCap.position.copy(tip);
        tipCap.scale.setScalar(rp);
        placeCyl(handle, entry.clone().addScaledVector(dir, -48), entry.clone().addScaledVector(dir, -30), 4);
      }
      // cannula 15G/12G: inserted to the target first, then pulled back 10 mm (one ring)
      const canOn = s.P.needsCannula && s.cannulaIn > 0.001;
      cannula.visible = hub.visible = canOn;
      if (canOn) {
        const canTipLen = L * s.cannulaIn - 3.9 - 10 * s.cannulaBack;
        const cTip = entry.clone().addScaledVector(dir, Math.max(0.1, canTipLen));
        const cOut = entry.clone().addScaledVector(dir, -24);
        placeCyl(cannula, cOut, cTip, s.P.cannulaOD / 2);
        const len = cOut.distanceTo(cTip);
        // rings every 10 mm counted from the cannula tip (texture v runs along the cylinder, v = 1 at the tip end)
        ringTex.repeat.set(1, len / 10);
        ringTex.offset.set(0, -(len / 10) % 1);
        placeCyl(hub, entry.clone().addScaledVector(dir, -30), entry.clone().addScaledVector(dir, -24), 2.2);
      }
      pad.visible = s.tau > 1 && s.ph.id !== 'check' && s.ph.id !== 'purge';
      hydro.visible = pad.visible;

      // ice
      const A = Math.max(s.A0, s.R0);
      const center = tip.clone().addScaledVector(dir, -Math.min(A * 0.55, 2.4));
      cur.tip.copy(tip);
      cur.center.copy(center);
      cur.dir.copy(dir);
      ice.visible = !opt.thermal && s.R0 > rp * 1.03;
      ice.position.copy(center);
      ice.quaternion.setFromUnitVectors(V(1, 0, 0), dir);
      ice.scale.set(A, s.R0, s.R0);
      uni.uC.value.copy(center);
      uni.uD.value.copy(dir);
      uni.uR0.value = s.R0;
      uni.uA0.value = A;
      uni.uRp.value = rp;
      uni.uWall.value = s.wallT;
      uni.uOn.value = opt.thermal ? 1 : 0;
      therm.visible = opt.thermal && s.R0 > rp * 1.03;

      // stimulation
      if (s.stim.on) {
        const f = s.stim.hz === 2 ? (clock.real * 2) % 1 : (clock.real * 5) % 1;
        const reach = 0.8 + Math.sqrt(Math.max(0, (s.stim.mA - 0.18) / 0.55)); // the distance this current excites
        ring.visible = true;
        ring.position.set(tip.x, tip.y, 0.12);
        ring.scale.setScalar(reach * (0.35 + 0.65 * f));
        ringM.opacity = 0.75 * (1 - f);
        probeM.emissiveIntensity = 0.35;
      } else {
        ring.visible = false;
        probeM.emissiveIntensity = 0;
      }
      nerveM.emissiveIntensity = s.stim.response ? 0.55 + 0.25 * Math.sin(clock.real * 30) : s.nerveInIce ? 0 : 0;
      nerveM.color.set(s.nerveInIce ? '#cfe6f5' : '#f6e6a4');
    },
    probeTip: () => g.localToWorld(cur.tip.clone()),
    iceTop: () => g.localToWorld(cur.center.clone().add(V(0, 0, 0))),
  };
}

// ----------------------------------------------------------------------------------- stage
export function createScene(canvas) {
  const renderer = new THREE.WebGLRenderer({canvas, antialias: true, powerPreference: 'high-performance'});
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.localClippingEnabled = true;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#eef1f4');
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  const camera = new THREE.PerspectiveCamera(32, 16 / 9, 2, 40000);

  scene.add(new THREE.HemisphereLight('#ffffff', '#c8ccd2', 0.9));
  const sun = new THREE.DirectionalLight('#ffffff', 1.6);
  sun.position.set(900, 2600, 1400);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, {left: -1400, right: 1400, top: 1600, bottom: -600, near: 100, far: 6000});
  sun.shadow.bias = -0.0004;
  scene.add(sun);
  const fill = new THREE.DirectionalLight('#dbe8ff', 0.7);
  fill.position.set(-2000, 800, 2400);
  scene.add(fill);

  const labels = [];
  const eq = buildEquipment(scene, labels);
  const pc = buildProbeCut(scene, labels);
  const ts = buildTissue(scene, labels);

  const v = new THREE.Vector3();
  const st = {
    renderer, scene, camera, labels,
    resize(w, h, pr) {
      renderer.setPixelRatio(pr);
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      st.w = w;
      st.h = h;
    },
    project(p) {
      v.copy(p).project(camera);
      return {x: (v.x * 0.5 + 0.5) * st.w, y: (-v.y * 0.5 + 0.5) * st.h, ok: v.z < 1 && Math.abs(v.x) < 1.2 && Math.abs(v.y) < 1.2};
    },
    frame(s, cam, clock, opt) {
      eq.update(s, clock);
      pc.update(s, clock, opt.view === 'sonda' || cam.near === 'sonda');
      ts.update(s, clock, opt);
      const {tx, ty, tz, az, el, d} = cam;
      camera.position.set(tx + d * Math.sin(az) * Math.cos(el), ty + d * Math.sin(el), tz + d * Math.cos(az) * Math.cos(el));
      camera.lookAt(tx, ty, tz);
      camera.near = Math.max(1, d / 50);
      camera.far = d * 30;
      camera.updateProjectionMatrix();
      renderer.render(scene, camera);
    },
  };
  return st;
}
