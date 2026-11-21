/*
 * Alchemy Web - modules/micexpand.js
 * The "Mic Expand" affect module, ported from org.alchemy.affect.MicExpand
 * (Karl D.D. Willis and the Alchemy authors).
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version. See LICENSE.
 *
 * Hover over a finished shape (without pressing) and make noise to change
 * it, about every 50 ms:
 *   - Wave mode: each point of the outline gets its own sound sample and
 *     moves toward the pointer (or away, for negative samples) by
 *     sample * Volume * 0.0003, so the shape ripples with the sound.
 *   - Level mode: the whole shape scales about its centre by
 *     0.9 + level * Volume * 0.001. Quiet makes it shrink and loud makes it
 *     grow, as in the desktop client.
 * Changes build up, and once a shape grows to cover the whole window it is
 * deleted. Moving off the shape or pressing stops it. "Over" means inside
 * the shape's area, as with Smooth.
 */
(function (Alchemy) {
  'use strict';

  var DELAY = 50;  // ms between changes

  var MicExpand = {
    id: 'micexpand',
    name: 'Mic Expand',
    type: 'affect',

    wave: true,       // "Mode": wave (true) or level (false)
    volume: 50,       // "Volume" slider, 0-100

    _canvas: null,
    _shape: null,     // the shape being changed
    _pt: null,        // pointer position inside it
    _timer: null,

    setup: function (canvas) {
      this._canvas = canvas;
      Alchemy.mic.acquire();
    },

    deselect: function () {
      this._stop();
      Alchemy.mic.release();
    },

    _start: function () {
      if (this._timer) return;
      var self = this;
      this._timer = setInterval(function () { self._alter(); }, DELAY);
    },

    _stop: function () {
      if (this._timer) clearInterval(this._timer);
      this._timer = null;
      this._shape = null;
    },

    _alter: function () {
      var c = this._canvas, shape = this._shape;
      if (!c || !shape || c.penDown) { this._stop(); return; }
      var index = c.shapes.indexOf(shape);
      if (index < 0) { this._stop(); return; }
      if (!Alchemy.mic.isRunning()) return;

      var b = shape.getBounds();
      // Covers the whole window: delete it (MicExpand.alterShape)
      if (b.x <= 0 && b.y <= 0 && b.x + b.width >= c.width && b.y + b.height >= c.height) {
        c.shapes.splice(index, 1);
        this._stop();
        c.redraw(true);
        return;
      }

      if (this.wave) {
        var samples = Alchemy.mic.samples(Math.max(shape.totalPoints, shape.segments.length) + 2);
        var k = this.volume * 0.0003, pt = this._pt;
        var segs = shape.segments.map(function (s, i) {
          var d = (samples[i] || 0) * k;
          function move(x, y) {
            var a = Math.atan2(pt.y - y, pt.x - x);
            return { x: x + d * Math.cos(a), y: y + d * Math.sin(a) };
          }
          var m;
          if (s.type === 'M' || s.type === 'L') {
            m = move(s.x, s.y);
            return { type: s.type, x: m.x, y: m.y };
          }
          if (s.type === 'Q') {
            var c1 = move(s.cx, s.cy), e = move(s.x, s.y);
            return { type: 'Q', cx: c1.x, cy: c1.y, x: e.x, y: e.y };
          }
          return s; // cubic curves and closePath unchanged, as in the Java
        });
        shape.setSegments(segs);
      } else {
        var scale = 0.9 + Alchemy.mic.level(Math.max(2, shape.totalPoints + 2)) * this.volume * 0.001;
        var cx = b.x + b.width / 2, cy = b.y + b.height / 2;
        var scaled = shape.transformed(function (q) {
          return { x: cx + (q.x - cx) * scale, y: cy + (q.y - cy) * scale };
        });
        shape.setSegments(scaled.segments);
      }
      c.redraw(true);
    },

    pointerMove: function (p, e, canvas) {
      if (canvas.penDown) return;
      for (var i = canvas.shapes.length - 1; i >= 0; i--) {
        if (canvas.shapes[i].contains(p)) {
          this._pt = p;
          if (this._shape !== canvas.shapes[i]) this._shape = canvas.shapes[i];
          this._start();
          return;
        }
      }
      this._stop();
    },

    pointerDown: function () {
      this._stop();
    }
  };

  Alchemy.modules = Alchemy.modules || {};
  Alchemy.modules.micexpand = MicExpand;
})(window.Alchemy = window.Alchemy || {});
