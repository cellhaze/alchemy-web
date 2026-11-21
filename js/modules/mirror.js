/*
 * Alchemy Web - modules/mirror.js
 * The "Mirror" affect module, ported from org.alchemy.affect.Mirror
 * (Karl D.D. Willis and the Alchemy authors).
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version. See LICENSE.
 *
 * Draws reflected copies of every shape while it is being drawn.
 *   horizontal  flip left/right across a vertical line at x = axisX
 *   vertical    flip top/bottom across a horizontal line at y = axisY
 *   both        adds a third copy flipped both ways (four-way symmetry)
 * The copies live in canvas.affectShapes and are committed with the original.
 *
 * As in the original, the copies for create shape i sit at
 * affectShapes[i * shapeCount + k], where shapeCount is how many copies each
 * shape gets (1 to 3). Gradients and pressure-stroke spines are reflected
 * along with the path (Shape.transformed handles both).
 */
(function (Alchemy) {
  'use strict';

  var GUIDE_COLOR = '#00ffff';
  var GUIDE_ALPHA = 100;

  var Mirror = {
    id: 'mirror',
    name: 'Mirror',
    type: 'affect',

    horizontal: true,
    vertical: false,
    axisX: 0,
    axisY: 0,
    selectingAxis: false,
    _guide: null,
    _canvas: null,

    setup: function (canvas) {
      this._canvas = canvas;
      this.resetAxis();
    },

    deselect: function (canvas) {
      this.cancelAxisSelect();
    },

    cleared: function () {
      // A clear also wipes the guide list, so draw a fresh crosshair next move.
      this._guide = null;
    },

    resetAxis: function () {
      var c = this._canvas;
      if (!c) return;
      this.axisX = c.width / 2;
      this.axisY = c.height / 2;
    },

    shapeCount: function () {
      var n = 0;
      if (this.horizontal) n++;
      if (this.vertical) n++;
      if (this.horizontal && this.vertical) n++;
      return n;
    },

    setHorizontal: function (on) {
      this.horizontal = on;
      this._resetCopies();
    },

    setVertical: function (on) {
      this.vertical = on;
      this._resetCopies();
    },

    // Changing H/V mid-stroke changes the copy layout, so rebuild from scratch.
    _resetCopies: function () {
      var c = this._canvas;
      if (c && !c.penDown) c.affectShapes.length = 0;
      if (c) c.redraw();
    },

    // --- Axis selection: a cyan crosshair follows the pen; click to place it ---

    startAxisSelect: function () {
      var c = this._canvas;
      if (!c) return;
      c.commitShapes();
      this.selectingAxis = true;
      c.createEvents = false;
      this._showGuide(c.penLocation);
    },

    cancelAxisSelect: function () {
      var c = this._canvas;
      if (!this.selectingAxis || !c) return;
      this.selectingAxis = false;
      this._removeGuide();
      c.createEvents = true;
      c.redraw();
      if (this.onAxisSelectEnd) this.onAxisSelectEnd();
    },

    _showGuide: function (p) {
      var c = this._canvas;
      var guide = new Alchemy.Shape({ x: p.x, y: 0 },
        { color: GUIDE_COLOR, alpha: GUIDE_ALPHA, style: Alchemy.STYLE_STROKE, lineWidth: 1 });
      guide.segments = [
        { type: 'M', x: p.x, y: 0 }, { type: 'L', x: p.x, y: c.height },
        { type: 'M', x: 0, y: p.y }, { type: 'L', x: c.width, y: p.y }
      ];
      guide.rebuildPath();
      var i = this._guide ? c.guideShapes.indexOf(this._guide) : -1;
      if (i >= 0) c.guideShapes[i] = guide;
      else c.guideShapes.push(guide);
      this._guide = guide;
      c.redraw();
    },

    _removeGuide: function () {
      var c = this._canvas;
      var i = this._guide ? c.guideShapes.indexOf(this._guide) : -1;
      if (i >= 0) c.guideShapes.splice(i, 1);
      this._guide = null;
    },

    pointerMove: function (p) {
      if (this.selectingAxis) this._showGuide(p);
    },

    pointerDrag: function (p) {
      if (this.selectingAxis) this._showGuide(p);
    },

    pointerUp: function (p) {
      if (!this.selectingAxis) return;
      this.axisX = p.x;
      this.axisY = p.y;
      this.cancelAxisSelect();
    },

    // --- The affect itself: runs before every redraw ---

    affect: function () {
      var c = this._canvas;
      if (!c || this.selectingAxis) return;

      var ax = this.axisX, ay = this.axisY;
      function flipX(p) { return { x: 2 * ax - p.x, y: p.y }; }
      function flipY(p) { return { x: p.x, y: 2 * ay - p.y }; }
      function flipXY(p) { return { x: 2 * ax - p.x, y: 2 * ay - p.y }; }

      var maps = [];
      if (this.horizontal) maps.push(flipX);
      if (this.vertical) maps.push(flipY);
      if (this.horizontal && this.vertical) maps.push(flipXY);
      var count = maps.length;
      if (!count) return;

      var axisKey = ax + ',' + ay;
      for (var i = 0; i < c.createShapes.length; i++) {
        var shape = c.createShapes[i];
        // Everything a copy depends on besides the path itself.
        var g = shape.gradient;
        var key = axisKey + '|' + shape.style + '|' + shape.color + '|' + shape.alpha + '|' +
          shape.lineWidth + '|' + (g ? [g.x1, g.y1, g.x2, g.y2].join() : '');
        for (var k = 0; k < count; k++) {
          var index = i * count + k;
          var old = c.affectShapes[index];
          // Skip shapes that haven't changed since they were last copied; modules
          // like SplatterShapes leave hundreds of finished shapes in createShapes.
          if (old && old._mirrorOf === shape && old._mirrorMap === k &&
              old._mirrorVersion === shape.version && old._mirrorKey === key) {
            continue;
          }
          // Replace the copy in place, or add it if this shape is new.
          var copy = shape.transformed(maps[k]);
          copy._mirrorOf = shape;
          copy._mirrorMap = k;
          copy._mirrorVersion = shape.version;
          copy._mirrorKey = key;
          c.affectShapes[index] = copy;
        }
      }
    }
  };

  Alchemy.modules = Alchemy.modules || {};
  Alchemy.modules.mirror = Mirror;
})(window.Alchemy = window.Alchemy || {});
