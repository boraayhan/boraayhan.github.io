# Portfolio website

This is a buildless static site. `index.html`, `style.css`, and `script.js` serve
one continuous page with native anchor navigation. Navigation progress uses CSS
view timelines; scrolling has no JavaScript handlers or position overrides.

Experience content lives in `data/experience.json`. Project content lives in
`index.html`. The résumé is `resume.pdf`; `/resume/` and `/resume/software/` open
that same document. `/portfolio/` opens `assets/portfolio.pdf`.

## Hero videos

`COVER_VIDEOS` in `script.js` accepts `[filename, speed, optionalPosition]`.
Each cycle shuffles clips without a position into the remaining slots. Positions
start at zero; negative positions count backward from the end:

```js
['intro.mov', 1.3, 0]   // Always first
['flight.mp4', 1]      // Shuffled
['outro.mov', 0.5, -1] // Always last
```

Use `null` to explicitly leave a clip unpinned. Positions must be unique integers
within the playlist length. Preloading preserves each cycle's selected order.

The originals are build inputs. Playback uses H.264 MP4 files in
`assets/cover_video/optimized/`: desktop fits within 1280 × 720 and mobile uses
a centered 432 × 768 crop. Both use 24 fps, no audio, and fast-start metadata.
A small responsive poster appears immediately. Only the first visible clip
loads at startup; the next is prepared near the end of playback. Reduced-motion
and data-saving preferences keep the static poster. A button pauses/resumes video.

After changing a source video, regenerate the variants with FFmpeg installed:

```sh
python tools/optimize_media.py
```

Small headshot, logo, favicon, and project-image variants are generated with
`python tools/optimize_images.py` (requires Pillow). Full-size originals remain
available for previews and regeneration. Space Grotesk is served locally from
`assets/fonts/`, with its license included.

## Blueprint background

The background is prerendered. Its layout is `tools/blueprint-layout.json`, and
its source images are in `tools/blueprint-sources/`. These are build inputs,
not individual image layers loaded by the website.

After changing the composition, regenerate the static backgrounds using Pillow:

```sh
python3 tools/render_blueprint_background.py
```

The generator writes the 5120 × 8192 master, desktop and mobile variants, and the
small section-bottom fade into `assets/backgrounds/`. Keep these output files in
the repository so deployment requires no image processing. Backgrounds should
remain static images without CSS masks, fixed attachment, or scroll scripts.

## Local checks and preview

```sh
python3 tools/check_site.py
node --check script.js
node --test tools/test_video_order.cjs
python3 -m http.server 8000
```

Open `http://localhost:8000`. Check desktop and mobile layouts, Experience
expansion, project image previews, and the transition between sections.
