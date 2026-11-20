/*
 * Alchemy Web - modules/shapes.js
 * The basic "Shapes" create module, ported from org.alchemy.create.Shapes
 * (Karl D.D. Willis and the Alchemy authors).
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version. See LICENSE.
 *
 * Freehand mode only for now: press starts a shape, drag adds smoothed
 * points, release adds a final straight segment and commits the shape.
 * (The original's straight-line and outline modes aren't ported yet.)
 *
 * Module interface (all methods optional):
 *   setup(canvas)              module selected
 *   deselect()                 another module selected
 *   cleared()                  canvas cleared
 *   pointerDown(p, e, canvas)  pen/mouse pressed at point p {x, y}
 *   pointerDrag(p, e, canvas)  moved while pressed
 *   pointerMove(p, e, canvas)  moved while not pressed
 *   pointerUp(p, e, canvas)    released
 *   affect()                   (affect modules) called before every redraw
 */
(function (Alchemy) {
  'use strict';

  var Shapes = {
    id: 'shapes',
    name: 'Shapes',
    type: 'create',

    pointerDown: function (p, e, canvas) {
      canvas.createShapes.push(canvas.newShape(p));
      canvas.redraw();
    },

    pointerDrag: function (p, e, canvas) {
      // Check for a shape in case the canvas was cleared mid-stroke.
      if (canvas.hasCreateShapes()) {
        canvas.getCurrentCreateShape().curveTo(p);
        canvas.redraw();
      }
    },

    pointerUp: function (p, e, canvas) {
      if (canvas.hasCreateShapes()) {
        canvas.getCurrentCreateShape().lineTo(p);
      }
      canvas.redraw();
      canvas.commitShapes();
    }
  };

  Alchemy.modules = Alchemy.modules || {};
  Alchemy.modules.shapes = Shapes;
})(window.Alchemy = window.Alchemy || {});
