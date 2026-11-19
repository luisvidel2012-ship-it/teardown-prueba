// UteriS XS bipolar hysteroscope: the maths. Units are centimetres, x runs along the instrument (eyepiece at -x, distal
// tip at +x), y up, z toward the viewer. No three.js in here.
//
// Real numbers: 1 Fr (Charriere) = 1/3 mm, so 13 Fr = 4.33 mm and 17 Fr = 5.67 mm; saline column pressure = rho g h.
// Illustrative (read off the product photo, not a datasheet): the 18.4 cm of sheath, the 0.9 cm loop travel, the
// inner layout of the sheath. The page says so.
export const FR_RANGE = [13, 17];
export const frMm = (fr) => fr / 3;
export const rOut = (fr) => fr / 6 / 10; // outer radius in cm
export const L_TIP = 18.4; // distal end of the sheath, cm from the blue ring
export const PHI_MAX = (12 * Math.PI) / 180; // grip lever swing at full squeeze
export const PIVOT = [-3.3, 2.2]; // lever pivot (x, y)
export const LINK = 4.3; // pivot to the link pin along the lever, cm
export const TRAVEL = LINK * Math.sin(PHI_MAX); // loop travel = 0.89 cm, the same number the pose uses
export const LOOP_R = 0.09; // loop radius, cm
export const LOOP_FWD = 0.75; // loop apex beyond the sheath end at rest
export const BAG = [0.4, 1.5]; // saline bag height range above the patient, m
export const pressureMmHg = (h) => (1005 * 9.81 * h) / 133.322;

export const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
export const smoother = (x) => {
  const u = clamp(x, 0, 1);
  return u * u * u * (u * (u * 6 - 15) + 10);
};
export const ss = (a, b, t) => smoother((t - a) / (b - a));

// one input, the grip g in 0..1, poses everything
export const pose = (g) => {
  const phi = -g * PHI_MAX; // lever turns clockwise: its grip end moves toward the eyepiece
  const link = [PIVOT[0] + LINK * Math.sin(phi), PIVOT[1] - LINK * Math.cos(phi)]; // pin point on the lever
  const dx = -TRAVEL * g; // carriage and loop travel toward the eyepiece
  return {phi, link, dx, loopApex: L_TIP + LOOP_FWD + dx, loopExt: LOOP_FWD + dx};
};
