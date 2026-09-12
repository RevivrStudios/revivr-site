# Lantern Lake local refinement

- Input now requires double click/tap (500ms, nearby positions) or double XR
  select/pinch (650ms, same handedness). Single presses show nothing. Drag and
  cancellation clear the desktop pair; transient XR disconnections do not clear
  it because Vision Pro may replace the input source between pinches.
- Lanterns burst after rising 3.5–5m, using 96 soft circular particles that expand
  and fade over four seconds. Four simultaneous bursts maximum; GPU resources
  disposed on removal. No explosive audio. Reduced motion uses a static 24-dot
  bloom after 18 seconds instead of ascent/expansion. Headset validation pending.

- Interactive atmosphere: hold click/touch/XR select to brighten a lantern;
  release sends it away. Drag/cancel/disconnect clears the preview. Seed lanterns
  do not count toward the three-release, gently settling water/drift sequence.
- Releases send expanding surface rings and draw same-side koi toward a nearby
  point, easing back over 24 seconds. Rare shooting stars fade across the sky.
  Reduced-motion suppresses rings/stars and leaves wildlife stationary.
- Existing optional sound toggle also enables synthesized filtered water noise,
  quiet boat creaks and decaying stereo chimes. No new audio downloads; muted by
  default and suspended when hidden. Headset and listening QA remain outstanding.

- Density/depth pass: shoreline grass increased to 3,600 tufts, plus twelve
  around each tree (5,760 instances / 86,400 triangles, one batch). Canopies
  replaced with nine smaller overlapping upright foliage clusters per tree,
  stratified trunk spacing and narrower crowns to avoid merged, flattened blobs.
  Vertex-color occlusion darkens undersides; lower tiers are darker than upper
  growth and environment fill is reduced on foliage only. No shadow-map pass.

- Added distant shoreline grass: 1,200 unevenly spaced tufts plus six around
  each of the 180 tree bases. All are sampled onto the actual bank and buried
  9cm; varied height, width and muted greens soften the water/land boundary.
  One instanced batch, 15 triangles per tuft (34,200 total), no new textures or
  animation work. Dockside grass and tree arrangements remain unchanged.

- Follow-up: trees retain seeded grove/canopy variation but now occupy the low
  shoreline band, with every trunk rooted 15cm into the actual triangle mesh
  (raycast), replacing the mismatched elevation estimate. Regression checks
  verify all 180 roots and their proximity to water level.
- Dragonfly import forward axis corrected; heading and pitch follow the actual
  elliptical flight-path derivative. Tests compare model forward to displacement.

- Shoreline now uses uneven groves, depth, visible trunks and offset irregular
  canopy lobes with varied heights, widths and foliage tones.
- Lanterns have a 48-sample curved paper profile, 64 radial segments, fine paper
  fibers/seams, bamboo rims and a less blown-out warm glow. Fireflies use radial
  alpha falloff instead of square point coverage. Grass and stars unchanged.
- BlenderKit Wooden Boat `05d121ea-994c-4992-970e-da26786708cb` imported from the
  authenticated account; 6,058 source polygons, 2K base color / 1K supporting maps.
  Export: assets/boat/wooden-boat.glb. Set to 2.8m long beside the dock with a
  mooring rope and gentle bob/roll; reduced-motion freezes the boat. Source
  /tmp/revivr-room-props/boat.blend, live Blender scene left untouched.

- Fixed dock origin at (0, .46, 18); desktop eye offset 1.65m. Mouse/touch drag
  changes orientation only; tap releases a lantern. XR keeps native head tracking.
- Composition reference: BlenderKit Summer Lake Forest, asset
  `4853e63b-0718-485a-9283-6ef9be712781`. Inspected listing preview; scene not
  imported. Continuous ridges and a wooded shoreline replace isolated cones.
- Curved instanced grass blades replace cylinder reeds.
- Reuses Open Space kohaku/showa assets: four 32–35cm koi swimming below water
  near the dock. Surface opacity reduced to reveal them.
- BlenderKit Anotogaster sieboldii model,
  `362e45ed-9ec5-4416-9cd6-72f418333569`, downloaded through authenticated addon.
  Source has no rig/animation. Wings use lateral vertex deformation; three
  individuals follow gentle flight paths. Reduced-motion freezes wildlife.
  Optimized local GLB in ignored assets/wildlife, source untouched in /tmp.
- Tests cover fixed camera position, drag/tap distinction, finite terrain,
  animal population and underwater placement. Real headset rendering and
  performance remain untested. This work has not been deployed.
