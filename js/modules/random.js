/*
 * Alchemy Web - modules/random.js
 * The "Random" affect module, ported from org.alchemy.affect.Random
 * (Karl D.D. Willis and the Alchemy authors).
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version. See LICENSE.
 *
 * Hover over a finished shape (without pressing) and the points near the
 * pointer get jiggled at random, on every move. Each nearby point moves by up
 * to +/- Distortion * 0.15 px (default 50, so about 7.5 px).
 *
 * "Near" follows the Java: a point counts if its x OR its y is within 5 px of
 * the pointer, so the area disturbed is a cross through the pointer, not a
 * small circle. "Over a shape" means inside its area, as with Smooth.
 */
(function (Alchemy) {
  'use strict';

  var PROXIMITY = 5;
  var SCALE = 0.15;

  function random(a, b) {
    return a + Math.random() * (b - a);
  }

  var Random = {
    id: 'random',
    name: 'Random',
    type: 'affect',

    distortion: 50,   // "Distortion" slider, 1-100

    _canvas: null,

    setup: function (canvas) {
      this._canvas = canvas;
    },

    _closeBy: function (p, x, y) {
      return Math.abs(Math.trunc(p.x) - Math.trunc(x)) < PROXIMITY ||
        Math.abs(Math.trunc(p.y) - Math.trunc(y)) < PROXIMITY;
    },

    _randomise: function (shape, p) {
      var top = this.distortion * SCALE;
      function mess(v) { return v + random(-top, top); }
      var self = this;
      var segs = shape.segments.map(function (s) {
        switch (s.type) {
          case 'L':
            return self._closeBy(p, s.x, s.y) ? { type: 'L', x: mess(s.x), y: mess(s.y) } : s;
          case 'Q':
            return self._closeBy(p, s.x, s.y) ?
              { type: 'Q', cx: mess(s.cx), cy: mess(s.cy), x: mess(s.x), y: mess(s.y) } : s;
          case 'C':
            // The Java tests the second control point here, not the end point.
            return self._closeBy(p, s.c2x, s.c2y) ? {
              type: 'C', c1x: mess(s.c1x), c1y: mess(s.c1y), c2x: mess(s.c2x), c2y: mess(s.c2y),
              x: mess(s.x), y: mess(s.y)
            } : s;
          default:
            return s; // moveTo and closePath are left alone
        }
      });
      shape.setSegments(segs);
    },

    pointerMove: function (p, e, canvas) {
      if (canvas.penDown) return;
      for (var i = canvas.shapes.length - 1; i >= 0; i--) {
        if (canvas.shapes[i].contains(p)) {
          this._randomise(canvas.shapes[i], p);
          canvas.redraw(true);
          return;
        }
      }
    }
  };

  Alchemy.modules = Alchemy.modules || {};
  Alchemy.modules.random = Random;
})(window.Alchemy = window.Alchemy || {});
