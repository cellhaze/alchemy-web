/*
 * Alchemy Web - modules/shapeswap.js
 * The "Shape Swap" affect module, ported from org.alchemy.affect.ShapeSwap
 * (Karl D.D. Willis and the Alchemy authors).
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version. See LICENSE.
 *
 * An unfinished experiment in the desktop client, ported as it was: while
 * it's on, every finished stroke with more than 25 points is remembered,
 * and clearing the canvas puts the last one back, so one shape carries over
 * into the fresh canvas. The Java saved it to a file (foo.xml) in the
 * Alchemy folder; here it's kept in memory for the session.
 */
(function (Alchemy) {
  'use strict';

  var MIN_POINTS = 25;

  var ShapeSwap = {
    id: 'shapeswap',
    name: 'Shape Swap',
    type: 'affect',

    saved: null,   // copy of the last long stroke

    _canvas: null,

    setup: function (canvas) {
      this._canvas = canvas;
    },

    // Affects get pointer events after the create module, so the stroke has
    // already been saved to canvas.shapes when this runs.
    pointerUp: function (p, e, canvas) {
      var last = canvas.shapes[canvas.shapes.length - 1];
      if (last && last.totalPoints > MIN_POINTS) {
        this.saved = last.transformed(function (q) { return q; });
      }
    },

    cleared: function () {
      var c = this._canvas;
      if (!c || !this.saved) return;
      // Like the Java, it comes back as a shape in progress, saved with the next stroke
      c.createShapes.push(this.saved.transformed(function (q) { return q; }));
    }
  };

  Alchemy.modules = Alchemy.modules || {};
  Alchemy.modules.shapeswap = ShapeSwap;
})(window.Alchemy = window.Alchemy || {});
