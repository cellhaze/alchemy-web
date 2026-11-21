/*
 * Alchemy Web - modules/xshapes.js
 * The "X Shapes" create module, ported from org.alchemy.create.XShapes
 * (Karl D.D. Willis and the Alchemy authors).
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version. See LICENSE.
 *
 * A zig-zag fan that sprays out to one side of your stroke. On every move a
 * point is thrown at 90 degrees to the direction of travel, from the previous
 * pen position, by
 *   (1% of the shape's point count + average speed / 2) * multiplier
 * and joined with straight lines. Long strokes get wilder as they go, because
 * the point count keeps growing.
 *
 * "Average speed" follows the Java exactly: each move's speed (|dx| + |dy|)
 * is added to a list that is never trimmed or cleared, and the mean is taken
 * with whole-number division. So it is the average of every move since the
 * module was first used, not just recent ones (the code looks like it was
 * meant to keep the last 10). It settles down over time, so early strokes
 * react to speed more than later ones.
 */
(function (Alchemy) {
  'use strict';

  var HALF_PI = Math.PI / 2;

  var XShapes = {
    id: 'xshapes',
    name: 'X Shapes',
    type: 'create',
    // Speed is measured per event; like Speed, take one event per frame.
    coalesced: false,

    multiplier: 25,   // "Distance" slider 0-100, multiplier = value / 2

    _oldP: null,
    _speedSum: 0,     // sum and count of every speed recorded (the Java's list)
    _speedCount: 0,

    _averageSpeed: function (p1, p2) {
      var speed = Math.trunc(Math.abs(p1.x - p2.x) + Math.abs(p1.y - p2.y));
      this._speedSum += speed;
      this._speedCount++;
      return Math.trunc(this._speedSum / this._speedCount); // int division, as in Java
    },

    pointerDown: function (p, e, canvas) {
      canvas.createShapes.push(canvas.newShape(p));
      canvas.redraw();
      this._oldP = null;
    },

    pointerDrag: function (p, e, canvas) {
      if (!this._oldP) this._oldP = p;
      // Check for a shape in case the canvas was cleared mid-stroke.
      if (!canvas.hasCreateShapes()) return;
      var shape = canvas.getCurrentCreateShape();
      var old = this._oldP;
      var speed = this._averageSpeed(p, old);
      var distance = (shape.totalPoints * 0.01 + speed / 2) * this.multiplier;
      // Direction from the pen back to the previous point, turned 90 degrees
      var angle = Math.atan2(old.y - p.y, old.x - p.x) - HALF_PI;
      shape.lineTo({
        x: old.x + distance * Math.cos(angle),
        y: old.y + distance * Math.sin(angle)
      });
      canvas.redraw();
      this._oldP = p;
    },

    pointerUp: function (p, e, canvas) {
      this._oldP = null;
      canvas.commitShapes();
    }
  };

  Alchemy.modules = Alchemy.modules || {};
  Alchemy.modules.xshapes = XShapes;
})(window.Alchemy = window.Alchemy || {});
