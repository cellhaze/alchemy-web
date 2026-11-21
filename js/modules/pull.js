/*
 * Alchemy Web - modules/pull.js
 * The "Pull Shapes" create module, ported from org.alchemy.create.PullShapes
 * (Karl D.D. Willis and the Alchemy authors).
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version. See LICENSE.
 *
 * Stamps ready-made shapes. Press and drag to drop random shapes from the
 * library, centred on the pen, one every Spacing * 2 + 1 ms (default 51 ms),
 * each scaled by a random 0.1x to Size (default 2x) and, with Rotate on,
 * turned to a random angle. Stamps take the current toolbar colour,
 * opacity, style and weight.
 *
 * The library is the shapes from Alchemy's `shapes` folder (Bones, Circles,
 * Parts, Tangram) plus any SVG files you load. "All Shapes" picks a random
 * group, then a random shape from it, as in the desktop client.
 */
(function (Alchemy) {
  'use strict';

  function random(a, b) {
    return b === undefined ? Math.random() * a : a + Math.random() * (b - a);
  }

  var Pull = {
    id: 'pull',
    name: 'Pull',
    type: 'create',

    group: -1,        // index into the groups, or -1 for "All Shapes"
    spacing: 25,      // "Spacing" slider 0-100; delay = 1 + spacing * 2 ms
    size: 2,          // "Size" slider 1-50: 0.1 + value / 10
    rotate: true,     // "Rotate" toggle

    _time: 0,

    _pick: function () {
      var groups = Alchemy.shapes.getGroups().filter(function (g) { return g.shapes.length; });
      if (!groups.length) return null;
      var g = this.group >= 0 && Alchemy.shapes.getGroups()[this.group];
      if (!g || !g.shapes.length) g = groups[Math.floor(random(groups.length))];
      return g.shapes[Math.floor(random(g.shapes.length))];
    },

    _add: function (canvas, p) {
      var shape = this._pick();
      if (!shape) return;
      var scale = random(0.1, this.size);
      // The Java picks 0.1-57.3 radians, i.e. effectively any angle
      var angle = this.rotate ? random(0.1, 57.2958) : 0;
      canvas.createShapes.push(Alchemy.shapes.stamp(shape, canvas, scale, angle, p));
      canvas.redraw();
    },

    pointerDown: function (p, e, canvas) {
      this._time = Date.now();
      this._add(canvas, p);
    },

    pointerDrag: function (p, e, canvas) {
      var now = Date.now();
      if (now - this._time >= 1 + this.spacing * 2) {
        this._time = now;
        this._add(canvas, p);
      }
    },

    pointerUp: function (p, e, canvas) {
      canvas.commitShapes();
    }
  };

  Alchemy.modules = Alchemy.modules || {};
  Alchemy.modules.pull = Pull;
})(window.Alchemy = window.Alchemy || {});
