/*
 * Alchemy Web - modules/scrawl.js
 * The "Scrawl Shapes" create module, ported from org.alchemy.create.ScrawlShapes
 * (Karl D.D. Willis and the Alchemy authors).
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version. See LICENSE.
 *
 * A nervous, scribbly line. Every `flow` drag events, the segment from the
 * last sampled point to the pen is split into `detail` steps, and each step
 * wanders by a random ±`noise` px. The wobble accumulates along a segment,
 * so each one drifts away from the true path before the next segment
 * restarts from where the pen really was.
 *
 * The Java does this arithmetic on ints (integer step size, and the running
 * position truncated after each step); Math.trunc keeps that behaviour,
 * including the slight drift it causes.
 */
(function (Alchemy) {
  'use strict';

  function random(a, b) {
    return a + Math.random() * (b - a);
  }

  var Scrawl = {
    id: 'scrawl',
    name: 'Scrawl',
    type: 'create',
    // Flow counts drag events. Java gets every event the mouse or tablet sends
    // (often 100-200+ per second), so this takes every pen sample as well.
    // At one event per frame, Flow 10 meant a new segment only every ~170 ms.

    flow: 10,     // "Flow" slider, 1-25: sample every Nth drag event
    detail: 10,   // "Detail" slider, 2-50: steps per segment
    noise: 10,    // "Noise" slider, 1-50: max random offset per step (px)

    _oldP: null,
    _count: 0,    // like the Java, never reset between strokes

    _scrawl: function (canvas, p1, p2) {
      var shape = canvas.getCurrentCreateShape();
      if (!shape) return;
      var steps = this.detail;
      var x1 = Math.trunc(p1.x), y1 = Math.trunc(p1.y);
      var xStep = Math.trunc((Math.trunc(p2.x) - x1) / steps);
      var yStep = Math.trunc((Math.trunc(p2.y) - y1) / steps);
      for (var i = 0; i < steps - 1; i++) {
        x1 = Math.trunc(x1 + xStep + random(-this.noise, this.noise));
        y1 = Math.trunc(y1 + yStep + random(-this.noise, this.noise));
        shape.curveTo({ x: x1, y: y1 });
      }
    },

    pointerDown: function (p, e, canvas) {
      canvas.createShapes.push(canvas.newShape(p));
      this._oldP = p;
    },

    pointerDrag: function (p, e, canvas) {
      if (this._count % this.flow === 0 && this._oldP) {
        this._scrawl(canvas, this._oldP, p);
        this._oldP = p;
        canvas.redraw();
      }
      this._count++;
    },

    pointerUp: function (p, e, canvas) {
      this._oldP = null;
      canvas.redraw();
      canvas.commitShapes();
    }
  };

  Alchemy.modules = Alchemy.modules || {};
  Alchemy.modules.scrawl = Scrawl;
})(window.Alchemy = window.Alchemy || {});
