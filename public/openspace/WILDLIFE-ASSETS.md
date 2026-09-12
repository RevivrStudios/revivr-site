# Wildlife local review assets

Downloaded through the user's authenticated BlenderKit client on 2026-09-08.
Original Blender files are outside the repository in `/tmp/revivr-wildlife-source`.
Derived GLBs in `assets/wildlife/` are git-ignored for local review, not included
in the published baseline. Firebase copies public files during builds: do not
publish the working directory inadvertently.

| File | BlenderKit asset base ID | Source license |
| --- | --- | --- |
| kohaku.glb | 34f94c8b-b1ae-487a-bcff-450d3d39d245 | Royalty free |
| showa.glb | 92c85287-0fa3-4eb7-8e80-8b154b266790 | Royalty free |
| blue.glb | 6355fedd-ff5d-43b2-bbe8-6fdc4f9dc92f | CC0 |
| brimstone.glb | 43b4a9a9-1d3b-4ba7-a4b0-e8da1d9b8a1d | CC0 |
| dove.glb | 67aec0ca-a905-44ad-9df1-22fea0366eb4 | Royalty free |

The two koi are by Elijah Jamilano. Original packed textures were resized to
1024px for koi and 512px for butterflies/birds. Koi geometry was decimated to
approximately 6K triangles. Exported sampled skeletal clips preserve source
animation; the butterflies use their separate source wings for procedural flaps.
The bird has 359 deform bones, so mobile/headset performance needs device review.

The first room does not request wildlife assets. Later stages load only the
species they use, caching across revisits. Missing local files leave the scene
usable; original simple koi remain as a fallback. Reduced-motion mode freezes
all wildlife via the existing scene animation control.

Paid download access is not a change to the source license. Review public WebXR
distribution against https://www.blendkit.com/docs/licenses/licensing-faq/ before
publishing the royalty-free GLBs or putting them in a public repository.
