# Local menu film recorder

This optional development tool records the actual animated Tervain menu scene at **1920 × 1080, 30 fps, High quality**.
It imports the game's `MenuScene` and `Grade`, including the tree, figure, Hegemony standard, fire, smoke, crows, wind,
mist, sky, and lanterns. The camera remains fixed, as in the game menu.

The film canvas composites the original procedural wordmark, bronze frame, leather, grime, and menu text over the
native WebGL render. `createMenuScreen` and the real stylesheet provide desktop layout and font measurements. This is
not a DOM screenshot or a recording of the computer screen; no still image is looped. The 2D text/compositor reproduces
the menu presentation but does not capture browser focus, hover, the SVG ink filter, or audio-unlock controls.

The tool is a separate development entry point. It is not imported by the game or included in the production bundle.
It requires the existing repository dependencies and does not add packages or use an external recording service.

## Start and inspect

From the repository root, run:

```sh
node tools/menu-film-server.mjs
```

Open **http://127.0.0.1:5180/tools/menu-film.html**. The server binds only to `127.0.0.1`. After the menu textures,
Hegemony emblem, shaders, and sky lighting finish preparing, the page exposes two buttons:

- **Record 5-second test**: inspect image composition, actual animation, dimensions, and frame pacing before a full run.
- **Record full song**: record **216 seconds** of menu motion, slightly longer than the approved score.

Keep the recorder page active and visible throughout the recording. Background tabs can throttle animation or canvas
capture. The preview scales to the window, while the underlying render and recorded canvas remain 1920 × 1080 pixels.

The browser uses WebM VP9 when supported, with VP8/WebM fallbacks, at a requested video bitrate of 16 Mbps. It records
video only. Chunks upload serially to the local receiver and stream to disk without holding the full video in memory.
The visible progress and completion message report elapsed time, rendered frames, bytes, and the exact output path.

## Output directory

By default, recordings are written to **`../tervain-menu-film-output`**, a sibling directory outside the repository.
Override it when launching the server:

```sh
TERVAIN_MENU_FILM_OUTPUT='/absolute/path/to/menu-film-output' node tools/menu-film-server.mjs
```

Each run creates a new `test-motion-<UUID>.webm` or `menu-motion-<UUID>.webm` file. Existing files are never overwritten.
Interrupted or failed runs remain partial files and are reported as incomplete. `GET /__menu_film/status` exposes local
recording progress; recording write endpoints accept requests only from this recorder's own local origin.

## Add the complete song

The captured WebM has no audio. After the full recording completes, mux the **complete approved AAC score** separately.
For the 0.0.5 score, its AAC track lasts about **214.213 seconds**; the film ends at the next full 30 fps frame,
**214.233333 seconds** (6,427 frames). The following command encodes the native menu motion to H.264 and copies the whole
AAC track without an additional audio encode. Do not add `-shortest`, audio fades, or an audio duration trim.

```sh
ffmpeg -i '/absolute/path/menu-motion-UUID.webm' \
  -i '/absolute/path/the-sovereigns-oath-menu.m4a' \
  -map 0:v:0 -map 1:a:0 \
  -vf 'fps=30,trim=end_frame=6427,setpts=PTS-STARTPTS' \
  -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p \
  -c:a copy -movflags +faststart \
  '/absolute/path/Tervain-0.0.5-The-Sovereigns-Oath-menu.mp4'
```

Use an AAC source for `-c:a copy`; the Opus game asset is not interchangeable with it. If the approved song changes,
measure its complete audio duration and increase the native capture duration and final video frame count accordingly.
Check the final file with `ffprobe`, inspect samples from the start, middle, and end, and confirm that the entire audio
track is retained and that the scene continues animating for the complete song.
