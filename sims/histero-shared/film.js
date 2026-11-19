// UteriS XS film: the instrument (stage.js) under the console (console.js), played from the operator's script
// (script.js) as a pure function of t. Also the pointer, shared with the live page's auto tour.
import {runSim} from '../kit/runtime.js';
import {createConsole} from './console.js';
import {camAt, DURATION, EVENTS, stateAt} from './script.js';
import {ss} from './model.js';
import {createStage} from './stage.js';

const D2R = Math.PI / 180;
export const DEFAULTS = {duration: DURATION, fps: 60, theme: 'light', hud: {enabled: false, title: 'uteris-xs', subtitle: ''}, director: {enabled: false}, watermark: ''};

const REST = [[860, 470], [760, 420], [940, 520], [820, 380]];
export function makeCursor(ui) {
  const EV = EVENTS.map((e) => ({...e, spot: ui.spots[e.key] || [800, 450]}));
  const WP = [[0, 900, 600]];
  EV.forEach((e, i) => {
    WP.push([e.t - 0.16, ...e.spot], [e.t + 0.22, ...e.spot]);
    WP.push([e.t + 1.4, ...REST[i % REST.length]]);
  });
  WP.sort((a, b) => a[0] - b[0]);
  return (t) => {
    let i = 0;
    while (i < WP.length - 2 && t > WP[i + 1][0]) i++;
    const [t0, x0, y0] = WP[i];
    const [t1, x1, y1] = WP[i + 1];
    const k = ss(t0, t1, t);
    const len = Math.hypot(x1 - x0, y1 - y0);
    const bow = Math.sin(Math.PI * k) * Math.min(24, len * 0.07);
    let press = false;
    let ring = 0;
    let rx = 0;
    let ry = 0;
    for (const e of EV) {
      if (t >= e.t - 0.07 && t < e.t + 0.09) press = true;
      if (t >= e.t && t < e.t + 0.55) {
        ring = 1 - (t - e.t) / 0.55;
        [rx, ry] = e.spot;
      }
    }
    return {x: x0 + (x1 - x0) * k + (len ? (-(y1 - y0) / len) * bow : 0), y: y0 + (y1 - y0) * k + (len ? ((x1 - x0) / len) * bow : 0), press, ring, ringX: rx, ringY: ry};
  };
}

export const toStageCam = (c) => ({...c, az: c.az * D2R, el: c.el * D2R});

export const run = () =>
  runSim(DEFAULTS, async ({canvas}) => {
    const st = createStage({canvas});
    const resize = () => st.resize(1600, 900, 1);
    resize();
    const app = document.getElementById('app');
    Object.assign(app.style, {width: '1600px', height: '900px', inset: 'auto', left: '0', top: '0'});
    canvas.style.cssText = 'position:absolute;left:0;top:0;width:1600px;height:900px';
    const ui = createConsole(app);
    ui.measure();
    const cursorAt = makeCursor(ui);
    window.CS = st;
    return {
      resize,
      render(t) {
        const s = stateAt(t);
        st.frame(s, toStageCam(camAt(t)));
        ui.update({...s, project: st.project, cursor: cursorAt(t)}, t);
        return {};
      },
    };
  });
