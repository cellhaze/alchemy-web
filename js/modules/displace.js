/*
 * Alchemy Web - modules/displace.js
 * The "Displace" affect module, ported from org.alchemy.affect.Displace
 * (Karl D.D. Willis and the Alchemy authors).
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version. See LICENSE.
 *
 * Makes the shape you're drawing swell or collapse around the pen. On every
 * redraw while the pen is down, each point of the shapes being drawn moves
 * along the line from the shape's current end point, by
 *   displacement - cursor speed   (speed = |dx| + |dy| since the last move)
 * Moving slower than the Displacement setting pushes points outward; moving
 * faster pulls them inward. Line and curve points move (curve control
 * points too); cubic segments are left as they are, as in the Java.
 *
 * Pressure strokes move their centre line instead and rebuild the outline.
 *
 * The effect is applied once per redraw, and modules redraw once per pen
 * event, so it is stronger at higher event rates (e.g. a fast tablet).
 */
(function (Alchemy) {
  'use strict';

  /** Move p by `distance` along the direction from `from` to p (Displace.getAngle). */
  function push(p, from, distance) {
    var angle = Math.atan2(p.y - from.y, p.x - from.x);
    return { x: p.x + distance * Math.cos(angle), y: p.y + distance * Math.sin(angle) };
  }

  var Displace = {
    id: 'displace',
    name: 'Displace',
    type: 'affect',

    displacement: 7,   // "Displacement" slider, 1-15

    _canvas: null,
    _mouseDown: false,
    _oldP: null,
    _speed: 0,

    setup: function (canvas) {
      this._canvas = canvas;
    },

    affect: function () {
      var c = this._canvas;
      if (!c || !this._mouseDown) return;
      var speed = this._speed;
      for (var i = 0; i < c.createShapes.length; i++) {
        var shape = c.createShapes[i];
        var last = shape.getCurrentPoint();
        if (!last) continue;
        if (shape.hasSpine()) {
          // Pressure strokes: move the centre line, then rebuild the outline
          if (shape.spine.length > 1) {
            for (var j = 0; j < shape.spine.length; j++) {
              shape.spine[j] = push(shape.spine[j], last, speed);
            }
            shape.createSpine();
          }
          continue;
        }
        var segs = shape.segments.map(function (s) {
          if (s.type === 'M' || s.type === 'L') {
            var p = push(s, last, speed);
            return { type: s.type, x: p.x, y: p.y };
          }
          if (s.type === 'Q') {
            var cp = push({ x: s.cx, y: s.cy }, last, speed);
            var ep = push(s, last, speed);
            return { type: 'Q', cx: cp.x, cy: cp.y, x: ep.x, y: ep.y };
          }
          return s; // 'C' and 'Z' unchanged
        });
        shape.setSegments(segs);
      }
    },

    pointerDown: function (p, e, canvas) {
      this._mouseDown = true;
      this._oldP = p;
      canvas.redraw();
    },

    pointerDrag: function (p) {
      if (this._oldP) {
        var cursorSpeed = Math.abs(p.x - this._oldP.x) + Math.abs(p.y - this._oldP.y);
        this._speed = this.displacement - cursorSpeed;
      }
      this._oldP = p;
    },

    pointerUp: function () {
      this._mouseDown = false;
      this._oldP = null;
    }
  };

  Alchemy.modules = Alchemy.modules || {};
  Alchemy.modules.displace = Displace;
})(window.Alchemy = window.Alchemy || {});
