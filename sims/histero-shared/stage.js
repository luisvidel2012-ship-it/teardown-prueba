// The studio and the instrument. frame(state, cam) poses the model from the state and draws one frame.
import * as THREE from 'three';
import {L_TIP, LINK, LOOP_FWD, LOOP_R, PIVOT, pose, rOut, TRAVEL} from './model.js';

const V3 = THREE.Vector3;
export const COL = {bg: '#e6ecef', ink: '#1d2a30', accent: '#19a7b0'};

const mat = (c, o = {}) => new THREE.MeshStandardMaterial({color: c, metalness: 0.2, roughness: 0.5, envMapIntensity: 0.9, ...o});

// outline of a capsule ring (outer) with a hole, in the xy plane
function ringShape(w, h, iw, ih, cy = 0) {
  const caps = (sh, W, H, rev) => {
    const r = W / 2;
    const top = cy + H / 2 - r;
    const bot = cy - H / 2 + r;
    sh.moveTo(-r, top);
    sh.absarc(0, top, r, Math.PI, 0, true);
    sh.lineTo(r, bot);
    sh.absarc(0, bot, r, 0, Math.PI, true);
    sh.lineTo(-r, top);
    return sh;
  };
  const s = caps(new THREE.Shape(), w, h);
  s.holes.push(caps(new THREE.Path(), iw, ih));
  return s;
}

export function createStage({canvas}) {
  const renderer = new THREE.WebGLRenderer({canvas, antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance'});
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.localClippingEnabled = true;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(COL.bg);
  const camera = new THREE.PerspectiveCamera(24, 16 / 9, 0.02, 200);

  {
    const env = new THREE.Scene();
    env.background = new THREE.Color('#dfe7ea');
    const box = (w, h, pos, k) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({color: new THREE.Color(1, 1, 1).multiplyScalar(k), side: THREE.DoubleSide}));
      m.position.copy(pos);
      m.lookAt(0, 0, 0);
      env.add(m);
    };
    box(30, 30, new V3(0, 30, 6), 2.6);
    box(8, 30, new V3(-30, 8, 14), 3.2);
    box(8, 30, new V3(30, 8, -10), 2.2);
    box(40, 6, new V3(0, 4, 32), 1.7);
    const g = new THREE.Mesh(new THREE.CircleGeometry(90, 32), new THREE.MeshBasicMaterial({color: '#c8d3d8', side: THREE.DoubleSide}));
    g.rotation.x = -Math.PI / 2;
    g.position.y = -6;
    env.add(g);
    const pm = new THREE.PMREMGenerator(renderer);
    scene.environment = pm.fromScene(env, 0.02).texture;
    scene.environmentIntensity = 1.0;
    pm.dispose();
  }
  const sun = new THREE.DirectionalLight('#ffffff', 2.2);
  sun.position.set(-14, 34, 22);
  sun.castShadow = true;
  Object.assign(sun.shadow.camera, {left: -18, right: 18, top: 18, bottom: -18, near: 5, far: 90});
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.radius = 6;
  sun.shadow.bias = -0.0004;
  sun.target.position.set(5, 0, 0);
  scene.add(sun, sun.target, new THREE.HemisphereLight('#ffffff', '#c8d3d8', 0.7));
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(240, 240), new THREE.ShadowMaterial({color: '#4a6068', opacity: 0.22}));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -13;
  floor.receiveShadow = true;
  scene.add(floor);

  // ------------------------------------------------------------ materials
  const steel = mat('#cfd4d9', {metalness: 1, roughness: 0.34});
  const steelDark = mat('#9aa2a9', {metalness: 1, roughness: 0.42});
  const black = mat('#16181b', {roughness: 0.42, metalness: 0.15});
  const white = mat('#dcded8', {roughness: 0.6});
  const teal = mat(COL.accent, {roughness: 0.38});
  const green = mat('#2f9e62', {roughness: 0.4});
  const lensMat = mat('#16324a', {roughness: 0.15, metalness: 0.6});
  const clip = new THREE.Plane(new V3(0, 0, -1), 1000); // keeps z <= constant... moved to 0 for the section
  const shellMat = mat('#cfd4d9', {metalness: 1, roughness: 0.34, transparent: true, side: THREE.DoubleSide, clippingPlanes: [clip]});
  const hubMat = mat('#c3c9ce', {metalness: 1, roughness: 0.38, side: THREE.DoubleSide, clippingPlanes: [clip]});
  const tealClip = mat(COL.accent, {roughness: 0.38, side: THREE.DoubleSide, clippingPlanes: [clip]});
  const fluidMat = new THREE.MeshStandardMaterial({color: '#7fd3e6', transparent: true, opacity: 0, roughness: 0.2, depthWrite: false});

  const root = new THREE.Group();
  scene.add(root);
  const mesh = (geo, m, parent = root, shadow = true) => {
    const o = new THREE.Mesh(geo, m);
    o.castShadow = shadow;
    o.receiveShadow = true;
    parent.add(o);
    return o;
  };
  const cylX = (r, len, seg = 40, open = false) => new THREE.CylinderGeometry(r, r, len, seg, 1, open).rotateZ(-Math.PI / 2); // axis along x, centred
  const place = (o, x, y = 0, z = 0) => {
    o.position.set(x, y, z);
    return o;
  };

  // ------------------------------------------------------------ the handpiece (fixed)
  // eyepiece cup, tube, telescope barrel
  const cup = mesh(new THREE.LatheGeometry([[0.2, 0], [1.8, 0], [1.75, 0.35], [0.9, 1.4], [0.55, 1.4]].map(([r, x]) => new THREE.Vector2(r, x)), 48).rotateZ(-Math.PI / 2), black);
  place(cup, -9.6);
  place(mesh(cylX(0.55, 2.4), steel), -7.4);
  place(mesh(cylX(0.42, 6.2), steelDark), -4.6);
  // body block with the thumb ring under it
  place(mesh(new THREE.BoxGeometry(2.8, 2.4, 1.8), white), -4.7, -0.2, 0);
  const ring = mesh(new THREE.ExtrudeGeometry(ringShape(2.6, 3.8, 1.4, 2.4), {depth: 0.55, bevelEnabled: false, curveSegments: 20}), black);
  ring.position.set(-7.2, -3.4, -0.27);
  place(mesh(new THREE.BoxGeometry(1.6, 1.4, 0.55), black), -6.4, -1.3, 0);
  // light-post stub and the plug on the carriage
  place(mesh(new THREE.CylinderGeometry(0.45, 0.45, 2.2, 28), steel), -7.0, 1.4, 0);
  // hub, nose, ribs, blue ring
  place(mesh(cylX(1.15, 3.2, 48), hubMat), -1.8);
  for (const x of [-3.0, -2.5, -2.0]) place(mesh(new THREE.TorusGeometry(1.18, 0.06, 8, 48).rotateY(Math.PI / 2), steelDark), x);
  place(mesh(new THREE.CylinderGeometry(0.5, 1.15, 0.5, 40).rotateZ(Math.PI / 2), hubMat), -0.2);
  place(mesh(cylX(1.7, 0.45, 56), tealClip), 0.22);
  // stopcocks: stem, knob, lever that turns as the valve opens
  const makeCock = (dir, x) => {
    const g = new THREE.Group();
    g.position.set(x, dir * 1.1, 0);
    root.add(g);
    mesh(new THREE.CylinderGeometry(0.3, 0.3, 2.2, 24), steel, g).position.y = dir * 1.1;
    mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.55, 28), steelDark, g).position.y = dir * 2.4;
    mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.9, 20), black, g).position.y = dir * 2.9;
    const lever = new THREE.Group();
    lever.position.y = dir * 2.4;
    g.add(lever);
    const arm = mesh(new THREE.BoxGeometry(0.1, 0.1, 1.5), steel, lever);
    arm.position.set(0, 0, 0.7);
    mesh(new THREE.SphereGeometry(0.17, 14, 10), black, lever).position.set(0, 0, 1.45);
    return lever;
  };
  const leverIn = makeCock(1, -0.9);
  const leverOut = makeCock(-1, -0.3);

  // ------------------------------------------------------------ moving: grip lever, link rod, carriage
  const lever = new THREE.Group();
  lever.position.set(PIVOT[0], PIVOT[1], 1.2);
  root.add(lever);
  mesh(new THREE.ExtrudeGeometry(ringShape(2.6, 12.2, 1.2, 9.6, -4.7), {depth: 0.55, bevelEnabled: false, curveSegments: 24}), black, lever).position.z = -0.27;
  mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.9, 20).rotateX(Math.PI / 2), steel, lever);
  const rod = mesh(new THREE.CylinderGeometry(0.07, 0.07, 1, 12), steel);
  const carriage = new THREE.Group();
  root.add(carriage);
  mesh(new THREE.BoxGeometry(2.3, 1.15, 1.25), steel, carriage).position.set(-5.3, 1.9, 0);
  mesh(new THREE.CylinderGeometry(0.38, 0.38, 2.0, 24), black, carriage).position.set(-5.6, 3.2, 0);
  mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.7, 16).rotateX(Math.PI / 2), steelDark, carriage).position.set(-5.05, 1.5, 0.6);

  // ------------------------------------------------------------ the shaft (diameter follows Fr)
  const sheath = mesh(cylX(1, L_TIP, 56, true).translate(L_TIP / 2, 0, 0), shellMat);
  sheath.renderOrder = 3;
  const fluid = mesh(cylX(1, L_TIP, 40, true).translate(L_TIP / 2, 0, 0), fluidMat, root, false);
  fluid.renderOrder = 2;
  const tele = mesh(cylX(1, L_TIP - 0.05, 32).translate((L_TIP - 0.05) / 2, 0, 0), steelDark);
  const lens = mesh(new THREE.CylinderGeometry(1, 1, 0.04, 28).rotateZ(-Math.PI / 2), lensMat);
  const cap = mesh(cylX(1, 0.34, 40, true), black);
  cap.material = black.clone();
  cap.material.side = THREE.DoubleSide;
  const shaftGreen = mesh(new THREE.CylinderGeometry(1, 1, 1, 10).rotateZ(-Math.PI / 2), green);
  const loopMesh = mesh(new THREE.TorusGeometry(1, 0.2, 8, 28, Math.PI).rotateZ(-Math.PI / 2), steel);
  loopMesh.material = mat('#d9dde0', {metalness: 1, roughness: 0.25});
  // perforations near the tip: 4 rings of 6
  const HOLES = [];
  for (let r = 0; r < 4; r++) for (let k = 0; k < 6; k++) HOLES.push([15.7 + r * 0.55, ((k + (r % 2) * 0.5) / 6) * Math.PI * 2]);
  const holes = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), black, HOLES.length);
  root.add(holes);

  // ------------------------------------------------------------ fluid particles (inflow teal, outflow coral)
  const N = 420;
  const rnd = (i) => {
    const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  };
  const dot = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 32;
    const x = c.getContext('2d');
    const g = x.createRadialGradient(16, 16, 2, 16, 16, 15);
    g.addColorStop(0, '#fff');
    g.addColorStop(0.7, '#fff');
    g.addColorStop(1, '#000');
    x.fillStyle = g;
    x.fillRect(0, 0, 32, 32);
    return new THREE.CanvasTexture(c);
  })();
  const mkPoints = (color, size) => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    const p = new THREE.Points(geo, new THREE.PointsMaterial({color, size, sizeAttenuation: true, transparent: true, opacity: 0.95, depthWrite: false, alphaMap: dot, alphaTest: 0.3}));
    p.frustumCulled = false;
    p.renderOrder = 4;
    root.add(p);
    return p;
  };
  const pIn = mkPoints('#0aa7c9', 0.075);
  const pOut = mkPoints('#ef6a4c', 0.075);
  const IN_TOP = [-0.9, 3.4];
  const OUT_BOT = [-0.3, -3.4];
  const along = (s, a, b) => a + (b - a) * s;

  const warmFloor = {};
  void warmFloor;

  const size = {w: 1600, h: 900};
  const resize = (w, h, pr) => {
    size.w = w;
    size.h = h;
    renderer.setPixelRatio(pr);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  const tmp = new V3();
  const dummy = new THREE.Object3D();
  const yAxis = new V3(0, 1, 0);

  // st: {g, fr, glass, section, flow, phase, energy}; cam: {tx,ty,tz,az,el,d}
  const frame = (st, cam) => {
    const R = rOut(st.fr);
    const Ri = R - 0.022;
    const p = pose(st.g);
    // lever, link, carriage
    lever.rotation.z = p.phi;
    carriage.position.x = p.dx;
    const pin = new V3(p.link[0], p.link[1], 0.95);
    const pinC = new V3(-5.05 + p.dx, 1.5, 0.6);
    tmp.copy(pinC).sub(pin);
    rod.position.copy(pin).addScaledVector(tmp, 0.5);
    rod.scale.set(1, tmp.length(), 1);
    rod.quaternion.setFromUnitVectors(yAxis, tmp.clone().normalize());
    // shaft
    sheath.scale.set(1, R, R);
    shellMat.opacity = 1 - 0.86 * st.glass;
    shellMat.metalness = 1 - 0.6 * st.glass;
    shellMat.depthWrite = st.glass < 0.5;
    fluid.scale.set(1, Ri * 0.98, Ri * 0.98);
    fluidMat.opacity = 0.2 * st.glass * st.flow;
    fluid.visible = fluidMat.opacity > 0.002;
    const tr = 0.4 * R;
    tele.scale.set(1, tr, tr);
    tele.position.set(0, -0.2 * R, 0);
    lens.scale.set(1, tr * 0.98, tr * 0.98);
    lens.position.set(L_TIP - 0.05, -0.2 * R, 0);
    cap.scale.set(1, R * 1.012, R * 1.012);
    cap.position.set(L_TIP - 0.17, 0, 0);
    // electrode: green rod inside the sheath, loop at its distal end
    const yE = 0.62 * R;
    const xBase = p.loopApex - LOOP_R;
    shaftGreen.scale.set(xBase + 0.4, 0.028, 0.028);
    shaftGreen.position.set((xBase - 0.4) / 2, yE, 0);
    shaftGreen.scale.x = xBase + 0.4;
    loopMesh.scale.setScalar(LOOP_R);
    loopMesh.position.set(xBase, yE, 0);
    loopMesh.material.emissive.setRGB(1.0 * st.energy, 0.45 * st.energy, 0.1 * st.energy);
    // perforations
    HOLES.forEach(([x, a], i) => {
      dummy.position.set(x, R * Math.cos(a), R * Math.sin(a));
      dummy.scale.setScalar(0.03);
      dummy.updateMatrix();
      holes.setMatrixAt(i, dummy.matrix);
    });
    holes.instanceMatrix.needsUpdate = true;
    // stopcock levers open with the flow
    leverIn.rotation.y = st.flow * Math.PI * 0.5;
    leverOut.rotation.y = st.flow * Math.PI * 0.5;
    // section and particles
    clip.constant = st.section ? 0 : 1000;
    pIn.visible = pOut.visible = st.flow > 0.02;
    if (pIn.visible) {
      const a = pIn.geometry.attributes.position.array;
      const b = pOut.geometry.attributes.position.array;
      for (let i = 0; i < N; i++) {
        const ang = rnd(i * 3 + 1) * Math.PI * 2;
        const rr = Math.sqrt(rnd(i * 3 + 2)) * Ri * 0.8;
        const off = rnd(i * 3 + 3);
        // inflow: down the top stopcock, then along the shaft and out of the tip
        const s = (((st.phase * 0.22 + off) % 1) + 1) % 1;
        let x;
        let y;
        let z;
        if (s < 0.1) {
          const u = s / 0.1;
          x = IN_TOP[0] + (rnd(i) - 0.5) * 0.3;
          y = along(u, IN_TOP[1], 0.0);
          z = (rnd(i + 7) - 0.5) * 0.3;
        } else if (s < 0.86) {
          const u = (s - 0.1) / 0.76;
          x = along(u, IN_TOP[0], L_TIP);
          y = rr * Math.cos(ang) * 0.9 + 0.35 * R;
          z = rr * Math.sin(ang);
        } else {
          const u = (s - 0.86) / 0.14;
          x = L_TIP + u * 2.2;
          y = 0.35 * R + rr * Math.cos(ang) * (0.9 + u * 3.2);
          z = rr * Math.sin(ang) * (0.9 + u * 3.2);
        }
        a[i * 3] = x;
        a[i * 3 + 1] = y;
        a[i * 3 + 2] = z;
        // outflow: in through the holes, back along the shaft, out of the bottom stopcock
        const s2 = (((st.phase * 0.22 + off + 0.37) % 1) + 1) % 1;
        if (s2 < 0.7) {
          const u = s2 / 0.7;
          x = along(u, 17.4, -0.3);
          y = -0.55 * R + rr * Math.cos(ang) * 0.55;
          z = rr * Math.sin(ang) * 0.8;
        } else {
          const u = (s2 - 0.7) / 0.3;
          x = OUT_BOT[0] + (rnd(i + 11) - 0.5) * 0.25;
          y = along(u, -0.4, OUT_BOT[1]);
          z = (rnd(i + 13) - 0.5) * 0.25;
        }
        b[i * 3] = x;
        b[i * 3 + 1] = y;
        b[i * 3 + 2] = z;
      }
      pIn.geometry.attributes.position.needsUpdate = true;
      pOut.geometry.attributes.position.needsUpdate = true;
    }
    // camera
    camera.position.set(cam.tx + cam.d * Math.cos(cam.el) * Math.sin(cam.az), cam.ty + cam.d * Math.sin(cam.el), cam.tz + cam.d * Math.cos(cam.el) * Math.cos(cam.az));
    camera.lookAt(cam.tx, cam.ty, cam.tz);
    camera.updateMatrixWorld();
    renderer.render(scene, camera);
  };
  const pv = new V3();
  const project = (x, y, z) => {
    pv.set(x, y, z).project(camera);
    if (pv.z > 1) return null;
    return [(pv.x * 0.5 + 0.5) * size.w, (-pv.y * 0.5 + 0.5) * size.h];
  };
  void TRAVEL;
  void LOOP_FWD;
  return {renderer, scene, camera, resize, frame, project, size};
}
