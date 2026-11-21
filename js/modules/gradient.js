/*
 * Alchemy Web - modules/gradient.js
 * The "Gradient" affect module, ported from org.alchemy.affect.Gradient
 * (Karl D.D. Willis and the Alchemy authors).
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version. See LICENSE.
 *
 * Replaces the flat colour of each shape being drawn with a linear gradient
 * that fades from the shape's colour to fully transparent.
 *   - Drawn shapes (penShape): from the start of the stroke to where it
 *     currently ends, recalculated on every redraw so it stretches as you draw.
 *   - Other shapes (e.g. stamped ones, in later modules): between two random
 *     points inside the shape's bounds, chosen once.
 *   - Pressure (spine) strokes: from the start of the centre line to its
 *     middle, as in the Java.
 */
(function (Alchemy) {
  'use strict';

  function randomPoint(b) {
    return { x: b.x + Math.random() * b.width, y: b.y + Math.random() * b.height };
  }

  function setGradient(shape) {
    var p1 = null, p2 = null;
    if (shape.penShape) {
      if (shape.hasSpine()) {
        // Pressure strokes: from the start of the spine to its middle
        if (shape.spine.length > 0) {
          p1 = shape.spine[0];
          p2 = shape.spine[Math.floor(shape.spine.length / 2)];
        }
      } else {
        p1 = shape.getStartPoint();
        p2 = shape.getCurrentPoint();
      }
    } else if (!shape.gradient) {
      var bounds = shape.getBounds();
      p1 = randomPoint(bounds);
      p2 = randomPoint(bounds);
    }
    if (p1 && p2) {
      shape.gradient = { x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y };
    }
  }

  var Gradient = {
    id: 'gradient',
    name: 'Gradient',
    type: 'affect',

    _canvas: null,

    setup: function (canvas) {
      this._canvas = canvas;
    },

    affect: function () {
      var c = this._canvas;
      if (!c) return;
      for (var i = 0; i < c.createShapes.length; i++) setGradient(c.createShapes[i]);
      for (var j = 0; j < c.affectShapes.length; j++) setGradient(c.affectShapes[j]);
    }
  };

  Alchemy.modules = Alchemy.modules || {};
  Alchemy.modules.gradient = Gradient;
})(window.Alchemy = window.Alchemy || {});
