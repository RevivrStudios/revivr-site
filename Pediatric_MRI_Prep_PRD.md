# PRD — "Meet the MRI": Pediatric MRI Procedure Preparation (WebXR)

**Status:** Draft for implementation
**Owner:** Revivr Studios
**Target:** `public/mriprep/` on revivrstudios.com, linked from the WebXR page
**Executor note:** This PRD is written to be executed end-to-end by an AI agent
(Sonnet). Section 9 contains hard-won platform facts from building Open Space
and Look & Say — read it BEFORE writing any code. Deviating from it will
reproduce bugs we already fixed once.

---

## 1. What this is

A browser-based XR experience that prepares a child (roughly ages 4–10) for an
MRI scan by letting them meet the machine gradually, from inside a safe,
familiar bedroom. Child-life specialists do exactly this in hospitals —
graduated exposure to the sounds, the room, and the machine, ending with
practicing the one skill an MRI actually requires of a child: **holding still
while it is loud**.

The arc (approved by product owner):

1. Start in a cozy bedroom (reuse the Look & Say room). Look around freely.
2. Press a button to **hear** the MRI sounds — quietly at first, with the
   child raising the volume themselves, step by step.
3. Press a button to **open the wall** — one bedroom wall slides away,
   revealing the MRI suite next door. Look, don't go.
4. Press a button to **go in** — the child moves beside the machine.
5. **Buddy goes first** — a plush toy rides the table into the bore and comes
   back out. Classic child-life technique: demonstrate on the toy.
6. **Try the table** — the child's viewpoint lies back on the table and
   slides slowly into the bore, with sounds playing. A stop control is always
   visible; backing out is instant and never framed as failure.
7. **The Still Game** — the payoff skill. While sounds play, a star meter
   fills only while the child holds their head still (head-pose variance
   under threshold). Motion gently pauses the meter — never a buzzer, never
   "you failed." Three rounds (10s / 20s / 30s) earn three stars and the
   **MRI Explorer badge**.
8. Calm celebration + recap panel ("You met the machine. You heard the
   sounds. You held still like a statue."), then free roam or restart.

Every step is child-initiated by a button. Nothing advances on a timer, and
nothing can trap the user — an exit affordance is present at every stage.

### Non-goals

- No medical claims (no "reduces sedation rates," no outcomes language).
- No photorealism, no blood/needles/IV content, no humanoid characters
  (an earlier abstract humanoid tested as creepy — use the plush toy and
  text/voice instead).
- No account, no data collection, nothing leaves the page (same promise as
  Look & Say).

---

## 2. Where it lives, what it reuses

- **New page:** `public/mriprep/index.html` in the site repo
  (`/Volumes/Sureal Drive/Revivr Site /`). `public/` is copied verbatim by
  Vite — self-contained page, same as `public/openspace/` and
  `public/lookandsay/`.
- **Room:** copy `public/lookandsay/assets/looksay_room.glb` to
  `public/mriprep/assets/room.glb` (do not share the file across demos —
  each demo owns its assets).
- **MRI suite:** new GLB authored in Blender (Section 4).
- **Code patterns:** lift from `public/openspace/index.html` (VR button
  factory, dwell + gaze-pinch select, head-pose guards) and
  `public/lookandsay/index.html` (world-placed board, TTS `speak()`,
  accessibility panel wiring). Three.js r160 via the same CDN import map.
- **Site integration:** add a card for it on `webxr.html` (match existing
  demo cards; amber accent `#E09A4A` only, never teal), and reuse the
  Open Space disclaimer block verbatim, adapted: *"Meet the MRI is a
  research prototype exploring XR for procedure preparation. It is not a
  medical device and does not replace preparation guidance from your care
  team."* The site-wide `#accessibility-toggle` / `body.accessibility-mode`
  contract MUST keep working on this page.

---

## 3. Experience spec

### 3.1 Spaces

Two rooms, one GLB each, positioned side by side in one scene:

- **Bedroom** (`room.glb`): as-is. The child starts here at the bed-head
  origin (see Section 9.4 for why origin placement matters).
- **MRI suite**: adjoining room, sharing the wall that opens. Contents:
  - The BlendKit scanner (Section 4) centered with its bore axis pointing
    toward the shared wall, so the child sees the round opening from the
    bedroom the moment the wall opens — the donut shape reads instantly.
  - Cream/soft-blue walls matching the bedroom's palette (NOT clinical
    white/black — keep the approved warm stylized look; the thumbnail's
    dark tile floor must be replaced with the same warm plank floor or a
    light vinyl tone).
  - Friendly dressing: a ceiling "sky panel" (many real pediatric suites
    have one — a backlit nature image; use a quad with the pond-painting
    treatment from the Look & Say framed picture), a chair for a parent,
    a small shelf, the plush toy sitting on the table.
  - A large window with two silhouetted... no — no humanoids. A window
    into a control room showing just a desk, monitor, and microphone, with
    a caption when labeled: "Your grown-ups and the camera team watch from
    here. They can always hear you."

### 3.2 Stage machine

`const STAGES = ['bedroom', 'sounds', 'reveal', 'visit', 'buddy', 'table', 'still', 'done']`

One stage active at a time; each stage defines which diegetic buttons exist.
Buttons are **world-placed 3D panels** (canvas-texture meshes, exactly the
`makeVrButton` pattern from Open Space), positioned in the room near what
they affect — the sound button near the bedroom wall, the "open the wall"
button on that wall, etc. Never head-locked. All are activated by dwell
(2s, with the button-grows progress feedback pattern) or gaze-pinch.

Per stage:

| Stage | What happens | Buttons present |
|---|---|---|
| bedroom | Free look. Soft intro line via TTS + floating text panel: "This is your room. When you're ready, you can hear what an MRI camera sounds like." | `Hear the sounds` |
| sounds | MRI audio starts at volume step 1 of 4 (Section 3.4). Each press of `Louder` raises one step; `Softer` lowers. Text: "That knocking is the camera taking pictures. It's loud, but it never touches you." | `Louder`, `Softer`, `Open the wall` |
| reveal | The shared wall slides down into the floor over 4s (instant under reduced-motion). MRI suite visible from bedroom. Sounds continue at the child's chosen volume. | `Go say hello`, `Close the wall` (returns to sounds stage — retreat is always allowed) |
| visit | Viewpoint teleports to a spot 1.5m from the scanner, angled to see the bore and table. Three small labels can be dwelled to hear facts (Section 3.3). | `Buddy goes first`, `Go back to the room` |
| buddy | The plush toy (already sitting on the table) slides with the table into the bore, pauses 3s with sounds playing, slides back out. Text: "Buddy held super still. Now Buddy has a picture of his tummy!" | `My turn on the table`, `Do that again` |
| table | Viewpoint moves to lying-on-table POV (camera at table height, looking up; bore ceiling above). Table slides in slowly (8s, or stepwise under reduced-motion, ~40cm per press). Sounds play. `Stop` halts instantly; `Slide out` reverses. When fully in: "This is exactly where the pictures happen. Want to play the Still Game?" | `Stop`/`Slide out`, `Play the Still Game`, `I'm done for now` (→ done, still counts as a win) |
| still | Three rounds: 10s, 20s, 30s. A star outline fills while head stays still (Section 3.5). Between rounds: "One star! Two more?" Completing all three (or choosing to stop after ≥1) earns the badge. | `Start`, round controls, `That's enough` |
| done | Badge panel: a big amber star ring, "MRI Explorer — you met the machine, heard the sounds, and held still like a statue." Calm, no confetti explosion; the pond-painting sun motif glows gently. | `Explore freely`, `Start over` |

An **exit ring** (the Open Space marker pattern, `depthTest:false`) floats
near the room door at ALL stages; dwelling it returns to `bedroom` and
fades audio out over 2s.

### 3.3 The three fact labels (visit stage)

Dwellable small panels anchored to the machine, each speaks + shows one line
in kid language:

1. On the bore: "This is a giant camera shaped like a donut. It takes
   pictures of the inside of your body."
2. On the table: "You lie on this bed and it slides you in. It moves slow,
   like a lazy river."
3. On the control window: "Your grown-ups and the camera team are right
   here the whole time. They can hear you if you talk."

### 3.4 Audio — synthesize, don't ship samples

Follow the Open Space procedural-wind precedent: all MRI sounds are WebAudio
synthesis. No audio files, no licensing, precise volume control.

- **Knocking (gradient pulses):** a 100–150 Hz square/triangle oscillator
  gated by an LFO at ~4–8 Hz in bursts of 3–5s, band-passed. This is the
  signature MRI sound.
- **Deep hum:** constant 50–60 Hz sine at low gain underneath.
- **Buzz sweep:** occasional band-passed sawtooth sweeps (2s) between knock
  bursts.
- **Volume ladder:** 4 steps, master gain 0.06 / 0.14 / 0.25 / 0.38, with a
  ~1s ramp between steps (`gain.linearRampToValueAtTime`). Never exceed
  0.38. Starting step is always 1, every session.
- AudioContext must be created/resumed inside a user-gesture handler
  (the start button), same as Open Space's `initAudio()`.

### 3.5 The Still Game — measurement

Per frame while a round runs, sample the head position + quaternion (use the
main `camera`; three syncs it to the XR pose). Compute displacement since
last sample. Maintain a rolling "stillness" boolean:
`still = positionDelta < 0.015m/s equivalent && angularDelta < ~4°/s`.
The star meter accrues round time only while `still`. Motion pauses accrual
and shows the text "wiggle break!" in a friendly tone after 1.5s of motion —
accrued progress is NEVER reset. Rounds are 10/20/30 seconds of accrued
stillness. On desktop (no headset) the game still works via mouse-steadiness
(don't move the mouse), so the flow is demoable anywhere.

Thresholds are constants at the top of the file with a comment inviting
tuning; children are wiggly — err generous. The point is practice and
confidence, not measurement rigor.

### 3.6 Desktop / mobile (non-XR) path

The whole flow must work flat: drag-to-look (Look & Say pattern), buttons
clickable, sounds identical, table sequence as a camera animation, Still
Game via mouse steadiness. The DOM keeps real `<button>`s mirrored to the 3D
panels (visually hidden container is fine) so screen readers and keyboards
can drive every stage — this is a Revivr accessibility requirement, not
optional.

### 3.7 Accessibility & calm-safety

- Site accessibility panel works (text size, high contrast — high contrast
  restyles the 3D button textures like Look & Say's `vrTexture` does).
- `prefers-reduced-motion`: no wall-slide/table-slide animations (stepwise
  or instant transitions), no camera drift.
- All spoken lines also appear as text panels (TTS may be off/unavailable).
- Nothing flashes; nothing exceeds gentle volume; nothing moves toward the
  child's face except the slow, child-initiated table slide, which `Stop`
  halts within one frame.
- The child can retreat from every stage to the previous one.

---

## 4. Asset pipeline (Blender)

Blender 5.2 is open with the blender-mcp addon listening on
`127.0.0.1:9876` (JSON over TCP: send
`{"type":"execute_code","params":{"code":"..."}}`, read until valid JSON).
A working client exists at the session scratchpad as `blender/bmcp.py`; if
absent, write the ~30-line equivalent. Blender CLI headless
(`/Applications/Blender.app/Contents/MacOS/Blender --background --python x.py`)
is the fallback if the socket is dead.

The master file is
`/Volumes/Sureal Drive/Revivr Site /assets3d/revivr_xr_levels.blend`
(scenes: `OpenSpace_Outdoor`, `LookSay_Room`). Add a new scene
`MRI_Suite` to the same file.

### 4.1 The scanner

BlendKit asset (paid account; token flow below):
`asset_base_id:f3cb0f3c-02a9-4c40-be7b-0eb85c1ea232` — "Magnetic resonance
imaging (MRI) machine", 16,899 faces, 2K textures, real dims 2.35×3.40×1.87m,
blend download endpoint `https://www.blenderkit.com/api/v1/downloads/412293/`.

Auth: a bearer token may exist at `/tmp/bk_key.txt` (verify with
`GET /api/v1/me/`). If expired, exchange the refresh token at
`/tmp/bk_refresh.txt` against `https://www.blenderkit.com/o/token/`
(form-encoded, `grant_type=refresh_token`, the addon's client_id — read it
from the installed blenderkit extension's `client_lib.py` / `bkit_oauth.py`
under `~/Library/Application Support/Blender/5.2/extensions/`). Download:
`GET {downloadUrl}?scene_uuid={uuid4}` with the bearer → JSON with
`filePath` → curl that URL to `/tmp/bk_mri.blend`.

Then in Blender: append its objects into `MRI_Suite`. **16.9k faces is
acceptable — do not decimate** (decimation destroyed a tree asset once;
never decimate below ~50% without a render check). Resize its textures to
1024px (`img.scale(1024,1024)`) to keep the GLB small.

### 4.2 The suite room

Build the room shell with the exact technique used for the Look & Say
rebuild: **box-built walls with a real doorway/wall opening** (compose each
wall from 2–4 boxes around openings; NEVER boolean-cut the asset walls —
booleans on unknown shells produce ragged innards). Shared wall must be a
separate object (`WallShared`) so the page can animate it sliding down.
Match bedroom wall height (3.09) and cream material. Warm plank floor
(reuse the `Plank_A/B/C` real-geometry plank pattern) or a light warm vinyl
single-tone floor. Ceiling with one recessed "sky panel" quad using a
stylized sky/hills/sun composition (the `Art_*` painting technique).
A plush toy: simplest is a low-poly bear/bunny built from spheres/capsules
in the room's palette (~500 tris); a BlendKit plushie (e.g. "Cute Rabbit
Plushie" `713aa2d5`, ~8.4k faces, paid) is an acceptable alternative if it
round-trips under budget.

The **table must be a separate object** (`MRITable`) — check whether the
BlendKit asset's table is a distinct mesh; if fused, separate the table
geometry by loose parts/material in Blender so the page can slide it.

### 4.3 Verify → export

- Set scene view transform to **Standard** (never AgX) for any check
  renders — that is what Three.js shows.
- Render 2–3 EEVEE stills at eye height (1.2m — child-ish) and LOOK at
  them (Read the PNG). Fix what's wrong before exporting. **This visual
  check is mandatory**; every scene this project shipped without one had a
  visible defect.
- Export scene → `public/mriprep/assets/mri_suite.glb` with
  `use_active_scene=True, use_visible=True, export_apply=True`, no
  cameras/lights. **Before export, clamp every SUBSURF modifier's viewport
  `levels` to 1** (the exporter applies viewport levels; this took a room
  from 11MB to 3MB). Budget: ≤ 3.5 MB.
- **Round-trip verify:** import the exported GLB into a fresh Blender
  scene, render it, look at the render. Materials that are view-dependent
  (fresnel mixes) or emission-based will not survive — rebuild those as
  flat/textured before export (water and window-glass both hit this).

---

## 5. Scene assembly (Three.js)

- Load both GLBs; place the suite so its shared wall coincides with the
  bedroom's south wall (the mirrored-window wall). Remove/hide the
  bedroom's south window dressing if it conflicts; the shared wall opening
  is the suite's `WallShared`, animated `position.y` from 0 → −3.2.
- Lighting: one warm directional + hemisphere, per Look & Say values. The
  suite side slightly cooler/brighter than the bedroom (it should feel
  "clinical but kind", not dark).
- Movement between anchor points (bed-head, doorway, beside-machine,
  on-table) is by **teleport**: move a `worldRoot` group that contains BOTH
  GLBs (never move the camera/user in WebXR), 0.4s eased slide, instant
  under reduced-motion. Anchor coordinates are constants; derive them in
  Blender scene space and convert (Blender `(x,y,z)` → three `(x,z,−y)`).
- Table POV: parent nothing to the camera; move `worldRoot` so the bore
  surrounds the viewer, matching table height (~0.65m → set root y so the
  child's real head height works whether sitting or standing; add a
  `Comfy?` prompt with `Higher/Lower` nudge buttons, 10cm steps).

---

## 6. Copy (use verbatim; child-tested tone)

- Intro: "Hi! An MRI is a giant camera that takes pictures of the inside
  of your body. Want to meet it? No rush — it's just us here."
- Sounds: "That knocking? That's the camera working. It's loud, but it
  never ever touches you."
- Reveal: "There it is — see the round window? That's where the pictures
  happen."
- Buddy: "Buddy wants to go first. Watch how still he holds!"
- Table: "Your turn. The bed moves slow, like a lazy river. Say stop
  anytime and it stops."
- Still Game: "Pretend you're a statue in a garden. The camera loves
  statues."
- Done: "You did it, MRI Explorer. When you visit the real one, you
  already know its sounds and its shape."

TTS via the Look & Say `speak()` pattern (SpeechSynthesis, cancel-before-
speak, rate ~0.95). Every line also rendered as a text panel.

---

## 7. Site integration & shipping

1. Card on `webxr.html` alongside the other demos — title "Meet the MRI",
   one-line: "A gentle, child-paced introduction to the MRI machine — its
   shape, its sounds, and how to hold statue-still." Device icons per the
   established set. Disclaimer per Section 2.
2. Build: `npm run build` from the site root (public/ is copied verbatim;
   the build does NOT parse demo scripts — see 9.7 for the required parse
   check).
3. Verify against the **Firebase emulator**, never `vite preview`
   (`firebase emulators:start --only hosting`; port 5000 is taken by macOS,
   it lands on 5002/5003 — read the port from its log). Curl the page and
   both GLBs (200 + correct byte sizes), grep for key function names.
4. Commit (message style per repo history), deploy with
   `firebase deploy --only hosting`. If auth is expired the deploy errors —
   STOP and ask the user to run `firebase login --reauth`; do not attempt
   token workarounds.
5. Verify live: curl `https://revivrstudios.com/mriprep/` and the GLBs.

---

## 8. Acceptance checklist

- [ ] Page loads flat (desktop) with room visible, full flow completable
      with mouse only, and with keyboard only (DOM buttons).
- [ ] Enter VR works on visionOS Safari; all stage buttons visible and
      activatable by 2s dwell AND by look-plus-pinch.
- [ ] Sounds start at step 1, ladder up/down correctly, never exceed cap,
      fade out on exit.
- [ ] Wall opens/closes; retreat works from every stage.
- [ ] Buddy sequence plays and can replay.
- [ ] Table slide: stop halts within one frame; slide-out works; reduced-
      motion path stepwise.
- [ ] Still Game: meter accrues only when still; wiggle pauses without
      reset; 3 stars → badge; early exit still lands on `done` positively.
- [ ] Accessibility panel (text size / high contrast) affects page AND 3D
      button textures; reduced-motion honored everywhere.
- [ ] Both GLBs ≤ 3.5 MB each; page has zero console errors on load.
- [ ] Disclaimer present; no outcome/medical claims anywhere in copy.
- [ ] `npm run build` clean; emulator + live curl checks pass.

---

## 9. Platform facts — read before coding (learned the hard way)

1. **visionOS Safari has NO `dom-overlay`.** Any DOM UI is invisible inside
   an immersive session. Every in-headset control must be world geometry
   (canvas-texture meshes). Request the session with the Open Space
   options block; keep `dom-overlay` in `optionalFeatures` (harmless
   elsewhere).
2. **The XR camera has no pose until the first rendered frame.** Anything
   positioned "in front of the user" at `sessionstart` lands at the world
   origin — the floor at their feet under `local-floor`. Guard degenerate
   poses (`pos.lengthSq() < 1e-4`) and correct placement on later frames.
   Copy `readHeadPose()` / the deferred-placement pattern from Open Space.
3. **Eye gaze is private until pinch.** Hover can only follow the HEAD
   (center-ray). On `select`, visionOS delivers the true gaze ray via
   `ev.inputSource.targetRaySpace` — raycast along it
   (`ev.frame.getPose(targetRaySpace, renderer.xr.getReferenceSpace())`).
   Implement BOTH: head-dwell (hands-free) and gaze-pinch. Copy
   `gazeRayFromSelect()` from Open Space.
4. **The VR origin is the user.** Where the world sits relative to (0,0,0)
   decides where the person stands. Position `worldRoot` so the origin is
   the intended standing spot; move `worldRoot`, never the camera rig.
5. **UI must show dwell progress in-geometry** (button grows ~8–10% over
   the dwell). The DOM dwell ring does not exist in the headset.
6. **Dwell targets: `depthTest:false` + high `renderOrder`** so scenery
   never occludes them.
7. **`node --check` cannot parse these pages** (top-level await). Extract
   each `<script type="module">` body and parse with
   `./node_modules/.bin/esbuild --format=esm --target=es2022`. Run this
   after every edit; also beware `Edit`-tool substring traps (an edit once
   matched inside `async function` and silently broke the page — verify
   with the parse step, not by eye).
8. **glTF conversion:** Blender `(x, y, z)` → three `(x, z, −y)`. Blender
   +Y (north) becomes three −Z.
9. **Renderer color:** the demos use `ACESFilmicToneMapping` +
   `outputColorSpace = SRGBColorSpace`. Author/check Blender renders in
   the **Standard** view transform to match approximately.
10. **Chrome headless is broken on this machine** — no screenshots. Verify
    JS by parse + emulator curl greps; verify visuals by Blender renders.
    State plainly in the final report what was and wasn't visually
    verified.
11. **Audio autoplay:** create/resume the AudioContext inside a click
    handler (the page's start button), or nothing will sound on Safari.
