# The first view compiled as it is drawn (A108, 0.0.13)

## Measured first

Before changing anything, the wait from New journey to the world was split by build stage, in served builds of main on
the local GPU (RTX 3080 Ti), Medium, after 60 s in the menu. Whether the link was 20 Mbit/s or unthrottled, it took
about 20 s: the menu has already fetched almost every file (A86), so the wait is local work, not download.

Prefetching the remaining files from the menu was also tried: the building surfaces, and the residents near a new
journey's start. On main these already arrive before the click, and the wait did not move (19.7 s against 19.9 s), so
that change was not kept.

The largest part was the first view's "graphics" stage, 8.9 s. Inside it, the first draw alone took 6.4 s, one frozen
frame, and made 48 shader programs on the spot.

## Fault

The world draws through the grade's linear render target. Before the first view, its shaders were compiled for the
canvas, which is an sRGB output with tone mapping, so three made different programs. Every scene program was made again,
synchronously, inside the first draw. The sun's shadow depth programs were not prepared either. The menu had the same
mismatch.

## Fix

The first view is compiled into the grade's target, with the sun's shadow depth programs too. This is the same
preparation arriving objects already had (A79), here for what is visible only: no hidden pieces and no uploads. The
menu's scene is compiled into that target too.

## Result

Served builds on the GPU, unthrottled, after 60 s in the menu, unless noted:

| | Main | A108 |
| --- | ---: | ---: |
| New journey to the world, Medium | 19.7 s | 14.6 s |
| New journey to the world, High | 20.8 s | 14.9 s |
| New journey to the world, Low | 19.9 s | 14.3 s |
| New journey to the world, Medium, clicked at once | 21.7–22.9 s | 15.9–16.3 s |
| First draw | 6.2–6.4 s (48 new programs) | 0.3 s (1 new program) |
| Longest frame during loading | 5.7–6.3 s | 0.32–0.36 s |
| Page to menu | 3.7–4.1 s | 4.2–4.3 s |

The menu's own scene now compiles its real programs before it shows, which adds about 0.4 s before the menu appears.
