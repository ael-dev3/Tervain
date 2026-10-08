# Rooms and furniture — 0.0.13

Every building can be walked into ([A66](../decisions.md)). The six houses, the reeve's house, the bakery, the inn, the
mill, the sluice hut, the quarry office, the crew bunks, the overlook lodge, the fisher's house, the net store, the
keeper's cottage and the shrine hall now have real walls about a doorway, a floor, a boarded ceiling and furniture.
Before, each was a solid block with a door painted on it; only the archive and the lighthouse compound could be
entered, and they keep their own rooms. The furniture was made with Meshy's text to 3D from written descriptions and
prepared for the game.

One description of each room ([world/interiors.ts](../../src/world/interiors.ts)) serves the shell, the colliders,
the floor underfoot, the furniture, the light and the sound, so they agree.

## Walls, doors and windows

[buildings.ts](../../src/presentation/buildings.ts) builds each ordinary building's walls as slabs of a real
thickness (24 cm for plaster and timber, 34 cm for stone) standing inward from the old footprint, with the doorway cut
through the front wall at the door's measured place and size. The exterior is unchanged: the timber frames, boards and
rails stop at the doorway's sides, and every decorative random draw happens in the same order as before, so no stone,
board or shutter moves. Timber buildings are lined inside with boards. The dark core that filled every building is
gone.

The door's leaf is built apart from the merged shell and hangs from its hinge just inside the doorway
([doors.ts](../../src/presentation/doors.ts)). It swings inward when the wanderer or a resident comes within 2.4 m of
the doorway, stays open for a moment after the last of them has gone, then shuts, each with its sound. Doors have no
collider: they open before anyone reaches them. Residents who go home at night walk to their doors, which open for
them, and the doors close behind them.

Windows keep their outer faces. From inside, each window shows the light outside: a pale pane that dims to the blue of
night, in a timber frame with a sill and mullions.

## Inside

[`roomInterior`](../../src/presentation/buildings.ts) gives every room:

- a plank floor (stone flags in the shrine hall) level with the doorstep, and a stone sill through the doorway;
- a timber frame round the inside of the opening;
- a boarded ceiling at the wall top, with tie beams and wall plates under it;
- where the building has a chimney, its stack standing on the floor and a fireplace against it, with stone piers, a
  timber mantel, a soot-dark firebox with logs, embers that glow after dark, and a hearth slab. The fireplace faces the
  front unless it would crowd the way in from the door; then it faces the middle of the room. The bakery's clay oven
  stands at its chimney instead.

The shrine hall's colonnade parts before its great door, so the way in is clear.

## Underfoot and overhead

[terrain.ts](../../src/world/terrain.ts) gives every room's floor and doorway to `groundAt`, so the wanderer stands on
the floor and saves made inside restore there. [colliders.ts](../../src/world/colliders.ts) replaces each building's
solid block with:

- its walls about the doorway;
- the wall over the door, which a jump in the doorway meets;
- the roof over the room, from the wall top up, which is the room's ceiling for heads and the camera and still the
  building's bulk to anything outside;
- the floor, for rolling cargo to rest on;
- the chimney stack, the fireplace, and every piece of furniture, each as tall as it stands.

The walking grid still sees each building's footprint as closed, through the roof's collider, so residents' routes are
unchanged; the residents do not walk into the rooms. The camera keeps inside a room the way it keeps clear of walls
outside.

## Light and sound

The sky's fill light knows nothing of walls and roofs, so a room would be lit as brightly as the open valley. While the
camera is in a room ([interiorLight.ts](../../src/presentation/interiorLight.ts)), the sky's image light and its
hemisphere light ease down, and a warm light glows from the room's fire, or hangs under its beams where it has none,
brighter after dark. On Low, which draws no shadows, the sun is dimmed indoors too, since nothing else stops it shining
through the roof. One light serves every room, so the number of lights in the scene, and with it every material's
shader, never changes.

Indoors, the world outside sounds muffled and the room adds its own reverb, as the archive already did.

## Furniture

Seventeen pieces were made with Meshy's text to 3D (a shape, remeshed to a triangle target, then PBR textures) from
the descriptions in [plan.json](../../tools/meshy-furniture/plan.json): a bed, bunk beds, a trestle table, a stool, a
chair, a chest, an open shelf of crockery, a cupboard, a writing desk, a bookshelf of ledgers and scrolls, a clay bread
oven, a shop counter, a workbench, a weapon rack, a stone altar, grain sacks and a loom. A fireplace was asked for twice
and came back as loose pots and logs both times; the rooms build their fireplaces in code instead.

[prepare-meshy-furniture.py](../../tools/prepare-meshy-furniture.py) turns each piece so its front faces into the
room, scales it to its size (its height exactly, its width and depth as near as a fifth either way of that scale
allows), centres it on its footprint and stands it on the floor. It reduces the colour maps to 1024 px (512 px for small
pieces), the normal maps to half that and the metal/roughness maps to a quarter, and keeps wood matte. The pieces have
1,550–5,065 triangles each (the runtime refuses more than 6,000) and come to 6.4 MB together.
[manifest.json](../../public/models/furniture/manifest.json) records each piece's size, triangles, hash, prompt and
Meshy tasks, and the game checks each file's size and hash as it loads.

[world/furniture.ts](../../src/world/furniture.ts) furnishes each kind of building from a wish list: beds, a table with
stools and a chest in the houses, a desk and bookshelf for the reeve, the oven, counter and sacks in the bakery, tables
and a counter in the inn, bunks in the crew bunks, a rack in the lodge, an altar, bookshelves, racks and rows of benches
in the shrine hall, and so on. A small solver stands each piece square against a wall or free on the floor, and keeps:

- the way in from the door clear;
- tall pieces off the windows (bunks excepted);
- the fireplace and the space to tend it free;
- a walkway about free-standing tables;
- every piece reachable on foot from the door, without most of the floor being cut off. A piece that would break
  any of these is left out.

The placements are computed once and give both the colliders and the drawn furniture.

[presentation/furniture.ts](../../src/presentation/furniture.ts) draws one instanced mesh per kind of piece. A room's
furniture is drawn only while it can be seen into: the camera is inside it, or near it while its door stands open.

## Cost

- Geometry: the buildings' shells, inside and out, went from 194,207 to 223,159 triangles. The furniture adds about
  40,000–60,000 triangles while the camera is in a room or by an open door, and nothing behind shut doors.
- Downloads: 6.4 MB of furniture.
- Draw calls: one per kind of piece drawn, and the door leaves (two materials each), which frustum culling trims.
- The furniture solver places every room's furniture once, in under 0.1 s on the development machine.

## Provenance

The furniture was generated through the Meshy API on 8 October 2026 on the owner's account. Each piece's prompt, its
preview and refine tasks and its source file's hash are in the furniture manifest, and each piece has its own source
record in the [model ledger](model-licenses.md). The responses do not record the account plan at generation time, so
their license evidence is pending classification, and commercial clearance is not established.

## Reproduce

Requests spend Meshy credits, and a new run gives new shapes. With `MESHY_API_KEY` set and a working folder outside the
repository:

```sh
node tools/meshy-furniture/generate.mjs <dir>
python tools/prepare-meshy-furniture.py --source <dir>
node tools/meshy-furniture/record.mjs
```

The preparation writes the pieces, their manifest and `src/world/furnitureSizes.ts`, and the record step adds them to
the model ledger.

## Verification

New tests check that:

- every building but the archive has a room, with a floor under the room and its doorway level with the doorstep, and
  no floor through the walls;
- the wanderer can walk in through every doorway and through no wall, and the real player controller walks up four
  rotated doorsteps and onto the floor;
- a jump in a doorway meets the lintel, and one inside meets the ceiling;
- every piece of furniture has a finite collider as tall as the piece;
- the furniture keeps inside its room, off the way in, apart from other pieces and off the windows, and every room is
  walkable from its door to every piece;
- doors open for someone at the doorway, linger, then shut, and stay still while the world is paused;
- the room light glows from the fire, warmer at night, and fades on leaving;
- the shipped furniture matches its manifest, budget, sizes and model-ledger records.

Existing tests now build the open shells. The test of the closed door's treads walks on into the room. The world's
loading test counts the furniture among its models.

Captures were reviewed of every kind of room from outside, with the door shut and open, and from inside, by the
game's own camera and by fixed views.

## Limits

- Residents do not go into the rooms: at night they still reach their door and are not seen again until morning.
- Windows do not open to the outside: from inside they show the light, not the view.
- Doors swing for people only, not for animals or rolling cargo.
- The furniture's licence evidence is pending, as for the other Meshy models.
- Interior lighting has no shadows of its own; furniture is lit by the fire and the dimmed sky.
