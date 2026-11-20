# Alchemy Web

A browser port of [Alchemy](https://github.com/karldd/Alchemy), the experimental open drawing project, using
plain HTML, CSS, JavaScript and the Canvas 2D API.

This first step has a full-screen canvas, the basic **Shapes** create module (freehand),
and a toolbar with line/solid style, colour, line weight and clear.

## Running it

Open `index.html` in a browser. No server or build step is needed. Pointer events are
used throughout, so mouse, pen tablet and touch all draw.

Shortcuts: **S** toggles line/solid, **Backspace** or **Delete** clears, **Esc** cancels
picking a mirror axis.

**Mirror** draws reflected copies as you draw. Horizontal flips left/right, Vertical flips
top/bottom, and both together give four-way symmetry. **Set axis** shows a cyan crosshair;
click on the canvas to move the mirror point there. **Centre** puts it back in the
middle.

## Layout

| File | Ported from | What it does |
| --- | --- | --- |
| `js/shape.js` | `core/AlcShape.java` | A vector shape and the line smoothing (`curveTo`, `lineTo`) |
| `js/canvas.js` | `core/AlcCanvas.java` | Shape lists, rendering, commit/clear, pointer event dispatch |
| `js/modules/shapes.js` | `create/Shapes.java` | The Shapes create module |
| `js/modules/mirror.js` | `affect/Mirror.java` | The Mirror affect module: reflected copies while you draw |
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
