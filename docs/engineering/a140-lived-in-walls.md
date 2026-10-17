# A140: lime that does not repeat, one smoke overhead, and each trade's wall

A139 left four gaps in the village rooms. This pass closes them.

## What changed

- **Lime wash without a visible repeat.** After the skin is drawn, `scatterLime` (presentation/buildings.ts) turns
  each wall face's texture by up to about 30 degrees, shifts it by up to several repeats, and lets it drift slowly
  along the wall with smooth noise. Each face is its own geometry and the drift is smooth, so nothing seams.
- **One smoke overhead.** While the open roof is drawn, `openRoof` stands in its own per-vertex shade for roomShade.
  The roof boards, rafters, purlins, eaves and gable ends all darken together from the wall top to near black at the
  ridge, and more over the fire. The gable ends start from a duller lime, so once smoked they sit with the boards and
  no longer read as fresh whitewash.
- **The woodcutter's plank walls.** A rail of saw and axes (`TRADE_WALL`, world/dressing.ts) goes on the wall nearest
  his workbench that is free; the window over the bench sends it to the back wall. Plank walls take the hearth's soot
  harder and wider than lime wash (`roomShade`).
- **The hunter's things in view.** A pelt high on his right wall, where his first view looks, over the bed, and a
  rack of two longbows and a quiver (new `bow` and `quiver` hung kinds) on the same wall's far end. His bow-rack
  furniture stays on the back wall. A trade's rail sheds a tool at a time until it fits between the windows.

Before is A139; after is this change. Dusk is 19:30, noon 11:00; the roof views look up from the rooms' middles at
noon.

| Before | After |
| --- | --- |
| ![weaver at dusk before](a140-lived-in-walls/before_hearth_dusk.jpg) | ![weaver at dusk after](a140-lived-in-walls/after_hearth_dusk.jpg) |
| ![woodcutter at dusk before](a140-lived-in-walls/before_room_b_dusk.jpg) | ![woodcutter at dusk after](a140-lived-in-walls/after_room_b_dusk.jpg) |
| ![herbalist at dusk before](a140-lived-in-walls/before_room_c_dusk.jpg) | ![herbalist at dusk after](a140-lived-in-walls/after_room_c_dusk.jpg) |
| ![hunter at dusk before](a140-lived-in-walls/before_room_d_dusk.jpg) | ![hunter at dusk after](a140-lived-in-walls/after_room_d_dusk.jpg) |
| ![brewer at dusk before](a140-lived-in-walls/before_room_f_dusk.jpg) | ![brewer at dusk after](a140-lived-in-walls/after_room_f_dusk.jpg) |
| ![weaver at noon before](a140-lived-in-walls/before_hearth_noon.jpg) | ![weaver at noon after](a140-lived-in-walls/after_hearth_noon.jpg) |
| ![woodcutter at noon before](a140-lived-in-walls/before_room_b_noon.jpg) | ![woodcutter at noon after](a140-lived-in-walls/after_room_b_noon.jpg) |
| ![herbalist at noon before](a140-lived-in-walls/before_room_c_noon.jpg) | ![herbalist at noon after](a140-lived-in-walls/after_room_c_noon.jpg) |
| ![hunter at noon before](a140-lived-in-walls/before_room_d_noon.jpg) | ![hunter at noon after](a140-lived-in-walls/after_room_d_noon.jpg) |
| ![brewer at noon before](a140-lived-in-walls/before_room_f_noon.jpg) | ![brewer at noon after](a140-lived-in-walls/after_room_f_noon.jpg) |
| ![weaver's roof before](a140-lived-in-walls/before_roof_weaver.jpg) | ![weaver's roof after](a140-lived-in-walls/after_roof_weaver.jpg) |
| ![herbalist's roof before](a140-lived-in-walls/before_roof_herbalist.jpg) | ![herbalist's roof after](a140-lived-in-walls/after_roof_herbalist.jpg) |

## Cost

The play gate's inside-window phase holds a 16.6 ms median (p95 17.1 ms, max 17.2 ms). Nothing new is drawn for the
lime or the smoke (UVs and vertex colours only); the bows and quiver are two more instanced meshes.

## Not done

The hunter's bow rail lands at the front end of his right wall, outside his first view (the pelt takes the end it
sees); his back-wall rack shows bows in the third view. The woodcutter's tools are on his back wall, not over the
bench. The herbalist's gable, nearest the fire's light, is still the palest surface overhead.
