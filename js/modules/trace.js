/*
 * Alchemy Web - modules/trace.js
 * The "Trace Shapes" create module, ported from org.alchemy.create.TraceShapes
 * (Karl D.D. Willis and the Alchemy authors).
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version. See LICENSE.
 *
 * A freehand line that snaps to edges in a photo you may not be able to see.
 * Each point you draw moves to the highest-contrast pixel within Snap
 * Distance px (compared with the brightness under the pen), as long as the
 * difference is more than Tolerance (0-255 scale). Where nothing contrasts
 * enough, the point stays where you drew it.
 *
 * The photo is scaled to fit the window and centred, and hidden unless
 * Display Image is on. Load Image picks a photo; without one, Trace uses the
 * canvas background image (View > Image…) if there is one.
 *
 * The desktop client downloaded a random Flickr photo; that service no
 * longer works, so here you load your own.
 */
(function (Alchemy) {
  'use strict';

  /** AlcUtil.getColorBrightness */
  function brightness(r, g, b) {
    return Math.trunc((222 * r + 707 * g + 71 * b) / 1000);
  }

  var Trace = {
    id: 'trace',
    name: 'Trace',
    type: 'create',

    snap: 30,          // "Snap Distance" slider, 1-100 (half the search square)
    tolerance: 100,    // "Tolerance" slider, 0-200
    display: false,    // "Display Image" toggle

    image: null,       // the photo loaded in Trace (an <img>)

    _canvas: null,
    _cache: null,      // { source, rect, w, h, lum } brightness map of the image as fitted

    setup: function (canvas) {
      this._canvas = canvas;
      this._updateUnderlay();
    },

    deselect: function (canvas) {
      // Like the Java, hide Trace's photo when another module is picked
      canvas.underlay = null;
      canvas.redraw();
    },

    setImage: function (img) {
      this.image = img;
      this._cache = null;
      this._updateUnderlay();
    },

    setDisplay: function (on) {
      this.display = on;
      this._updateUnderlay();
    },

    _updateUnderlay: function () {
      var c = this._canvas;
      if (!c) return;
      var self = this;
      c.underlay = (this.display && this.image) ? function (ctx) {
        var r = self._fitRect(self.image);
        ctx.drawImage(self.image, r.x, r.y, r.width, r.height);
      } : null;
      c.redraw();
    },

    /** Scale to fit the window (up or down) and centre, like TraceShapes.setImage. */
    _fitRect: function (img) {
      var c = this._canvas;
      var scale = Math.min(c.width / img.naturalWidth, c.height / img.naturalHeight);
      var w = Math.round(img.naturalWidth * scale), h = Math.round(img.naturalHeight * scale);
      return { x: Math.trunc((c.width - w) / 2), y: Math.trunc((c.height - h) / 2), width: w, height: h };
    },

    /** The image to trace and where it sits: Trace's own, else the background image. */
    _source: function () {
      var c = this._canvas;
      if (this.image) return { img: this.image, rect: this._fitRect(this.image) };
      if (c.bgImage) return { img: c.bgImage, rect: c.getBackgroundImageRect() };
      return null;
    },

    /** Brightness of every pixel of the image at its on-screen size, cached. */
    _brightnessMap: function (src) {
      var r = src.rect;
      var w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
      var cache = this._cache;
      if (cache && cache.source === src.img && cache.w === w && cache.h === h &&
          cache.x === r.x && cache.y === r.y) {
        return cache;
      }
      var cv = document.createElement('canvas');
      cv.width = w; cv.height = h;
      var ctx = cv.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(src.img, 0, 0, w, h);
      var data = ctx.getImageData(0, 0, w, h).data;
      var lum = new Uint8Array(w * h);
      for (var i = 0; i < lum.length; i++) lum[i] = brightness(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]);
      this._cache = { source: src.img, x: r.x, y: r.y, w: w, h: h, lum: lum };
      return this._cache;
    },

    /** Move p to the highest-contrast pixel nearby, if any passes the tolerance (checkSnap). */
    snapPoint: function (p) {
      var src = this._source();
      if (!src) return p;
      var map = this._brightnessMap(src);
      var ax = Math.trunc(p.x - map.x), ay = Math.trunc(p.y - map.y);
      if (ax < 0 || ay < 0 || ax >= map.w || ay >= map.h) return p;

      var here = map.lum[ay * map.w + ax];
      var startX = Math.max(0, ax - this.snap), startY = Math.max(0, ay - this.snap);
      var endX = Math.min(map.w, ax + this.snap), endY = Math.min(map.h, ay + this.snap);
      var best = 0, bx = -1, by = -1;
      for (var x = startX; x < endX; x++) {
        for (var y = startY; y < endY; y++) {
          var diff = Math.abs(map.lum[y * map.w + x] - here);
          if (diff > this.tolerance && diff > best) {
            best = diff; bx = x; by = y;
          }
        }
      }
      return bx < 0 ? p : { x: bx + map.x, y: by + map.y };
    },

    pointerDown: function (p, e, canvas) {
      canvas.createShapes.push(canvas.newShape(p));
      canvas.redraw();
    },

    pointerDrag: function (p, e, canvas) {
      if (!canvas.hasCreateShapes()) return;
      canvas.getCurrentCreateShape().curveTo(this.snapPoint(p));
      canvas.redraw();
    },

    pointerUp: function (p, e, canvas) {
      canvas.commitShapes();
    }
  };

  Alchemy.modules = Alchemy.modules || {};
  Alchemy.modules.trace = Trace;
})(window.Alchemy = window.Alchemy || {});
