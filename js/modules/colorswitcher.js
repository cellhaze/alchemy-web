/*
 * Alchemy Web - modules/colorswitcher.js
 * The "Color Switcher" affect module, ported from
 * org.alchemy.affect.ColorSwitcher (Karl D.D. Willis and the Alchemy authors).
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version. See LICENSE.
 *
 * Each new stroke gets a new random colour and/or transparency.
 *   - Base Color on: the colour wanders within +/- Range/2 % of the base
 *     colour's hue, saturation and brightness. The base starts as the
 *     toolbar colour when the module is first turned on.
 *   - Transparency on: a random opacity from 0 to 100%.
 *   - Constant on: keeps changing about every 50 ms while you draw,
 *     recolouring the stroke in progress.
 * The toolbar colour and opacity update to match, so you can see (and keep)
 * the colour it picked.
 *
 * The desktop client asked for the base colour in a dialog when Base Color
 * was switched on; here it's a separate colour swatch.
 */
(function (Alchemy) {
  'use strict';

  var DELAY = 50; // ms between changes in Constant mode

  function random(a, b) {
    return a + Math.random() * (b - a);
  }

  function hexToRgb(hex) {
    hex = hex.replace('#', '');
    return [parseInt(hex.substr(0, 2), 16), parseInt(hex.substr(2, 2), 16), parseInt(hex.substr(4, 2), 16)];
  }

  function rgbToHex(rgb) {
    return '#' + rgb.map(function (v) {
      var s = Math.max(0, Math.min(255, Math.round(v))).toString(16);
      return s.length < 2 ? '0' + s : s;
    }).join('');
  }

  /** java.awt.Color.RGBtoHSB: hue, saturation, brightness, each 0-1. */
  function rgbToHsb(rgb) {
    var r = rgb[0], g = rgb[1], b = rgb[2];
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var brightness = max / 255;
    var saturation = max !== 0 ? (max - min) / max : 0;
    var hue = 0;
    if (saturation !== 0) {
      var rc = (max - r) / (max - min), gc = (max - g) / (max - min), bc = (max - b) / (max - min);
      if (r === max) hue = bc - gc;
      else if (g === max) hue = 2 + rc - bc;
      else hue = 4 + gc - rc;
      hue /= 6;
      if (hue < 0) hue += 1;
    }
    return [hue, saturation, brightness];
  }

  /** java.awt.Color.getHSBColor (HSBtoRGB). */
  function hsbToRgb(h, s, v) {
    if (s === 0) return [v * 255, v * 255, v * 255];
    var hh = (h - Math.floor(h)) * 6;
    var f = hh - Math.floor(hh);
    var p = v * (1 - s), q = v * (1 - s * f), t = v * (1 - s * (1 - f));
    var rgb;
    switch (Math.floor(hh)) {
      case 0: rgb = [v, t, p]; break;
      case 1: rgb = [q, v, p]; break;
      case 2: rgb = [p, v, t]; break;
      case 3: rgb = [p, q, v]; break;
      case 4: rgb = [t, p, v]; break;
      default: rgb = [v, p, q];
    }
    return rgb.map(function (x) { return x * 255; });
  }

  /** A random number within +/- range of num, kept inside 0-1 by shifting the window. */
  function diverge(num, range) {
    var min = num - range, max = num + range;
    if (min < 0) {
      max += -min;
      min = 0;
    } else if (max > 1) {
      min -= max - 1;
      max = 1;
    }
    return random(min, max);
  }

  var ColorSwitcher = {
    id: 'colorswitcher',
    name: 'Color Switcher',
    type: 'affect',

    switchColor: true,     // "Base Color" toggle
    switchAlpha: true,     // "Transparency" toggle
    constant: false,       // "Constant" toggle
    range: 50,             // "Range" slider, 0-100
    baseColor: null,       // hex; set from the toolbar colour on first use

    _canvas: null,
    _time: 0,

    setup: function (canvas) {
      this._canvas = canvas;
      if (!this.baseColor) this.baseColor = canvas.color;
    },

    setBaseColor: function (hex) {
      this.baseColor = hex;
    },

    _randomColor: function () {
      var hsb = rgbToHsb(hexToRgb(this.baseColor));
      var half = (this.range / 100) / 2;
      return rgbToHex(hsbToRgb(diverge(hsb[0], half), diverge(hsb[1], half), diverge(hsb[2], half)));
    },

    /** Pick a new colour/opacity for the canvas; returns false if nothing changed. */
    _newColor: function () {
      var c = this._canvas;
      if (this.switchColor) c.color = this._randomColor();
      if (this.switchAlpha) c.alpha = Math.floor(random(0, 255));
      return this.switchColor || this.switchAlpha;
    },

    /** Recolour the strokes in progress with the canvas colour and opacity. */
    _apply: function () {
      var c = this._canvas;
      var lists = [c.createShapes, c.affectShapes];
      for (var j = 0; j < lists.length; j++) {
        for (var i = 0; i < lists[j].length; i++) {
          lists[j][i].color = c.color;
          lists[j][i].alpha = c.alpha;
        }
      }
      if (c.onSettingsChanged) c.onSettingsChanged();
    },

    // Affects get pointer events after the create module, so the stroke it
    // just started is already there to recolour.
    pointerDown: function (p, e, canvas) {
      this._time = Date.now();
      if (this._newColor()) this._apply();
      canvas.redraw();
    },

    pointerDrag: function (p, e, canvas) {
      if (!this.constant) return;
      var now = Date.now();
      if (now - this._time < DELAY) return;
      this._time = now;
      if (this._newColor()) this._apply();
    }
  };

  Alchemy.modules = Alchemy.modules || {};
  Alchemy.modules.colorswitcher = ColorSwitcher;
})(window.Alchemy = window.Alchemy || {});
