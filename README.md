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
picking a mirror axis, **R** reveals the drawing while Blindness is on, **B** pauses and
resumes Repeat, **Space** makes an abstract shape with Type.

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

**Inverse** (create) draws while the button is *up*: move the mouse, or hover a pen just
above the tablet, and the line follows. Press (or tap the pen) to end and save the shape;
the next move starts a new one. Touch screens can't hover, so it doesn't work with fingers.

**Detach** (create) trails the line behind the pen on a leash, **Distance** px back (0–300),
so corners round off and the line lags behind your hand. The end of the leash is remembered
between strokes, so each stroke starts from where the last one left off.

**X Shapes** (create) sprays a zig-zag fan out to one side of your stroke, at right angles
to the direction you're moving. It grows wilder the longer the stroke, and faster movement
throws it further; **Distance** scales it. As in the desktop client, "faster" is measured
against the average of every move since you first used the module, so it reacts less to
speed over time.

**Median** (create) blends each stroke with the one before. The first stroke after a clear
is drawn normally. Every later stroke also draws a second line halfway between your pen and
the matching part of the previous stroke, so shapes morph into each other in a chain.
Clearing the canvas starts the chain over.

**Pressure** (create) draws a calligraphic stroke that swells and thins with pen pressure.
Full pressure makes it **Pressure** px wide on each side (1–200, default 25). A mouse has no
pressure, so it draws a thin constant line. It looks best in Solid style; in Line style you
see the outline traced around the stroke. Mirror, Gradient and Displace all work with it.

**Blindness** (affect) lets you draw without seeing: the screen stops updating until you
reveal it. **Auto-reveal** (on by default) shows the drawing each time you lift the pen;
**Reveal** or the **R** key shows it any time. Clear still clears the screen.

**Ribbon** (create) draws flowing, twisting ribbons that sag with gravity, saving a new
piece every **Spacing** ms so a stroke leaves overlapping pieces. The ribbon gets wider the
faster you move; **Size** (1–100) raises both the maximum width and how strongly speed
widens it. **Friction** above 100 makes the ribbon speed up rather than settle, and
**Gravity** pulls it down, as in the desktop client.

**Type** (create) makes shapes from letters. Press or drag to stamp random characters in
random fonts, sized by how fast you move (**Size** scales them). **Space** or
**Auto-generate** builds an abstract shape from several distorted letters merged together.
**Key Drawing** stamps the keys you type (while it's on, letter keys type instead of
working as shortcuts). **Distortion** controls how much the letters get mangled. Unlike the
desktop client, which read letter outlines straight from your fonts, the browser version
traces each letter from an offscreen drawing and picks fonts from a list of common names
you have installed.

**Pull** (create) stamps ready-made shapes from a library as you drag, each scaled at random
up to **Size** and, with **Rotate** on, turned to a random angle. The library comes with
Alchemy's own shapes (Bones, Circles, Parts, Tangram); **Load SVG…** adds your own SVG
files to a "My Shapes" group. Pick a group, or "All Shapes" for a random group each time.

**Evolve** (create) stamps shapes bred with a genetic algorithm, rotated to the direction
you're moving. It starts from the shapes on the canvas. Open the **Evolver…** to load
shapes from the canvas, the library or an SVG file, give the ones you like a rank, and press
**Evolve** to breed the next generation; **Mutation** sets how much new shapes get
jittered and smoothed.

**Trace** (create) draws a line that snaps to edges in a photo, which stays hidden unless
**Display Image** is on. **Load Image…** picks the photo; without one it traces the canvas
background image. Each point jumps to the highest-contrast pixel within **Snap** px, if it
differs in brightness by more than **Tolerance**. (The desktop client downloaded a random
Flickr photo; that service no longer works.)

**Shape Swap** (affect) is a small experiment from the desktop client: while it's on, your
last long stroke (over 25 points) comes back after you clear the canvas. It's kept for the
session only.

The desktop client loaded these shape libraries from PDFs. Browsers can't read PDFs
without a library, so the built-in shapes were converted with `tools/build-shapes.js`
(which needs `pdftocairo` from Poppler) and you load SVG files instead.

**Color Switcher** (affect) gives each new stroke a new random colour and/or transparency.
**Base Color** switches the colour, wandering around the base colour in the swatch next to
it (it starts as your toolbar colour) by up to **Range**. **Transparency** switches the
opacity too, and **Constant** keeps switching while you draw. The toolbar colour and opacity
update to show what it picked. As in the desktop client, the hue doesn't wrap around: near
red it drifts toward orange and yellow, not toward purple.

**Limit** (affect) keeps only the most recent **Number** shapes (default 10); older ones
disappear as you draw. Strokes in progress and mirror copies count too. Turning it off
doesn't bring removed shapes back.

**Random** (affect) jiggles finished shapes: hover inside one without pressing, and the
points near the pointer move at random on every move, by up to **Distortion** × 0.15 px.
As in the desktop client, "near" means the point's x *or* y is within 5 px of the pointer,
so it disturbs a cross through the pointer rather than a small circle.

**Repeat** (affect) makes copies of a finished shape follow the pointer while you hover
over it (no pressing), one every **Interval** × 2 + 50 ms. The trail is saved when you move
off the shape or press. **Repeating**/**Paused** (or the **B** key) pauses and resumes it.
It uses the shape's bounding box, so it's easier to hit than Smooth or Random.

**Gradient** (affect) fades each shape from its colour to transparent, from where the
stroke starts to where it ends.

**Smooth** (affect) rounds off finished shapes: hover over one without pressing and it
gets smoother about every 75 ms. "Over" means inside the shape's area, so for a line you
need to hover inside a loop it makes. **Repeat** adds smoothed copies instead of changing
the shape; like the desktop client, the copies use the current toolbar colour, opacity,
style and weight.

**Displace** (affect) bends the shape you're drawing: every point moves away from the
pen's end point when you draw slower than the **Displacement** setting, and toward it when
you draw faster. Its strength depends on how many pen events arrive per second, so a fast
tablet makes it stronger.

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
- **Test Evolve and the Evolver window.** Rank and evolve a few generations from the
  canvas, the library and an SVG file, then draw with the result.
- **Test Trace with a real photo.** Load a high-contrast image, trace it blind, then turn on
  Display Image to compare, and try the Snap and Tolerance settings.
- **Test Pressure with a pen tablet.** It has only been tested with a mouse and in Node;
  check that pressure changes the width as expected and that the Pressure setting feels
  right.

## Layout

| File | Ported from | What it does |
| --- | --- | --- |
| `js/shape.js` | `core/AlcShape.java` | A vector shape and the line smoothing (`curveTo`, `lineTo`) |
| `js/canvas.js` | `core/AlcCanvas.java` | Shape lists, rendering, commit/clear, pointer event dispatch |
| `js/modules/shapes.js` | `create/Shapes.java` | The Shapes create module |
| `js/modules/splatter.js` | `create/SplatterShapes.java` | The Splatter create module |
| `js/modules/speed.js` | `create/SpeedShapes.java` | The Speed create module |
| `js/modules/scrawl.js` | `create/ScrawlShapes.java` | The Scrawl create module |
| `js/modules/inverse.js` | `create/InverseShapes.java` | The Inverse create module |
| `js/modules/detach.js` | `create/DetachShapes.java` | The Detach create module |
| `js/modules/xshapes.js` | `create/XShapes.java` | The X Shapes create module |
| `js/modules/median.js` | `create/MedianShapes.java` | The Median create module |
| `js/modules/pressure.js` | `create/PressureShapes.java` | The Pressure create module |
| `js/modules/ribbon.js` | `create/RibbonShapes.java` | The Ribbon create module |
| `js/modules/type.js` | `create/TypeShapes.java` | The Type create module (with glyph tracing) |
| `js/modules/pull.js` | `create/PullShapes.java` | The Pull create module |
| `js/modules/evolve.js` | `create/EvolveShapes.java` | The Evolve create module and its breeding |
| `js/modules/trace.js` | `create/TraceShapes.java` | The Trace create module |
| `js/modules/shapeswap.js` | `affect/ShapeSwap.java` | The Shape Swap affect module |
| `js/shapelib.js` | `core/AlcUtil.getPDFShapes` | Shape libraries: SVG path parsing, loading SVG files, stamping |
| `js/shape-library.js` | `shapes/` | The built-in shapes, generated by `tools/build-shapes.js` |
| `tools/build-shapes.js` | — | Converts a folder of PDFs into `js/shape-library.js` (`node tools/build-shapes.js <folder>`) |
| `js/modules/blindness.js` | `affect/Blindness.java` | The Blindness affect module |
| `js/modules/colorswitcher.js` | `affect/ColorSwitcher.java` | The Color Switcher affect module |
| `js/modules/limit.js` | `affect/Limit.java` | The Limit affect module |
| `js/modules/random.js` | `affect/Random.java` | The Random affect module |
| `js/modules/repeat.js` | `affect/Repeat.java` | The Repeat affect module |
| `js/modules/mirror.js` | `affect/Mirror.java` | The Mirror affect module: reflected copies while you draw |
| `js/modules/gradient.js` | `affect/Gradient.java` | The Gradient affect module: fade to transparent |
| `js/modules/smooth.js` | `affect/Smooth.java` | The Smooth affect module: round off shapes you hover over |
| `js/modules/displace.js` | `affect/Displace.java` | The Displace affect module: swell or shrink shapes as you draw |
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
