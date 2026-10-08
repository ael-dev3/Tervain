# Whole figures, natural residents, fuller crowns and steady timber (A69, 0.0.13)

A69 repairs the wanderer's model where it opened into cracks and bent badly, makes the residents turn, face, sit and
talk the way people do, draws the tree crowns fuller and lit through, and stops the timber framing of houses flickering.
The wanderer is the main concern. One model file is new, the wanderer's; no other model, texture, sound or music file
changes.

## The wanderer

### Cracks

The animated reduction the game played (A45, `public/models/hero/weathered-wanderer-animated-hero.glb`, 65,000
triangles) was reduced without merging the copies of each vertex along its texture seams. It is 42 loose pieces with
about 62 m of open edges, which part into cracks across the face, the collar, the hands and the clothing as soon as the
figure moves.

The approved 49,500-triangle mesh of the same character (A37, `weathered-wanderer-hero-50k.glb`) is one closed piece in
the same pose, space and texture layout. The new file, `public/models/hero/weathered-wanderer-hero-sealed.glb`, is that
mesh skinned to the A45 skeleton:

- Each vertex takes the A45 skin weights at the nearest point of the A45 surface, preferring faces turned the same way.
- Every copy of a seam vertex gets the same weights, so a seam cannot open.
- One light smoothing pass, then the four strongest influences.
- The A45 skeleton, its six clips, material and JPEG textures are copied unchanged.

| | A45 reduction | Sealed |
| --- | ---: | ---: |
| Triangles | 65,000 | 49,500 |
| Vertices | 39,622 | 30,494 |
| Pieces | 42 | 1 |
| Open edges | about 62 m | none |
| Bytes | 11,900,048 | 11,202,084 |

The sealed surface lies within 0.1 mm of the rigged original at the median, 2.4 mm at the 95th percentile and 9.4 mm at
most. Its SHA-256 is `ee7ce82c84e451fda67901d02335691c0d1d8eac0239cfe16aedb65dc852d293`. The A45 reduction is kept in
the repository for audit and is no longer loaded.

Reproduction: `python tools/hero/rebuild-hero.py` (numpy; deterministic) writes the file from the two sources, and
`node tools/hero/record.mjs` records it in the model ledger.

### Bends

The wanderer is now skinned with dual quaternions, as the residents are (A63). Linear blending pinched the shoulders,
elbows, wrists and hips of an A-pose rig without twist joints into folds. Measured on the sealed mesh, the share of
triangles shrinking below 70% of their area falls from 8.3% to 5.4% running, 16.8% to 9.3% boxing and 15.7% to 9.6% in
the death fall.

### The bow

Carried, the bow hangs upright beside the leg instead of lying across the body, and the bow hand closes round its grip:
the hand turns so its fingers wrap the handle.

## Residents

### Turning

A resident turns at no more than about 180° a second walking and 125° standing, easing into the end of the turn, at any
frame rate. Before, every turn was an uncapped ease of 540–720° a second at the start. A turn on the spot is stepped
round: the walk plays by the arc a stride would cover. A resident sits on a seat or starts work at a work place only once
turned to face it.

### Facing and stopping

- **Meeting places.** Where two residents share a place, each faces whoever is there with them; alone, they keep the
  place's heading.
- **Seats.** Seated, they talk from where they sit; they no longer swivel on the bench.
- **Doors.** The places outside doors look out from the building. Coming out of their door, a resident faces the way they
  are going, not the door they went in by.
- **Remarks.** A passing remark is made on the move. Only an exchange or a scene between two people stops a resident and
  turns them to the listener. Two people only talk between themselves when both are at their places.
- **Walls.** The caravan master stood a metre and a half from the stockade, facing it; he now watches the gate and the
  track in. The fisher and the keeper of the hamlet look out over their yards rather than at a door and a corner.
- **Doors swinging.** Doors open for residents on their way, not for those standing at their places outside.

### Routes

The grid's route used to end at the centre of the goal's 2 m cell, up to 1.4 m aside, and then turn back to the place.
The last leg now goes straight to the place when nothing is in the way.

### Animation placement

Some of the library's standing clips were made a step aside and half turned away. `talk.chat` stood 0.5 m off with its
chest and head turned 35–50°; `talk.open`, `talk.right` and `talk.hip` were turned 10–18°. Standing, idle and talking
clips are now baked centred on the actor's spot and turned to its heading (`CENTRED_CLIPS`). Work and fight clips keep
their authored placement at their tools and stances.

### Sitting

Measured before, on the maintenance worker and the baker:

- The body was lifted toward the seat's height while still standing, floating about 15 cm.
- Getting down ended about 0.3 m behind the bench, then slid forward onto it.
- Starting to talk slid the seated body 0.36 m sideways.
- The feet hung about 20 cm off the floor on the 0.55 m benches.
- The resident walked away 0.85 s after beginning to get up, mid-rise.

Now:

- Every clip that sits, including getting down and getting up, is measured on each model where it is seated. Its own
  seat is stood on the real one, weighted as the mixer weighs its pose, so changing clips moves nothing on the bench.
- The body is lifted only as far as the hips are down.
- A resident walks up to a spot in front of the seat, where getting down begins on their feet, and sits back onto it.
  They get up there and walk off once on their feet: about 2.7 s, the moment the clip stands.
- The benches are higher than the library's chairs (0.55 m against about 0.42 m). A resident sits nearer the front edge
  and plants their feet with a two-joint leg reach.
- At night, a resident whose home is a bench gets up and rests where they stood.

## Crowns

The broadleaf crowns' leaf plates were cut down to small leaflets when they were exported for 0.0.12, so their cards
are only 5–13% opaque. That art is unchanged. What changes is how its coverage and light are drawn:

- **Edges.** Three's alpha-to-coverage ramp starts at the cut-off, so it trims every leaf edge. The leaf cut-out is now
  centred on the cut-off.
- **Distance.** Mipmapped alpha thins a crown with distance, so alpha is lifted by 12% per mip level first. Distant
  crowns keep their body.
- **Normals.** Three turns a double-sided card's normal toward the eye. Mixed with only 55% of the crown's rounded
  normal, that partly cancelled it on the far side of a crown seen through the gaps. Each face now keeps its own normal
  under 80% of the crown's.
- **Light through the leaves.** It was lost entirely in shadow, so a crown against the sun went dark. A shaded leaf now
  passes on 40% of what it would in the open.
- **Colour.** Greens keep 95% of their saturation (84% before), and the heart of a crown keeps 72% of its ambient light
  (60% before).
- **Shadows.** Three casts an alpha-to-coverage material's shadow at a fixed 0.5 cut-off. The shadow casters now use a
  copy without it, so leaves cast at their own cut-off, 0.35.

Restoring the plates' coverage from their colour, which the cut kept, was tried and rejected. It turned the crowns into
solid plates with dark rims and took the dappling out of their shade.

## Timber that no longer flickers

The settlement's buildings had 3,171 pairs of faces lying in the same plane, which the depth buffer resolves differently
from frame to frame. The largest groups were window glow behind panes (1,000 pairs, 71.9 m²), planks and timber (243),
stone and timber (201), and plaster and timber (155).

Each building material now has a depth rank, applied as a polygon offset, so the higher rank always draws in front.
Stone and rock rank 1; vertex-coloured, glow and daylight surfaces 2; panes 3; timber 4; metal 5. A test builds the
settlement and requires that no two faces of equal rank overlap by more than 2 cm² in one plane.

## Verification

- TypeScript and the regular production build pass, as do **2,973 tests across 277 files**. Tests were added for:
  - the sealed wanderer as one closed surface;
  - turning, facing and stepping round;
  - remarks and exchanges;
  - the last leg of a route;
  - clip centring;
  - sitting from in front of a bench;
  - coplanar building faces.
- Captures reviewed:
  - the wanderer's face and body, walking, running, and the bow carried, raised and drawn;
  - a resident sitting down, seated, talking and getting up;
  - residents spoken to;
  - the people at the waystation;
  - gable ends with and without the depth ranks;
  - five tree views before and after, and the title.

## Limits

- Turning on the spot steps with the walk clip; the library has no turning clip.
- On a seat much higher than the library's chairs, the thighs slope and meet the plank's front edge by a few
  centimetres.
- The leaflet crown art is unchanged; fuller crowns up close would need a new export of the trees.
- Per-frame GPU cost on reference hardware, required remote CI, deployment and the served revision remain separate
  checks.
