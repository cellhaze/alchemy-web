/*
 * Alchemy Web - modules/smooth.js
 * The "Smooth" affect module, ported from org.alchemy.affect.Smooth
 * (Karl D.D. Willis and the Alchemy authors).
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version. See LICENSE.
 *
 * Hover over a finished shape (without pressing) and it gradually rounds
 * off, one pass about every 75 ms. Each pass takes the end point of every
 * segment, averages each one with its neighbours (1-2-1 weights) and
 * rebuilds the path from quadratic curves.
 *
 * Repeat mode adds a smoothed copy instead of changing the original, so you
 * get layers of softer and softer echoes. As in the Java (which builds the
 * copy with `new AlcShape(path)`), the copy takes the *current* toolbar
 * colour, opacity, style and weight rather than the original's.
 *
 * "Over a shape" means inside its area, so for a line style shape you need
 * to hover inside a loop it makes, not on the line itself.
 */
(function (Alchemy) {
  'use strict';

  var SPACING = 75; // ms between smoothing passes

  /** One smoothing pass over the points, as new segments. */
  function smoothSegments(points) {
    var segs = [];
    var n = points.length;
    for (var i = 0; i < n; i++) {
      if (i === 0) {
        segs.push({ type: 'M', x: points[0].x, y: points[0].y });
      } else if (i === n - 1) {
        segs.push({ type: 'L', x: points[i].x, y: points[i].y });
      } else {
        var p0 = points[i - 1], p1 = points[i], p2 = points[i + 1];
        var x = p0.x * 0.25 + p1.x * 0.5 + p2.x * 0.25;
        var y = p0.y * 0.25 + p1.y * 0.5 + p2.y * 0.25;
        // Curve from the previous point, ending halfway to the averaged point.
        segs.push({ type: 'Q', cx: p0.x, cy: p0.y, x: (p0.x + x) / 2, y: (p0.y + y) / 2 });
      }
    }
    return segs;
  }

  var Smooth = {
    id: 'smooth',
    name: 'Smooth',
    type: 'affect',

    repeat: false,

    _canvas: null,
    _time: 0,

    setup: function (canvas) {
      this._canvas = canvas;
    },

    pointerMove: function (p, e, canvas) {
      if (canvas.penDown) return;
      var now = Date.now();
      if (now - this._time < SPACING) return;
      this._time = now;

      // Topmost finished shape under the pen
      for (var i = canvas.shapes.length - 1; i >= 0; i--) {
        var shape = canvas.shapes[i];
        if (!shape.contains(p)) continue;

        var segs = smoothSegments(shape.getPoints());
        if (this.repeat) {
          var copy = canvas.newShape(null);
          copy.setSegments(segs);
          copy.totalPoints = segs.length;
          canvas.shapes.push(copy);
        } else {
          shape.setSegments(segs);
        }
        canvas.redraw(true);
        return;
      }
    }
  };

  Alchemy.modules = Alchemy.modules || {};
  Alchemy.modules.smooth = Smooth;
})(window.Alchemy = window.Alchemy || {});
