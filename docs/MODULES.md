# Alchemy Modules

What each drawing module in the original desktop Alchemy does and how it works, written
from its Java source ([karldd/Alchemy](https://github.com/karldd/Alchemy):
`src/org/alchemy/create`, `src/org/alchemy/affect` and `src/org/alchemy/core`). Toolbar
and UI code is left out. This was the reference for Alchemy Web; where the web version
behaves differently, the [README](../README.md) and each module's file in `js/modules/`
say so.

## How drawing works (core)

**AlcCanvas** keeps four shape lists: `shapes` (finished), `createShapes` (being drawn
now), `affectShapes` (extra shapes made by affect modules, such as mirror copies), and
`guideShapes` (cyan helper lines that never get saved). Mouse and pen events go to the
one selected *create* module and to every active *affect* module. Each `redraw()` first
runs `affect()` on every active affect, so affects can change shapes while they are being
drawn. `commitShapes()` moves the create and affect shapes into `shapes` and renders them
into a bitmap buffer.

**AlcShape** wraps a Java2D `GeneralPath` with a color, alpha, style (stroke or fill) and
line width. `curveTo()` smooths lines: the first 5 points are joined by straight lines,
and after that each point becomes a quadratic curve that ends at the midpoint of the
last segment. Moves of under 5px are ignored. `spineTo()` makes variable-width strokes:
it records a center line (the *spine*) with a width at each point. It then rebuilds a
closed outline by offsetting every point at a right angle, out along one side and back
along the other.

---

## Create modules

### Shapes
The basic pen: a smooth freehand line, or a filled blob in fill mode. In straight-line
mode you click point by point, a cyan guide line follows the cursor, and a double-click
finishes the polygon. Freehand mode just calls `curveTo()` on each drag. Outline mode
draws a stroke while you work and fills it when you release.

### InverseShapes
Draws while the mouse button is *up*: just moving the cursor traces a line, and pressing
the button ends the shape. This turns normal drawing inside out, so you draw by hovering
and "lift the pen" by clicking. On each mouse move it calls `curveTo()`, then commits on
press and starts a new shape on the next move after release.

### PressureShapes
A calligraphic filled stroke that swells and thins with pen-tablet pressure. Each drag
adds a spine point whose width is `pressure × amount` (default 25). With a mouse the
pressure is fixed, so the width stays at a constant 1.

### SpeedShapes
Slow movement draws a normal line, and fast movement flings the line out ahead of the
cursor, making spiky bursts. Each new point is pushed forward along the direction of
travel by `cursor speed × multiplier` (default 15). Line Type switches between curved
and straight segments.

### XShapes
Like SpeedShapes, but the point is thrown at 90° to the direction of travel. The result
is a zig-zag fan that sprays out to one side of your stroke. The distance is the average
speed plus 1% of the shape's point count, so long strokes get wilder as they go. It always
uses straight segments. The average looks meant to cover the last 10 moves, but each speed
is inserted into a list that is never trimmed or cleared, so it really averages every move
since the module was first used (with whole-number division). It settles over time, so
later strokes react to speed less than early ones.

### DetachShapes
The line trails behind the cursor at a fixed distance (default 100px), like dragging
something on a leash. Each drag works out the angle from the trailing point to the
cursor and sets the new point `distance` px back along that line. As a result, corners
get rounded off and the drawing lags behind your hand.

### ScrawlShapes
A nervous, scribbly line. Every `flow` drag events, it splits the segment from the last
point to the cursor into `detail` steps. Each step gets a random offset of ±`noise` px,
so the line jitters around the path you actually drew.

### MedianShapes
Your first stroke is saved as a control gesture. On every later stroke it draws your
line plus a second line halfway between your current point and the matching point
(by index) of the previous stroke. Each stroke then becomes the control for the next
one, so the shapes blend into each other one after another.

### MicShapes
Your voice controls the line. In *fatten* mode the stroke width follows the microphone
level, so shouting makes it thicker (it uses `spineTo()`). In *shake* mode each point is
pushed out at a right angle by the raw audio sample, so the line turns into a jagged
waveform along your path.

### PitchShapes
Stroke width follows the pitch of your voice: low notes draw thick (up to 50) and high
notes draw thin (down to 1). It uses the Beads audio library (FFT → power spectrum →
spectral peaks) and takes an energy-weighted average of the peaks as the pitch, mapped
across a 50–1800 Hz range. The width eases toward the target by 2px per drag event, so
changes are smooth. Because overtones count, voices read higher than the sung note. The
Upper Pitch slider does nothing: its handler is attached to the Lower Pitch slider.

### SplatterShapes
Paint splatter, adapted from Stamen Design's "Splatter". Each drag segment is drawn as a
quadratic curve whose width is inversely proportional to speed, so moving slowly makes
fat blobs and fast flicks make thin streaks. The width is smoothed from one segment to
the next. Each segment also scatters a random number of small dots ("drips") around its
start point.

### PullShapes
Stamps pre-made shapes onto the canvas. It loads every shape from the PDFs in the
`shapes/` folder (or one chosen subfolder). About every 51ms while you drag, it drops a
random one centred on the cursor, with random scale (0.1–2×) and random rotation.

### TraceShapes
A freehand line that snaps to edges in a photo. It downloads a random Flickr image or
loads one of yours, scales it to fit the canvas and hides it by default. Each point you
draw moves to the highest-contrast pixel within 30px, as long as the contrast passes the
tolerance, so the line hugs outlines you may not be able to see. (The Flickr lookup
uses an old API key and plain HTTP, so it probably no longer works. Loading a local
image is the dependable route.)

### RibbonShapes
Flowing, twisting ribbons, adapted from James Alliban's port of Erik Natzke's ribbons.
Each cursor position becomes a particle with gravity, friction and drag. A closed path is
built from points offset to the left and right of each particle, wide in the middle and
pointed at both ends. Every 25ms it commits the current ribbon and starts a new one, so a
stroke leaves a trail of overlapping ribbon pieces.

### TypeShapes
Builds shapes out of letters. Pressing or dragging stamps a random character in a random
system font, rotated at random, at a size based on cursor speed (about every 50ms). The
space bar makes an abstract shape: 6–12 letter outlines are distorted with Perlin noise,
merged together and placed at random on the canvas. With keyboard mode on, the keys you
type are stamped as distorted glyphs.

### EvolveShapes
A small genetic algorithm for shapes. The Evolver dialog loads shapes from the canvas or
a PDF and normalises them to 100px, and you rank the ones you like. Evolve then breeds
neighbouring ranked pairs by interpolating their points, weighted by rank, and mutates
them with random point jitter followed by smoothing. When you draw, it stamps random
members of the current generation, rotated to your drag direction and scaled by pen
pressure.

---

## Affect modules

### Mirror
Draws mirrored copies of each shape as you draw it, across a vertical axis, a horizontal
axis, or both for four-way symmetry. Each update reflects the shape's path, its spine
and its gradient with an `AffineTransform`, and puts the results in `affectShapes`. The
axes start at the canvas centre, and you can move them by clicking a new point while a
crosshair guide follows the cursor.

### Blindness
You draw without seeing anything: the canvas stops repainting. It just turns canvas
redraw off. The drawing appears when you release the mouse (auto-reveal, on by default)
or when you press R.

### ColorSwitcher
Each new stroke gets a new random colour and/or transparency. The colour stays within
±Range/2 (default ±25%) of a base colour's hue, saturation and brightness; the base starts
as the current colour, and you can pick another. (The code has a fully random branch, but
the base colour is never empty, so it never runs.) The hue doesn't wrap around, so near
red it drifts toward orange and yellow, never purple. In constant mode the colour changes
about every 50ms *while* you draw.

### Displace
Makes the shape you're drawing swell or collapse around the pen. On every redraw while
the mouse is down, each point of the shapes being drawn moves along the line from the
shape's last point, by `7 − cursor speed`. Slow drawing pushes the shape outward, and
fast drawing pulls it inward.

### Gradient
Replaces the flat fill with a linear gradient that fades from the shape's colour to fully
transparent. For drawn shapes the gradient runs from the start of the stroke to its end
(or to the middle of the spine). For other shapes it runs between two random points
inside the shape's bounds.

### Limit
Only the most recent N shapes (default 10) stay on the canvas. Older ones disappear as
you draw, which gives a moving, trailing effect. Each update counts all shapes and
deletes the oldest finished ones beyond the limit.

### MicExpand
Hover over a finished shape and make noise to inflate it. In wave mode, microphone
samples push each point of the path toward or away from the cursor. In level mode, the
whole shape scales around its centre by the volume. Once a shape grows to cover the
whole window, it is deleted.

### Random
Hover over a finished shape (without pressing) and its points near the cursor get
randomly jiggled by up to about ±7.5px. A point counts as near if its x *or* its y is
within 5px of the cursor, so the area it disturbs is a cross centred on the cursor, not
a small circle.

### Repeat
Hover over a finished shape and copies of it follow the cursor, one every 150ms, which
leaves a trail of clones. It keeps the offset from where you first entered the shape, so
the copies move as if you were dragging the original. Pressing B turns it on and off.

### ShapeSwap
Experimental and unfinished. When you release the mouse, the last shape (if it has more
than 25 points) is saved as XML to `foo.xml` in the working directory. When the canvas is
cleared, that saved shape is loaded back in. Its `affect()` method is empty.

### Smooth
Hover over a finished shape and it gradually rounds off, with one pass about every 75ms.
Each pass applies a 1-2-1 weighted average to the points and rebuilds the path from
quadratic curves. In repeat mode it adds a smoothed copy instead of changing the
original, so you get layers of softer and softer echoes.
