# Sixth pass of bug scouts (A99, 0.0.13)

The sixth pass reread what had been read only once:
- the world's construction (terrain, colliders, the route grid, water);
- the menu, loading and prefetch;
- the Gothic 3 pages a second time;
- the model-file receipts and the hosted base path.

Each fault was confirmed against the code. Those marked *(test)* have a test that fails without the fix. The gate was
also checked in the served build on the GPU.

## The world

| Fault | Fix |
| --- | --- |
| **The stockade's gate was a hole of a different shape from the one seen.** The wall's collision dropped whole 3 m runs by their middles, leaving 0.6 m of standing logs on each side of the gate to walk through. The gate's two great posts, and its leaves standing open, had no collision at all. *(test)* | The wall is cut exactly where its logs stop. The posts and both leaves are solid, built from the same numbers as the gate itself. |
| **The arrival track crossed the gate on a slant, through the open northern leaf and by the northern post**: walked through, unseen, until they became solid. | The leaves stand folded back against the inside of the wall (one shared value for both the builder and the collision). The track runs through the middle of the gate. |
| **A spot boxed in by scenery snapped to the nearest open place by grid steps, not by distance.** The caravan master's spot, between the wagon shafts and the stockade, snapped across the wall, so any new route to it ended outside the stockade. *(test)* | The nearest open place is measured from the spot itself. |
| **A spot could snap into a one-cell pocket with no way out**, and the route search then returned nothing. A bandit chasing someone standing there found no route. *(test)* | A pocket with no open neighbour is never chosen. |

## The menu and loading

| Fault | Fix |
| --- | --- |
| **The Low preset did not reach the renderer until a world was built.** A Low title still drew bloom and shadows, and looked different from the title seen after a journey. | The saved preset is applied when the game starts. |
| **A model asked for again while its first copy was still being written to the cache was downloaded twice** (multi-MB files). *(test)* | A copy still being written is waited for. |
| **A failure to compile the menu's shaders ahead left the menu never ready, and a failed headland ground texture went unreported.** | Compiling ahead is only a saving: on failure the menu goes on. The plain ground stays, with a warning. |

## The Gothic 3 local viewer

| Fault | Fix |
| --- | --- |
| **The first element of a mesh was never checked**, unlike every later one. An index past its vertices, or attribute counts that disagree, made the whole instanced mesh vanish or drew it with NaN normals. *(test)* | It is checked like the rest. A bad one fails that mesh alone. |
| **A second click while the first folder was still being read started a second load**: two renderers, worlds and frame loops on one canvas. | One load at a time. Clicks are free again once a load has failed or been given up. |

## Found sound by the same reads

- **Places:** every anchor, spawn, pickup, route point and room doorstep is walkable, and every doorstep is reachable.
- **Terrain:** physics, height queries and the drawn ground agree, with no seams. Its caches give the same answer in any
  order.
- **Water:** inland water has no NaN anywhere. The only deep water on walkable ground is under the footbridge. The ford's
  depth agrees between drawing and physics.
- **Colliders:** grid keys and degenerate segments are safe, and the lighthouse door matches its mesh.
- **Model files:** every model is listed, with matching hashes and sizes, in both the game's table and the licence
  ledger; regenerating the table changes nothing.
- **Hosting:** the base path, model URLs and study pages resolve from the hosted prototype.
- **Prefetch:** files fetched from the menu are the files the journey asks for.
- **Menu scene:** rebuild, disposal and music sync.
- **Gothic 3:** binary reading, image decoding, landscape streaming and cancellation; no leaked object URLs or workers.
