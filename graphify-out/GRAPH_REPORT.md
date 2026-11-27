# Graph Report - teardown-prueba  (2026-11-27)

## Corpus Check
- 69 files · ~54,613 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 3 file(s) not represented in the graph (top: (none) 2, .css 1)

## Summary
- 675 nodes · 1325 edges · 23 communities
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 33 edges (avg confidence: 0.84)
- Token cost: 313,250 input · 0 output

## Community Hubs (Navigation)
- Strandbeest Simulator
- V8 Engine Simulator
- Cessna Landing Gear Simulator
- Shared Sim Kit Runtime
- SFX Package & CLI
- DSP Filters & Effects
- Synth Voices
- NPM Package Config
- Video Capture (Playwright)
- Score Kit Helpers
- Contact Sheet Tool
- Credits & Sound Samples
- Cessna/V8 Scores
- Audio Waveform Check
- Reverb & Lo-fi Bed
- Strandbeest Score
- esbuild Build Pipeline
- Robotic Bee Demo
- Tool Paths Config
- Skill Rules & Examples
- Robotic Octopus Demo
- Robotic Scorpion Demo
- README Overview

## God Nodes (most connected - your core abstractions)
1. `bed()` - 19 edges
2. `runLive()` - 19 edges
3. `runLive()` - 17 edges
4. `bandnoise()` - 16 edges
5. `buildEngine()` - 16 edges
6. `runLive()` - 16 edges
7. `makeConsoleFrame()` - 13 edges
8. `Teardown skill` - 13 edges
9. `three` - 11 edges
10. `createConsole()` - 11 edges

## Surprising Connections (you probably didn't know these)
- `Freesound` --semantically_similar_to--> `Freesound`  [INFERRED] [semantically similar]
  README.md → sfx/samples/SOURCES.md
- `Barty-Bart/motion-graphics` --semantically_similar_to--> `Barty-Bart/motion-graphics sound-effects skill`  [INFERRED] [semantically similar]
  SKILL.md → sfx/samples/SOURCES.md
- `score()` --calls--> `bed()`  [EXTRACTED]
  sims/cessna-shared/score.py → sfx/score_kit.py
- `score()` --calls--> `bed()`  [EXTRACTED]
  sims/strandbeest-shared/score.py → sfx/score_kit.py
- `score()` --calls--> `bed()`  [EXTRACTED]
  sims/v8-shared/score.py → sfx/score_kit.py

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **One timeline drives film, live page and score** — skill_film_js, skill_live_js, skill_score_py, skill_timeline_json, skill_one_input_drives_everything [EXTRACTED 1.00]
- **Per-machine module split** — skill_kin_math_module, skill_geometry_module, skill_stage_js, skill_console_js, skill_film_js, skill_live_js, skill_score_py [EXTRACTED 1.00]
- **Build, capture, score, mux and review pipeline** — sims_build, sims_capture, run_sfx, wave, sheet [EXTRACTED 1.00]

## Communities (23 total, 0 thin omitted)

### Community 0 - "Strandbeest Simulator"
Cohesion: 0.05
Nodes (79): bodyAt(), buildBeast(), CFG, footParam(), LAYER, legAt(), legsAt(), legZ() (+71 more)

### Community 1 - "V8 Engine Simulator"
Cohesion: 0.06
Nodes (70): C, CAMS, createConsole(), CUTS, el(), OVERLAYS, RPM_MAX, buildEngine() (+62 more)

### Community 2 - "Cessna Landing Gear Simulator"
Cohesion: 0.05
Nodes (67): C, createConsole(), DISPLAY, DISPLAY_LABEL, el(), VIEW_LABEL, VIEWS, blend() (+59 more)

### Community 3 - "Shared Sim Kit Runtime"
Cohesion: 0.06
Nodes (35): before(), createDirector(), shotAt(), DIRECTOR, createHud(), BASE, fromBase64(), loadConfig() (+27 more)

### Community 4 - "SFX Package & CLI"
Cohesion: 0.06
Nodes (15): _biquad(), integrated_lufs(), _kernels(), true_peak(), list_generators(), load_cues(), main(), Mix (+7 more)

### Community 5 - "DSP Filters & Effects"
Cohesion: 0.05
Nodes (23): _allpass(), biquad(), _blep(), bp(), _comb(), compress(), crush(), fade() (+15 more)

### Community 6 - "Synth Voices"
Cohesion: 0.09
Nodes (15): beep(), puff(), bandnoise(), chime(), crackle(), envelope(), hat(), impact() (+7 more)

### Community 7 - "NPM Package Config"
Cohesion: 0.07
Nodes (27): dependencies, esbuild@0.28.1, @fontsource/jetbrains-mono@5.3.0, @fontsource-variable/inter@5.3.0, playwright@1.58.2, three@0.186.1, description, license (+19 more)

### Community 8 - "Video Capture (Playwright)"
Cohesion: 0.10
Nodes (19): argv, {chromium}, dpr, end, ff, fps, frames, from (+11 more)

### Community 9 - "Score Kit Helpers"
Cohesion: 0.14
Nodes (9): add(), zeros(), bang(), env_fade(), hiss(), rattle(), rising(), rumble() (+1 more)

### Community 10 - "Contact Sheet Tool"
Cohesion: 0.11
Nodes (14): argv, cols, dir, duration, every, from, name, offset (+6 more)

### Community 11 - "Credits & Sound Samples"
Cohesion: 0.18
Nodes (17): Barty-Bart/motion-graphics, whaleyxbt/claude-motion, Credits, Freesound, Barty-Bart/motion-graphics sound-effects skill, CC0 1.0 licence, Freesound, Keyboard typing samples (+9 more)

### Community 12 - "Cessna/V8 Scores"
Cohesion: 0.21
Nodes (9): airy(), motor(), thud(), click(), score(), firings(), rpm_at(), score() (+1 more)

### Community 13 - "Audio Waveform Check"
Cohesion: 0.14
Nodes (11): argv, beats, input, lufs, marks, peak, probed, r (+3 more)

### Community 14 - "Reverb & Lo-fi Bed"
Cohesion: 0.14
Nodes (7): reverb(), svf(), bed(), bass(), blip(), epiano(), kick()

### Community 15 - "Strandbeest Score"
Cohesion: 0.23
Nodes (8): chords(), hz(), rps_at(), score(), smoother(), theta_table(), touchdowns(), wind_at()

### Community 16 - "esbuild Build Pipeline"
Cohesion: 0.17
Nodes (7): DEPS, DIST, esbuild, HERE, inter, KIT_CSS, kitPlugin

### Community 17 - "Robotic Bee Demo"
Cohesion: 0.20
Nodes (11): Assemblies selector (Head, Optics, Wing, Leg L2, Thorax, Abdomen), Display toggles (Labels, Exploded, Motion Blur, Turntable), Central 3D exploded view of bee robot (abdomen capsule separated), Flight Log timeline with operator actions (take-off to land, 'Isolate Abdomen'), Flight mode state: ABDOMEN OPEN, Flight attitude panel (alt AGL, V/S, pitch, roll, airspeed), Left HUD telemetry panels (Wing Beat, Power, Leg Servos), Mellis HB-7 flapping-wing robotic pollinator micro air vehicle (+3 more)

### Community 18 - "Tool Paths Config"
Cohesion: 0.20
Nodes (9): CHROMIUM, CHROMIUM_ARGS, FFMPEG, FFPROBE, fromDeps(), OUT, playwright(), PYTHON (+1 more)

### Community 19 - "Skill Rules & Examples"
Cohesion: 0.18
Nodes (10): Cessna 337 landing gear example, Commands, First run, Review checklist, Review loop, Strandbeest example, Teardown skill, The 3 examples (+2 more)

### Community 20 - "Robotic Octopus Demo"
Cohesion: 0.24
Nodes (10): Eight segmented arm chains with suckers, Assemblies isolation panel (head, optics, mantle, arms, siphon, beak), Pelagos OC-8 field simulator demo (animated GIF), Display controls (labels, exploded, jet wake, turntable), Technical-dashboard layout: central 3D viewport flanked by side panels, Spherical mantle shell with optics port, Operation log timeline / scrubber (operation modes e.g. HOLDING), Pelagos OC-8 soft-arm manipulator (eight-arm robotic cephalopod) (+2 more)

### Community 21 - "Robotic Scorpion Demo"
Cohesion: 0.22
Nodes (10): Assemblies & display controls (isolate claw/tail/legs, labels, exploded, turntable, gait trace), Claw grip panel (grip force chart, hold mode), Telson SC-8 simulator demo (animated screenshot), Gait panel (stride rate, stance 8-feet pattern), Sci-fi HUD layout: central 3D viewport flanked by telemetry panels, orange/white palette, Leg servos load bars L1-R4, Operation log timeline with playback (operator: isolate claw L), Subsystems status list (sensor head, claw drives, carapace core, tail actuators, leg servos, stinger) (+2 more)

### Community 22 - "README Overview"
Cohesion: 0.25
Nodes (8): Install, Mellis HB-7 robotic bee simulator, Pelagos OC-8 robotic octopus, Playwright Chromium, teardown (README), Telson SC-8 robotic scorpion, Use, What is inside

## Knowledge Gaps
- **27 isolated node(s):** `Mellis HB-7 robotic bee simulator`, `Telson SC-8 robotic scorpion`, `Pelagos OC-8 robotic octopus`, `Playwright Chromium`, `First run` (+22 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 239 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Teardown skill` connect `Skill Rules & Examples` to `Shared Sim Kit Runtime`, `Credits & Sound Samples`, `README Overview`, `NPM Package Config`?**
  _High betweenness centrality (0.430) - this node is a cross-community bridge._
- **What connects `Mellis HB-7 robotic bee simulator`, `Telson SC-8 robotic scorpion`, `Pelagos OC-8 robotic octopus` to the rest of the system?**
  _27 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Strandbeest Simulator` be split into smaller, more focused modules?**
  _Cohesion score 0.054858934169279 - nodes in this community are weakly interconnected._
- **Why does `Sound` connect `Shared Sim Kit Runtime` to `Score Kit Helpers`, `Skill Rules & Examples`, `SFX Package & CLI`?**
  _High betweenness centrality (0.299) - this node is a cross-community bridge._
- **Should `V8 Engine Simulator` be split into smaller, more focused modules?**
  _Cohesion score 0.06458941901979877 - nodes in this community are weakly interconnected._
- **Why does `render(t) contract` connect `Shared Sim Kit Runtime` to `Skill Rules & Examples`?**
  _High betweenness centrality (0.229) - this node is a cross-community bridge._
- **Should `Cessna Landing Gear Simulator` be split into smaller, more focused modules?**
  _Cohesion score 0.05365686944634313 - nodes in this community are weakly interconnected._