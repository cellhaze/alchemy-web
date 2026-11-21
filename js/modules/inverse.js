/*
 * Alchemy Web - modules/inverse.js
 * The "Inverse Shapes" create module, ported from
 * org.alchemy.create.InverseShapes (Karl D.D. Willis and the Alchemy authors).
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version. See LICENSE.
 *
 * Drawing turned inside out: the line follows the pointer while the button
 * is *up*, and pressing "lifts the pen". Moving starts a shape and keeps
 * extending it; pressing ends and saves it; after releasing, the next move
 * starts a new shape.
 *
 * With a mouse, just move it. With a pen tablet, hover the pen just above
 * the surface (most tablets report hovering), and tap to end a shape.
 * Touch screens can't hover, so this module doesn't work with fingers.
 */
(function (Alchemy) {
  'use strict';

  var Inverse = {
    id: 'inverse',
    name: 'Inverse',
    type: 'create',

    _moveTo: true,    // the next move starts a new shape
    _mouseUp: true,

    setup: function () {
      // InverseShapes.reselect()
      this._mouseUp = true;
      this._moveTo = true;
    },

    cleared: function () {
      this._moveTo = true;
    },

    pointerMove: function (p, e, canvas) {
      if (!this._mouseUp) return;
      if (this._moveTo) {
        canvas.createShapes.push(canvas.newShape(p));
        this._moveTo = false;
      } else if (canvas.hasCreateShapes()) {
        // Check for a shape in case the canvas was cleared meanwhile.
        canvas.getCurrentCreateShape().curveTo(p);
        canvas.redraw();
      }
    },

    pointerDown: function (p, e, canvas) {
      this._mouseUp = false;
      canvas.redraw();
      canvas.commitShapes();
    },

    pointerUp: function () {
      this._mouseUp = true;
      this._moveTo = true;
    }
  };

  Alchemy.modules = Alchemy.modules || {};
  Alchemy.modules.inverse = Inverse;
})(window.Alchemy = window.Alchemy || {});
