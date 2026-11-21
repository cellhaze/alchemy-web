/*
 * Alchemy Web - modules/pressure.js
 * The "Pressure Shapes" create module, ported from
 * org.alchemy.create.PressureShapes (Karl D.D. Willis and the Alchemy authors).
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version. See LICENSE.
 *
 * A calligraphic stroke that swells and thins with pen pressure. Each move
 * adds a point to the stroke's centre line (its spine) with a width of
 *   pen pressure (0-1) * Pressure setting
 * on each side, and the outline is rebuilt around it. A mouse has no
 * pressure, so it draws at a constant width of 1 on each side.
 *
 * The outline is a closed shape, so this looks best in Solid style; in Line
 * style you get the outline traced around the stroke.
 */
(function (Alchemy) {
  'use strict';

  var Pressure = {
    id: 'pressure',
    name: 'Pressure',
    type: 'create',

    amount: 25,   // "Pressure" spinner, 1-200

    _pressure: function (canvas) {
      if (canvas.penType === 'mouse') return 1;
      return canvas.penPressure * this.amount;
    },

    pointerDown: function (p, e, canvas) {
      var shape = canvas.newShape(null);
      shape.spineTo(canvas.penLocation, this._pressure(canvas));
      canvas.createShapes.push(shape);
    },

    pointerDrag: function (p, e, canvas) {
      var shape = canvas.getCurrentCreateShape();
      // Check for a shape in case the canvas was cleared mid-stroke.
      if (!shape) return;
      shape.spineTo(canvas.penLocation, this._pressure(canvas));
      canvas.redraw();
    },

    pointerUp: function (p, e, canvas) {
      canvas.commitShapes();
    }
  };

  Alchemy.modules = Alchemy.modules || {};
  Alchemy.modules.pressure = Pressure;
})(window.Alchemy = window.Alchemy || {});
