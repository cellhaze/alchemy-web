/*
 * Alchemy Web - modules/detach.js
 * The "Detach Shapes" create module, ported from
 * org.alchemy.create.DetachShapes (Karl D.D. Willis and the Alchemy authors).
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version. See LICENSE.
 *
 * The line trails behind the pen at a fixed distance, like dragging
 * something on a leash. On every move the trailing point turns to face the
 * pen and is set `distance` px back from it along that line, so corners get
 * rounded off and the line lags behind your hand. Distance 0 draws a normal
 * line.
 *
 * As in the Java, the trailing point is remembered between strokes (it
 * starts at 100, 100), so each new stroke begins on the leash from wherever
 * the last one ended.
 */
(function (Alchemy) {
  'use strict';

  var Detach = {
    id: 'detach',
    name: 'Detach',
    type: 'create',

    distance: 100,   // "Distance" slider, 0-300

    _x: 100,
    _y: 100,
    _newPath: false,

    pointerDown: function () {
      this._newPath = true;
    },

    pointerDrag: function (p, e, canvas) {
      var angle = Math.atan2(p.y - this._y, p.x - this._x);
      this._x = p.x - Math.cos(angle) * this.distance;
      this._y = p.y - Math.sin(angle) * this.distance;
      var pt = { x: this._x, y: this._y };

      if (this._newPath) {
        canvas.createShapes.push(canvas.newShape(pt));
        this._newPath = false;
        canvas.redraw();
      } else if (canvas.hasCreateShapes()) {
        canvas.getCurrentCreateShape().curveTo(pt);
        canvas.redraw();
      }
    },

    pointerUp: function (p, e, canvas) {
      canvas.redraw();
      canvas.commitShapes();
    }
  };

  Alchemy.modules = Alchemy.modules || {};
  Alchemy.modules.detach = Detach;
})(window.Alchemy = window.Alchemy || {});
