# A136: fuller hearth rooms and the inn's sign

Playtest 7 scored the hearth room 8 and the inn's hanging sign 8.5. The rooms had their hearth, fire, pot and mantel
but still read sparse: wide bare plaster above the wainscot and little on the walls. The sign was a plain board on a
bar. This change works on both, keeping the rooms as cheap as they were.

## Rooms

- **Framed walls.** `roomFrame` (presentation/buildings.ts) adds studs between the posts, about 0.8 m apart, from the
  wainscot rail to the plate, and a rail across each panel at 2.05 m where no window breaks it. They avoid windows,
  the doorway and the hearth, and are merged into the shell.
- **Things hung up.** World/dressing.ts adds peg rails (`RAILS`, one strip with six pegs) hung with each household's
  things: pans, ladles, sickles, coils of rope, axes, a frame saw, baskets and strings of onions (`HungKind`). The
  first rail looks for wall near the hearth. Rows that find no free wall hang from the ceiling joists instead, in a row
  near the hearth and never over the fire. Every hearth also has a pan and a ladle on hooks under the ends of its
  mantel.
- **By the fire.** Split firewood is stacked against the breast on whichever side has room (`firewood`). A rug lies
  before the hearthstone where no table rug is already there.
- **Stores.** Sacks and wicker baskets stand together against a wall (`STORES`).
- **Firelight.** The fire module draws a soft pool of warm light on the floor before each hearth. It is a fourth card
  in the same additive draw, falls off with a smooth power curve and flickers with the flames. The room's point light
  now decays linearly (decay 1, was 1.25), so its warmth reaches the far walls.

All the new pieces are built in code (presentation/clutter.ts). They are a few dozen triangles each, with wood, iron,
rope and wicker told apart by vertex colour, and share one material. Each kind is one instanced mesh, shown only for
rooms near the camera, like the existing shelves.

## Sign

`presentation/innSign.ts`: the bracket moved to the east end wall near the front corner, so the board faces the street
and no longer hangs across a window.

- **Bracket.** A wrought-iron wall plate with two bolts, an arm with a curled tip and knob, a strut, and two scrolls
  between them. A ring sits round the arm at each hanging point.
- **Board.** Three boards, the top one arched, hung from four-link chains on eyes. Iron corner straps hold it.
- **Painting.** Both faces are painted with a tankard of ale (body, hoops, handle, foam) and a sprig of hops on a dark
  green ground in an ochre border.
- **Weathering.** The border has gaps, the paint has flaked to grey wood in patches, rust runs below the straps, the
  bottom edge is stained, and the lowest board has lost a corner.
- **Sway.** The board and chains are built apart from the shell (`BuildOut.apart`). They swing about the arm by
  `signSway`, a slow sway of up to about 7° that strengthens in gusts. With Reduced Motion the board hangs still.

## Before and after

| Before | After |
| --- | --- |
| ![weaver's hearth before](a136-hearth-rooms-and-sign/before_hearth.jpg) | ![weaver's hearth after](a136-hearth-rooms-and-sign/after_hearth.jpg) |
| ![herbalist before](a136-hearth-rooms-and-sign/before_house_c.jpg) | ![herbalist after](a136-hearth-rooms-and-sign/after_house_c.jpg) |
| ![hunter before](a136-hearth-rooms-and-sign/before_house_d.jpg) | ![hunter after](a136-hearth-rooms-and-sign/after_house_d.jpg) |
| ![sign at noon before](a136-hearth-rooms-and-sign/before_sign_noon.jpg) | ![sign at noon after](a136-hearth-rooms-and-sign/after_sign_noon.jpg) |
| ![sign at dusk before](a136-hearth-rooms-and-sign/before_sign_dusk.jpg) | ![sign at dusk after](a136-hearth-rooms-and-sign/after_sign_dusk.jpg) |

The visual gate has new interior spots (`room_b`, `room_c`, `room_d`, `room_f`), and its `sign` spot now looks at the
sign in its new place.

## Still short

The plaster panels are still plain between the timbers. The ceiling stays boarded at the wall top, so no rafters show.
The firewood logs are smooth cylinders without bark texture. The sign's emblem is relief in vertex colour, not a
painted texture.

## Tests

`tests/world/hearths.test.ts` checks that every house has at least four hung things, each clear of the ceiling and the
floor. It checks that most hearths have firewood beside them and that the sign's sway stays under about 7° while
moving most of the time.
