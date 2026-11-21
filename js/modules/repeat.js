/*
 * Alchemy Web - modules/repeat.js
 * The "Repeat" affect module, ported from org.alchemy.affect.Repeat
 * (Karl D.D. Willis and the Alchemy authors).
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version. See LICENSE.
 *
 * Hover over a finished shape (without pressing) and copies of it follow the
 * pointer, one every Interval * 2 + 50 ms (default 150 ms), leaving a trail
 * of clones. The copies keep the offset from where you entered the shape, so
 * they move as if you were dragging the original.
 *
 * "Over" here means inside the shape's bounding box, plus a 10 px margin
 * while you're already repeating, so it's easier to hit than Smooth or
 * Random. Moving off the shape for three intervals saves the trail; pressing
 * also saves it. Once saved, the newest copy is on top, so hovering again
 * repeats the copy and the trail carries on from there.
 * Repeat (or the B key) pauses and resumes it.
 */
(function (Alchemy) {
  'use strict';

  var MARGIN = 10;

  var Repeat = {
    id: 'repeat',
    name: 'Repeat',
    type: 'affect',

    repeat: true,     // "Repeat" toggle (B key)
    interval: 50,     // "Interval" slider, 0-100

    _canvas: null,
    _time: 0,
    _shapeSize: null,
    _shapeOffset: null,
    _outside: 0,
    _update: false,

    setup: function (canvas) {
      this._canvas = canvas;
    },

    _delay: function () {
      return this.interval * 2 + 50;
    },

    _similarSize: function (b) {
      return Math.abs(b.width - this._shapeSize.width) + Math.abs(b.height - this._shapeSize.height) <= 10;
    },

    _repeatShape: function (canvas, p, original) {
      var b = original.getBounds();
      if (!this._shapeSize || !this._similarSize(b) || this._update) {
        this._shapeSize = { width: b.width, height: b.height };
        this._shapeOffset = { x: p.x - b.x, y: p.y - b.y };
        this._update = false;
      }
      var dx = p.x - (b.x + this._shapeOffset.x);
      var dy = p.y - (b.y + this._shapeOffset.y);
      canvas.affectShapes.push(original.transformed(function (q) {
        return { x: q.x + dx, y: q.y + dy };
      }));
      canvas.redraw();
    },

    _check: function (canvas, p) {
      for (var i = canvas.shapes.length - 1; i >= 0; i--) {
        var b = canvas.shapes[i].getBounds();
        var m = this._outside === 0 ? MARGIN : 0;
        if (p.x >= b.x - m && p.x <= b.x + b.width + m && p.y >= b.y - m && p.y <= b.y + b.height + m) {
          this._outside = 0;
          if (this.repeat) this._repeatShape(canvas, p, canvas.shapes[i]);
          return;
        }
      }
      this._outside++;
      if (this._outside === 3) {
        canvas.commitShapes();
        this._update = true;
      }
    },

    pointerMove: function (p, e, canvas) {
      if (canvas.penDown) return;
      var now = Date.now();
      if (now - this._time < this._delay()) return;
      this._time = now;
      this._check(canvas, p);
    },

    pointerDown: function (p, e, canvas) {
      if (this._outside <= 2) {
        canvas.commitAffectShapes();
        this._update = true;
      }
    }
  };

  Alchemy.modules = Alchemy.modules || {};
  Alchemy.modules.repeat = Repeat;
})(window.Alchemy = window.Alchemy || {});
