/*
 * Alchemy Web - modules/limit.js
 * The "Limit" affect module, ported from org.alchemy.affect.Limit
 * (Karl D.D. Willis and the Alchemy authors).
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version. See LICENSE.
 *
 * Only the most recent Number shapes (default 10) stay on the canvas; older
 * ones disappear as you draw, giving a moving, trailing effect. Shapes still
 * being drawn and mirror copies count towards the limit, so with Mirror or
 * Splatter the trail is shorter than the number suggests.
 *
 * Turning Limit off doesn't bring back shapes it removed.
 */
(function (Alchemy) {
  'use strict';

  var Limit = {
    id: 'limit',
    name: 'Limit',
    type: 'affect',

    limit: 10,   // "Number" spinner, 1-100

    _canvas: null,

    setup: function (canvas) {
      this._canvas = canvas;
    },

    affect: function () {
      var c = this._canvas;
      if (!c || c.shapes.length === 0) return;
      var total = c.shapes.length + c.createShapes.length + c.affectShapes.length;
      if (total <= this.limit) return;

      // Same arithmetic as Limit.affect() in the Java: remove the oldest
      // finished shapes, keeping at least one if the in-progress shapes
      // alone are over the limit.
      var toRemove = total - this.limit;
      var end = toRemove;
      if (toRemove > c.shapes.length) end = c.shapes.length - 1;
      if (end === 0) c.shapes.splice(0, 1);
      else if (end > 0) c.shapes.splice(0, end);

      // Re-render the finished shapes; the redraw that called us repaints.
      c.renderBuffer();
    }
  };

  Alchemy.modules = Alchemy.modules || {};
  Alchemy.modules.limit = Limit;
})(window.Alchemy = window.Alchemy || {});
