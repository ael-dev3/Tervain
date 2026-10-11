# Twelfth pass of bug scouts (A105, 0.0.13)

The twelfth pass read:
- the interiors and their furniture;
- how the plants answer actors and props;
- the Gothic 3 study code.

Each fault was confirmed against the code. Those marked *(test)* have a test that fails without the fix.

## Interiors

| Fault | Fix |
| --- | --- |
| **Chairs and stools at a table's left or right side turned their backs on it** (overlook lodge, keeper's cottage, reeve's house, fisher's house). The two sides' turns were swapped. *(test)* | Each seat faces the piece it serves. |
| **Seats beside a piece were placed by the room's axes, not the piece's own facing.** A desk turned to face a side wall had its chair at its narrow end, facing along the wall. In every house the desk's stool landed on the hearth's reserved floor and was dropped. | Seats are placed in the piece's own frame, so a desk's stool sits before its working face. |

## Plants

| Fault | Fix |
| --- | --- |
| **Grass grew through the caravan rest's trough and panniers and the hunter's notice board.** The grass was sown before those props registered as solid. | They are built first, and join the scene where they did before. |
| **Carried or thrown cargo flattened grass harder than the hero.** A crate held at chest height laid a trail, and a thrown barrel flattened a stripe along its flight. | Cargo touches the grass only on the ground. |
| **On a rock, a deck or a stair, the hero still flattened the grass and parted the ferns below him**, as if wading through them. | His trampling and his push on plants follow his own height. |

## The Gothic 3 study code

| Fault | Fix |
| --- | --- |
| **An infinite or absurd SpeedTree size grew leaf cards without end** until the tab ran out of memory. Nothing threw, so A92's per-tree recovery could not help. *(test)* | A size outside a believable range takes the usual one. |
| **Ground vegetation meshes were never checked**, unlike `.xcmsh` elements (A99). One plant with an index past its vertices, or short normals or UVs, failed every draw of its kind, silently. *(test)* | Such a plant is left out with a warning. The rest of the cell still grows. |
| **Each animated actor cloned in the inspector replaced its shared geometry's weights**, and each replaced set kept its own GPU buffer. | The native weights are restored once per geometry. |
| **In browsers without the folder picker, choosing the same folder again after a failed load did nothing.** | The file input is cleared, so the same folder loads again. |

## Read and left as they are

- **Closing a Gothic 3 dialogue mid-line keeps the response given but skips its later effects.** Making a record's run all-or-nothing means rolling back an engine-level sequence. The study route records it for the dialogue work.
- **Leaves knocked from a struck, leaning tree start from the trunk's axis** rather than the crown's centre. Cosmetic.
- **The inn's song checks the room without height.** The roof keeps the camera from getting above it, so it was not reproduced.

## Found sound by the same reads

- **Sleeping spots:** every one resolves, stands clear and can be reached. No two residents share a bed.
- **Furniture:** no piece blocks a doorway.
- **Rooms:** the light and indoor flags agree with the walls and roof. The camera cannot leave even the smallest room.
- **Trampling and strikes:** trample recentering is in whole texels. Tree strikes go by a tree's own identity, not its draw order.
- **Gothic 3 readers:** the binary readers, the pack index, the vegetation offsets and the image arithmetic all stay in bounds.
