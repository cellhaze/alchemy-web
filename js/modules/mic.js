/*
 * Alchemy Web - modules/mic.js
 * The "Mic Shapes" create module, ported from org.alchemy.create.MicShapes
 * (Karl D.D. Willis and the Alchemy authors).
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version. See LICENSE.
 *
 * Your voice shapes the line. The level comes from a single sample at a time
 * (the Java used a one-sample buffer), so it's instantaneous and jumpy.
 *   - Fatten mode: a pressure-style stroke whose width follows the level, so
 *     shouting makes it thicker (never thinner than 1 px each side).
 *   - Shake mode: each point is pushed out sideways by the sound wave itself,
 *     so the line turns into a jagged waveform along your path.
 * Volume (0-100, default 50) scales both.
 *
 * In Shake mode the Java multiplied the level by the first byte of its
 * 2-byte buffer. Which byte that was depended on the sound card; here it's
 * the high byte, which follows the waveform. Loud sounds throw points far
 * off the line, so turn Volume down for subtler shaking.
 */
(function (Alchemy) {
  'use strict';

  var Mic = {
    id: 'mic',
    name: 'Mic',
    type: 'create',

    shake: false,      // "Draw Mode": false = fatten, true = shake
    volume: 1,         // "Volume" slider 0-100, * 0.02

    _lastPt: null,

    setup: function () {
      Alchemy.mic.acquire();
    },

    deselect: function () {
      Alchemy.mic.release();
    },

    cleared: function () {
      this._lastPt = null;
    },

    /** MicShapes.getMicLevel: the level of one sample, doubled. */
    _level: function () {
      return Alchemy.mic.level(1) * 2;
    },

    pointerDown: function (p, e, canvas) {
      var loc = canvas.penLocation;
      var shape;
      if (this.shake) {
        shape = canvas.newShape(loc);
      } else {
        shape = canvas.newShape(null);
        shape.spineTo(loc, this._level());
      }
      canvas.createShapes.push(shape);
      this._lastPt = { x: loc.x, y: loc.y };
    },

    pointerDrag: function (p, e, canvas) {
      var shape = canvas.getCurrentCreateShape();
      // Check for a shape in case the canvas was cleared mid-stroke.
      if (!shape) return;
      var loc = canvas.penLocation;
      var level = this._level();
      if (this.shake) {
        // The high byte of the latest sample (-128 to 127)
        var wave = Alchemy.mic.latestSample() >> 8;
        var amount = wave === 0 ? level : wave * level;
        shape.curveTo(Alchemy.Shape.rightAngle(loc, this._lastPt || loc, amount * this.volume));
      } else {
        shape.spineTo(loc, Math.max(1, level * this.volume));
      }
      canvas.redraw();
      this._lastPt = { x: loc.x, y: loc.y };
    },

    pointerUp: function (p, e, canvas) {
      var shape = canvas.getCurrentCreateShape();
      if (!shape) return;
      if (this.shake) shape.lineTo(canvas.penLocation);
      canvas.redraw();
      canvas.commitShapes();
    }
  };

  Alchemy.modules = Alchemy.modules || {};
  Alchemy.modules.mic = Mic;
})(window.Alchemy = window.Alchemy || {});
