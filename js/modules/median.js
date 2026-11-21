/*
 * Alchemy Web - modules/median.js
 * The "Median Shapes" create module, ported from
 * org.alchemy.create.MedianShapes (Karl D.D. Willis and the Alchemy authors).
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version. See LICENSE.
 *
 * Strokes that blend with the one before. Your first stroke is drawn
 * normally and recorded as the "control". Every later stroke draws your line
 * plus a second line halfway between your pen and the matching point of the
 * previous stroke, matched by move number (the 10th move of this stroke
 * pairs with the 10th move of the last one). Each stroke then becomes the
 * control for the next, so the shapes morph into each other in a chain.
 *
 * The median line stops once you've made more moves than the previous
 * stroke had. Clearing the canvas starts over with a fresh control stroke.
 */
(function (Alchemy) {
  'use strict';

  /** p - (p - q) / 2, with the Java's whole-number division. */
  function halfway(p, q) {
    return { x: p.x - Math.trunc((p.x - q.x) / 2), y: p.y - Math.trunc((p.y - q.y) / 2) };
  }

  var Median = {
    id: 'median',
    name: 'Median',
    type: 'create',

    _capture: true,     // the next stroke is the first (control) stroke
    _control: [],       // points of the previous stroke, one per move
    _buffer: [],        // points of the current stroke, becomes the next control
    _pointCount: 0,
    _medianShape: null,

    cleared: function () {
      this._capture = true;
    },

    pointerDown: function (p, e, canvas) {
      if (this._capture) {
        this._control = [p];
        canvas.createShapes.push(canvas.newShape(p));
      } else {
        this._pointCount = 0;
        this._medianShape = canvas.newShape(halfway(p, this._control[0]));
        canvas.createShapes.push(this._medianShape);
        this._buffer = [p];
        canvas.createShapes.push(canvas.newShape(p));
      }
      canvas.redraw();
    },

    pointerDrag: function (p, e, canvas) {
      // Check for shapes in case the canvas was cleared mid-stroke.
      if (!canvas.hasCreateShapes()) return;
      if (this._capture) {
        canvas.getCurrentCreateShape().curveTo(p);
        this._control.push(p);
      } else {
        this._pointCount++;
        if (this._control.length > this._pointCount && this._medianShape) {
          this._medianShape.curveTo(halfway(p, this._control[this._pointCount]));
        }
        this._buffer.push(p);
        canvas.getCurrentCreateShape().curveTo(p);
      }
      canvas.redraw();
    },

    pointerUp: function (p, e, canvas) {
      if (!canvas.hasCreateShapes()) return;
      if (this._capture) {
        this._capture = false;
        canvas.getCurrentCreateShape().lineTo(p);
        canvas.redraw();
        canvas.commitShapes();
        this._control.push(p);
      } else {
        this._control = this._buffer;
        this._buffer = [];
        this._medianShape = null;
        canvas.redraw();
        canvas.commitShapes();
      }
    }
  };

  Alchemy.modules = Alchemy.modules || {};
  Alchemy.modules.median = Median;
})(window.Alchemy = window.Alchemy || {});
