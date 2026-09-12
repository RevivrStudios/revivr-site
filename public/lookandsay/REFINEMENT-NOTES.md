# Look & Say refinement

Local review, 2026-09-08. MRI and Open Space are unchanged by this refinement.

- BlenderKit Simple Single Bed, asset base ID `3c278acd-7739-404d-85c3-35a8df733e19`.
  Authenticated download, royalty-free source. Original is outside the repository.
  Optimized GLB is git-ignored in `assets/local-bed/single-bed.glb`; 29,635 triangles,
  1024px texture limit, 6.25 MB. Review publication rights before shipping this file.
- Replaces fallback furniture only after successful model loading; fallback remains
  usable when the local asset is missing. Floor contact and 2.1m length are tested.
- Drag mouse or touch on room canvas to turn. Explore room hides the communication
  board, retains a return button, and enables arrow keys; Escape returns to the board.
  Automated camera movement is removed. Headset camera pose remains XR-controlled.
- Icons retain text labels and existing meanings. Increased contrast and pale inset
  backgrounds are shared with VR tiles; high-contrast mode remains available.

## Generated artwork

Asset: `assets/garden-photograph.jpg`, generated using the built-in image tool.
Prompt: "Use case: photorealistic-natural. Asset type: landscape photograph used as
a framed print inside a calm med-tech bedroom. A genuinely photographic view of a
sunlit garden with a graceful Japanese maple, natural green leaves, soft morning
light on ferns and a gentle mossy stone path, serene inviting and optimistic. Fine
real leaf detail, believable textures, gentle color, professional landscape
photography. Landscape 3:2 composition. Fill the image edge to edge with the
photograph only, no frame, no wall, no people, no typography, no illustration."

Visual room review and tablet/headset performance and input testing remain required.

## Room prop replacements

Authenticated BlenderKit downloads, optimized locally in ignored `assets/local-props/`:

- Living room curtains: `93f849d0-1f40-424c-9536-46c8a9a89c19`.
  Modeled fabric folds; opaque-exporting central sheer removed to preserve the view.
- Office Wall Clock: `72c01a0b-84e3-475e-9ab9-b4697fb05074`.
  Numbered face, minute marks, and detailed hands replace the unmarked clock.
- Potted Thyme Plant: `d1d0bd77-ceeb-436c-83db-747a900b8807`.
  Textured foliage and a glazed pot replace the faceted plant.
- Arch Bedside Table: `c124e7cf-442b-4c3e-9fa5-bf2cb54ef9e2`.
  Two oak cabinets with rounded openings replace basic side furniture.

Textures capped at 1024px, except curtains at 2048px. Each prop is below 60,000
triangles; curtain and cabinet copies share geometry and materials. Exported assets
were inspected with offline renders. Straight rounded window joinery and lightly
tinted glass replace jagged inserts. Original props remain as download fallbacks.
Floating particles and their per-frame animation are removed entirely.
These changes are local, not deployed. Real tablet/headset performance is not yet measured.

Replacement correction: GLTFLoader sanitizes punctuation in imported node names.
Look & Say now matches both source and sanitized names and detaches the obsolete
bed, curtains, clock, cabinets, plant, and window inserts after successful loading.
Regression tests parse the real room GLB and assert those nodes no longer exist
after replacement; name-matched stand-in fixtures are no longer used.

Additional props: Malak Upholstered Chair (`a9086998-2c27-45b4-934e-acf009663375`,
21,012 triangles) and Stack of books (`87b81438-9883-4787-a86d-58135ec892a5`,
5,000 triangles), authenticated BlenderKit downloads in the same ignored local
asset directory. The bedside plant reuses the textured thyme model at tabletop
scale. Replacement matching snapshots originals before loading to avoid removing
new meshes with coincidentally identical source names.

The right-window wall bay has another framed garden print. Window scenery uses
Open Space's curved instanced leaves and 4K cloud panorama with its shared drift
shader; reduced-motion disables drift. No change to Open Space itself.

Visitor chair revised to BlenderKit Wood dining chair
`9b776be3-4668-49fb-8db7-d6a95bae8997`, 21,736 triangles, in the ignored
`local-props/compact-chair.glb`. Placed at 46cm wide with more than 50cm bed
clearance. Removed the obsolete Plane.003 mirror. Added a modeled glass tumbler,
water volume, rim and coaster on the previously empty cabinet, with no additional
reflection render pass. Tests check floor/table contact and chair clearance.
