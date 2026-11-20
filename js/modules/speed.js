/*
 * Alchemy Web - modules/speed.js
 * The "Speed Shapes" create module, ported from org.alchemy.create.SpeedShapes
 * (Karl D.D. Willis and the Alchemy authors).
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version. See LICENSE.
 *
 * Slow movement draws a normal line; fast movement flings the line out ahead
 * of the pen, making spiky bursts. On every drag event the new point is
 * pushed forward along the direction of travel by
 *   speed * multiplier,  where speed = (|dx| + |dy|) / 2 since the last event.
 * "Line Type" switches between curved and straight segments.
 */
(function (Alchemy) {
  'use strict';

  var Speed = {
    id: 'speed',
    name: 'Speed',
    type: 'create',
    // Speed is measured per event, so take one event per frame (roughly
    // Java's mouse-drag rate) rather than every pen sample.
    coalesced: false,

    multiplier: 15,   // "Speed" slider, 0-35
    freeform: true,   // curved (true) or straight (false) segments

    _oldP: null,

    pointerDown: function (p, e, canvas) {
      canvas.createShapes.push(canvas.newShape(p));
      canvas.redraw();
      this._oldP = p;
    },

    pointerDrag: function (p, e, canvas) {
      // Check for a shape in case the canvas was cleared mid-stroke.
      if (!canvas.hasCreateShapes() || !this._oldP) return;
      var old = this._oldP;
      // getCursorSpeed() / 2, with Java's integer division
      var speed = Math.floor((Math.abs(p.x - old.x) + Math.abs(p.y - old.y)) / 2);
      var distance = speed * this.multiplier;
      var angle = Math.atan2(p.y - old.y, p.x - old.x);
      var pt = {
        x: p.x + distance * Math.cos(angle),
        y: p.y + distance * Math.sin(angle)
      };
      var shape = canvas.getCurrentCreateShape();
      if (this.freeform) shape.curveTo(pt);
      else shape.lineTo(pt);
      canvas.redraw();
      this._oldP = p;
    },

    pointerUp: function (p, e, canvas) {
      this._oldP = null;
      canvas.commitShapes();
    }
  };

  Alchemy.modules = Alchemy.modules || {};
  Alchemy.modules.speed = Speed;
})(window.Alchemy = window.Alchemy || {});
