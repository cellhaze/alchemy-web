# Alchemy Web

A browser port of [Alchemy](https://github.com/karldd/Alchemy), the experimental open drawing project, using
plain HTML, CSS, JavaScript and the Canvas 2D API.

So far it has a full-screen canvas, four create modules (**Shapes**, **Splatter**,
**Speed** and **Scrawl**), two
affect modules (**Mirror** and **Gradient**), and a toolbar with line/solid style, colour,
line weight and clear.

## Running it

Open `index.html` in a browser. No server or build step is needed. Pointer events are
used throughout, so mouse, pen tablet and touch all draw.

Shortcuts: **S** toggles line/solid, **Backspace** or **Delete** clears, **Esc** cancels
picking a mirror axis.

**Mirror** draws reflected copies as you draw. Horizontal flips left/right, Vertical flips
top/bottom, and both together give four-way symmetry. **Set axis** shows a cyan crosshair;
click on the canvas to move the mirror point there. **Centre** puts it back in the
middle.

**Splatter** (create) throws paint: slow movement makes fat blobs, fast flicks make thin
streaks, and each stroke scatters drips around it. **Size** sets how strongly the width
reacts to speed, and **Drips** sets how many drips each segment throws. It's made for Line
style; in Solid style the drips are too small to fill and the splats become thin slivers,
as in the original.

**Speed** (create) draws a normal line when you move slowly and flings it out ahead of the
pen when you move fast, giving spiky bursts. **Speed** sets how far it flings, and the
**Curved/Straight** button picks the segment type.

**Scrawl** (create) draws a jittery, scribbly line. **Flow** sets how many pen moves pass
between segments (higher means longer, looser segments), **Detail** sets how many wobbly
steps each segment has, and **Noise** sets how far each step can wander.

**Gradient** (affect) fades each shape from its colour to transparent, from where the
stroke starts to where it ends.

Several affects can be on at once, e.g. Mirror and Gradient together.

**Opacity** sets how see-through new strokes are (1–100%). Like colour and weight, it
applies to what you draw next; strokes already on the canvas keep their opacity.
**Background** changes the canvas colour straight away, and exports use it too.

**Flip H** and **Flip V** mirror the whole drawing left-to-right or top-to-bottom, like
Edit > Flip in the desktop client. As in the original, the background image isn't flipped.

**Image…** loads a background image to draw over, centred under the drawing, like View >
Load Background Image. Images larger than the window are scaled down to fit (the desktop
client showed them at full size). **Remove image** takes it away again.

**Export** saves what's on the canvas: **PNG** (with the background, at full screen
resolution), **PNG, transparent** (no background), or **SVG** (a vector file for Inkscape,
Illustrator or a browser). The background image is included in the normal PNG and
embedded in the SVG; the transparent PNG is the drawing only. Files are named like `alchemy-2026-11-20-143205.png`. The
original Alchemy could also export PDF; that would need a library, so it isn't included.

## To do

- **Fine-tune Splatter.** Compare it with the Java version: blob size depends on how often
  the browser sends pointer events, so check it on different screens and with pen vs
  mouse, and tune the Size and Drips settings. See the TODO in `js/modules/splatter.js`.

## Layout

| File | Ported from | What it does |
| --- | --- | --- |
| `js/shape.js` | `core/AlcShape.java` | A vector shape and the line smoothing (`curveTo`, `lineTo`) |
| `js/canvas.js` | `core/AlcCanvas.java` | Shape lists, rendering, commit/clear, pointer event dispatch |
| `js/modules/shapes.js` | `create/Shapes.java` | The Shapes create module |
| `js/modules/splatter.js` | `create/SplatterShapes.java` | The Splatter create module |
| `js/modules/speed.js` | `create/SpeedShapes.java` | The Speed create module |
| `js/modules/scrawl.js` | `create/ScrawlShapes.java` | The Scrawl create module |
| `js/modules/mirror.js` | `affect/Mirror.java` | The Mirror affect module: reflected copies while you draw |
| `js/modules/gradient.js` | `affect/Gradient.java` | The Gradient affect module: fade to transparent |
| `js/export.js` | `core/AlcExportDialog.java` | Export as PNG or SVG |
| `js/main.js` | — | Startup and toolbar |

### Adding a module

Create `js/modules/<name>.js` that registers an object on `Alchemy.modules`, add a
`<script>` tag for it in `index.html` after `canvas.js`, and select it with
`canvas.setCreateModule(...)`. The module interface is documented at the top of
`js/modules/shapes.js`. It mirrors `AlcModule`: `setup`, `deselect`, `cleared`,
`pointerDown`, `pointerDrag`, `pointerMove`, `pointerUp`, plus `affect()` for affect
modules.

## Credits

Alchemy was created by Karl D.D. Willis and Jacob Hina, with contributions from the
Alchemy community, and developed with support from the Exploratory Software Project (IPA,
Japan). This web version is a port of their Java source and keeps their design and
drawing logic.

## License

Alchemy is free software released under the GNU General Public License, version 3. This
port is distributed under the same license; see [LICENSE](LICENSE).
