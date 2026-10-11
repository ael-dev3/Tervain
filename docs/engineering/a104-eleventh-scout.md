# Eleventh pass of bug scouts (A104, 0.0.13)

The eleventh pass read:
- the accessibility and display settings, end to end;
- the spoken lines, scenes and captions;
- the title, its journeys and the loading screen.

Each fault was confirmed against the code. Those marked *(test)* have a test that fails without the fix.

## Accessibility

| Fault | Fix |
| --- | --- |
| **The map circled Rillford while the HUD said to get a bow and knife.** The HUD names the hunting objective; the map marked the water quest's place. *(test)* | The map marks what the HUD names. For Rowan's kit and arrows that is the deepwood, where his camp is. For the hunt itself it marks no single place. |
| **Under reduced motion the film grain still changed 24 times a second in play**, though it was still on the menu. | It is still in play too. |
| **Reduced motion made the camera's height harsher.** It skipped smoothing altogether, so every stair edge and swim bob jolted the view. *(test)* | The height is eased, more gently than usual. Field-of-view changes still snap, as before. |
| **At large text sizes a speech bubble stacked a remark into a narrow column.** Its width was fixed in pixels. | Its width grows with the text. |
| **Captions, the main accessibility text, stayed translucent under high contrast**, unlike toasts and bubbles. | They are opaque black with white text. |

## Speech

| Fault | Fix |
| --- | --- |
| **Neither quarry scene could ever play.** Darin and Pell stand 24.7 m apart, yard to face, since A70 moved the face, and scenes needed their pair within 22 m. *(test)* | Scenes reach 26 m, a foreman calling across his yard. |
| **An overheard scene could start over the player's conversation with someone else.** Remarks already waited; scenes did not. *(test)* | Scenes wait too. |
| **Sel's "Too dark to write" fell only in hours he was asleep.** | He writes until dusk (20:00), and says it in the last hour of light. *(test)* |

## The title and loading

| Fault | Fix |
| --- | --- |
| **After a failed journey and Back, a journey begun elsewhere left the residents near its start as stand-ins until after entry.** The first attempt's partial set of models counted as ready. *(test)* | Models count as ready only when they cover the roles asked for. Those already held are asked for again, from the cache. |
| **A bell strike begun before a quit to the title could ring into the next journey**, which keeps the same world. A102 only covered the pause and a rebuilt world. *(test)* | Strikes belong to the journey that rang them. |

## Read and left as they are

- **Pell's introduction is listed twice.** After his questions his repeatable line is the introduction anyway, so the fourth talk plays it either way.
- **The compass letters and the map's labels do not grow with text size.** Both are drawn to a fixed dial or canvas, and resizing them is layout work rather than a fault fix.
- **The brightness slider brightens the whole menu backdrop**, while in play it lifts only night and shade light. This matches its label, "Night and shade brightness". Bringing the preview into line with play is a design choice for the owner.
- **The menu prefetches the large journey files only once a session.** After a failed journey they are fetched by the journey itself.

## Found sound by the same reads

- **Settings:** reduced motion, frame cap, tree detail, FPS display, guidance and reduced effects reach every system at once, with no rebuild.
- **Journeys and loading:** a journey cannot start twice. Retry fetches again after a failure. The progress bar never runs backwards or past full. The menu prefetch and the journey share their files.
- **Speech:** every line has its clip and its string, and every condition's fact key exists.
