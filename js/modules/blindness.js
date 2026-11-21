/*
 * Alchemy Web - modules/blindness.js
 * The "Blindness" affect module, ported from org.alchemy.affect.Blindness
 * (Karl D.D. Willis and the Alchemy authors).
 *
 * Draw without seeing: while it's on, the screen stops updating, so strokes
 * are drawn "in the dark". The drawing appears when you reveal it:
 *   - Auto-reveal (on by default) shows it each time you lift the pen.
 *   - Reveal (or the R key) shows it any time.
 * Clearing the canvas still clears the screen, as in the desktop client.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version. See LICENSE.
 */
(function (Alchemy) {
  'use strict';

  var Blindness = {
    id: 'blindness',
    name: 'Blindness',
    type: 'affect',

    autoReveal: true,

    _canvas: null,

    setup: function (canvas) {
      this._canvas = canvas;
      canvas.setRedraw(false);
    },

    deselect: function (canvas) {
      canvas.setRedraw(true);
      canvas.redraw();
    },

    reveal: function () {
      if (this._canvas) this._canvas.forceRedraw();
    },

    pointerUp: function () {
      // Runs after the create module has saved its shape (create modules get
      // events first), so the new stroke is included.
      if (this.autoReveal) this.reveal();
    }
  };

  Alchemy.modules = Alchemy.modules || {};
  Alchemy.modules.blindness = Blindness;
})(window.Alchemy = window.Alchemy || {});
