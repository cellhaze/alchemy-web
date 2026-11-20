/*
 * Alchemy Web - modules/splatter.js
 * The "Splatter Shapes" create module, ported from
 * org.alchemy.create.SplatterShapes (Karl D.D. Willis and the Alchemy authors).
 *
 * The Java module credits it as: Based on "Splatter" by Stamen Design,
 * http://stamen.com/projects/splatter, licensed
 * http://creativecommons.org/licenses/by-nc-sa/2.5/
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version. See LICENSE.
 *
 * Paint splatter. Every drag event draws one quadratic curve from the last
 * point to the pen, whose width is inversely proportional to how far the pen
 * moved: slow movement makes fat blobs, fast flicks make thin streaks. The
 * width is smoothed between events. Each curve also scatters a random number
 * of short, round "drips" around its start point.
 *
 * TODO: fine-tune the splatters. Compare against the Java version side by side:
 *   - Width is distance-per-event, so it depends on how often the browser
 *     sends pointer moves (one per frame here). Check blob sizes on 60 Hz vs
 *     high-refresh screens, and with a pen vs a mouse.
 *   - Check the feel of the Size and Drips settings across their ranges.
 *   - Maybe make Solid style useful (drips currently fill nothing).
 */
(function (Alchemy) {
  'use strict';

  /** AlcMath.map: map value from [low1, high1] to [low2, high2]. */
  function map(value, low1, high1, low2, high2) {
    return low2 + (high2 - low2) * ((value - low1) / (high1 - low1));
  }

  /** math.random(n) is [0, n); math.random(a, b) is [a, b). */
  function random(a, b) {
    return b === undefined ? Math.random() * a : a + Math.random() * (b - a);
  }

  var Splatter = {
    id: 'splatter',
    name: 'Splatter',
    type: 'create',
    // Width depends on distance per event, so take one event per frame
    // (roughly Java's mouse-drag rate) rather than every pen sample.
    coalesced: false,

    sizeSetting: 50,   // "Size" spinner, 1-100
    drips: 10,         // "Drips" spinner, 0-50

    _start: null,
    _end: null,
    _newSizeInfluence: 0,
    _midPointPush: 0.5,
    _maxLineWidth: 0,
    _size: 1,
    _initialised: false,

    setup: function () {
      // SplatterShapes.setup() runs once, when the module is first selected.
      if (this._initialised) return;
      this._initialised = true;
      this._newSizeInfluence = map(this.sizeSetting, 1, 100, 0, 2);
      this._midPointPush = 0.5;
      this._maxLineWidth = random(50) + 50;
      this._size = 1;
    },

    setSize: function (value) {
      this.sizeSetting = value;
      this._newSizeInfluence = map(value, 1, 100, 0, 2);
      this._size = this._newSizeInfluence;
    },

    setDrips: function (value) {
      this.drips = value;
    },

    _splat: function (canvas, start, end, mid, d) {
      if (d < 0) d = 0;
      var first = canvas.newShape(start);
      first.lineWidth = d;
      first.quadTo(mid, end);
      canvas.createShapes.push(first);

      var splotch = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
      var quarterDrips = Math.floor(this.drips / 4);
      // As in the Java, the random upper bound is re-rolled on every pass.
      for (var i = 0; i < quarterDrips + random(0, this.drips); i++) {
        // Position varies by up to half the segment length either way.
        var x4 = splotch * (random(1) - 0.5);
        var y4 = splotch * (random(1) - 0.5);
        // Direction varies by up to 0.5px either way.
        var x5 = random(1) - 0.5;
        var y5 = random(1) - 0.5;
        var dd = d * (0.5 + random(1));
        if (dd < 0) dd = 0;

        var drip = canvas.newShape({ x: start.x + x4, y: start.y + y4 });
        drip.lineWidth = dd;
        drip.curveTo({ x: start.x + x4 + x5, y: start.y + y4 + y5 });
        canvas.createShapes.push(drip);
      }
    },

    pointerDown: function (p) {
      this._start = { x: p.x, y: p.y };
      this._end = { x: p.x, y: p.y };
    },

    pointerDrag: function (p, e, canvas) {
      if (!this._end) return;
      var start = this._start, end = this._end;
      // Control point: extend the previous segment past its end.
      var mid = {
        x: (end.x - start.x) * (1 + this._midPointPush) + start.x,
        y: (end.y - start.y) * (1 + this._midPointPush) + start.y
      };
      start = this._start = end;
      end = this._end = { x: p.x, y: p.y };

      var distance = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
      if (distance === 0) distance = 1; // avoid Infinity
      var newSize = this._maxLineWidth / distance;
      this._size = (this._newSizeInfluence * newSize) + ((1 - this._newSizeInfluence) * this._size);

      this._splat(canvas, start, end, mid, this._size);
      canvas.redraw();
    },

    pointerUp: function (p, e, canvas) {
      this._start = this._end = null;
      canvas.commitShapes();
    }
  };

  Alchemy.modules = Alchemy.modules || {};
  Alchemy.modules.splatter = Splatter;
})(window.Alchemy = window.Alchemy || {});
