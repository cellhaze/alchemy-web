/*
 * Alchemy Web - shape.js
 * A port of org.alchemy.core.AlcShape (Karl D.D. Willis, Jacob Hina and the Alchemy authors).
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version. See LICENSE.
 */
(function (Alchemy) {
  'use strict';

  var STYLE_STROKE = 1;
  var STYLE_FILL = 2;

  // Same constants as AlcShape.java
  var START_POINTS = 5;  // the first few points are joined by straight lines
  var MIN_DISTANCE = 5;  // moves shorter than this (px) are ignored

  function distance(a, b) {
    var dx = a.x - b.x, dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * A single vector shape: a path plus colour, alpha, style and line width.
   * The path is stored both as a Path2D (for drawing) and as a segment list
   * (so later modules can read and rewrite the points, like PathIterator).
   */
  function Shape(p, attrs) {
    attrs = attrs || {};
    this.color = attrs.color || '#000000';
    this.alpha = attrs.alpha != null ? attrs.alpha : 255;
    this.style = attrs.style || STYLE_STROKE;
    this.lineWidth = Math.max(0, attrs.lineWidth != null ? attrs.lineWidth : 1);

    this.path = new Path2D();
    this.segments = [];
    this.totalPoints = 0;
    this.lastPoint = null;

    if (p) {
      // AlcShape.setup(Point): moveTo, then totalPoints++ and savePoints(p).
      this.path.moveTo(p.x, p.y);
      this.segments.push({ type: 'M', x: p.x, y: p.y });
      this.totalPoints++;
      this._savePoint(p);
    }
  }

  Shape.prototype._savePoint = function (p) {
    this.totalPoints++;
    this.lastPoint = { x: p.x, y: p.y };
  };

  /** Smoothed point: straight lines at first, then quadratic curves through midpoints. */
  Shape.prototype.curveTo = function (p) {
    if (!Shape.lineSmoothing) {
      this.lineTo(p);
      return;
    }
    if (this.lastPoint && p.x === this.lastPoint.x && p.y === this.lastPoint.y) return;

    if (this.totalPoints < START_POINTS || !this.lastPoint) {
      this.path.lineTo(p.x, p.y);
      this.segments.push({ type: 'L', x: p.x, y: p.y });
      this._savePoint(p);
    } else if (distance(p, this.lastPoint) > MIN_DISTANCE) {
      var lp = this.lastPoint;
      var mx = (lp.x + p.x) / 2;
      var my = (lp.y + p.y) / 2;
      this.path.quadraticCurveTo(lp.x, lp.y, mx, my);
      this.segments.push({ type: 'Q', cx: lp.x, cy: lp.y, x: mx, y: my });
      this._savePoint(p);
    }
  };

  /** Straight segment, with the same start/minimum-distance rules as curveTo. */
  Shape.prototype.lineTo = function (p) {
    if (this.lastPoint && p.x === this.lastPoint.x && p.y === this.lastPoint.y) return;

    if (this.totalPoints < START_POINTS || !this.lastPoint ||
        distance(p, this.lastPoint) > MIN_DISTANCE) {
      this.path.lineTo(p.x, p.y);
      this.segments.push({ type: 'L', x: p.x, y: p.y });
      this._savePoint(p);
    }
  };

  /** Rebuild the Path2D from the segment list (for modules that edit segments). */
  Shape.prototype.rebuildPath = function () {
    var path = new Path2D();
    for (var i = 0; i < this.segments.length; i++) {
      var s = this.segments[i];
      if (s.type === 'M') path.moveTo(s.x, s.y);
      else if (s.type === 'L') path.lineTo(s.x, s.y);
      else if (s.type === 'Q') path.quadraticCurveTo(s.cx, s.cy, s.x, s.y);
      else if (s.type === 'C') path.bezierCurveTo(s.c1x, s.c1y, s.c2x, s.c2y, s.x, s.y);
      else if (s.type === 'Z') path.closePath();
    }
    this.path = path;
  };

  /**
   * A copy of this shape with every point passed through map({x, y}) -> {x, y}.
   * Keeps colour, alpha, style, width and point count, like AlcShape.customClone.
   */
  Shape.prototype.transformed = function (map) {
    var copy = new Shape(null, this);
    copy.segments = this.segments.map(function (s) {
      var t = { type: s.type };
      if (s.type === 'Z') return t;
      var p = map({ x: s.x, y: s.y });
      t.x = p.x; t.y = p.y;
      if (s.type === 'Q') {
        var c = map({ x: s.cx, y: s.cy });
        t.cx = c.x; t.cy = c.y;
      } else if (s.type === 'C') {
        var c1 = map({ x: s.c1x, y: s.c1y });
        var c2 = map({ x: s.c2x, y: s.c2y });
        t.c1x = c1.x; t.c1y = c1.y; t.c2x = c2.x; t.c2y = c2.y;
      }
      return t;
    });
    copy.totalPoints = this.totalPoints;
    copy.lastPoint = this.lastPoint ? map(this.lastPoint) : null;
    copy.rebuildPath();
    return copy;
  };

  /** End point of every segment, like AlcShape.getPoints(). */
  Shape.prototype.getPoints = function () {
    var pts = [];
    for (var i = 0; i < this.segments.length; i++) {
      var s = this.segments[i];
      if (s.type !== 'Z') pts.push({ x: s.x, y: s.y });
    }
    return pts;
  };

  /** Colour with the shape's alpha applied, as a CSS string. */
  Shape.prototype.cssColor = function () {
    var hex = this.color.replace('#', '');
    var r = parseInt(hex.substr(0, 2), 16);
    var g = parseInt(hex.substr(2, 2), 16);
    var b = parseInt(hex.substr(4, 2), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + (this.alpha / 255) + ')';
  };

  /** Draw onto a 2D context, matching AlcCanvas.paintComponent. */
  Shape.prototype.draw = function (ctx) {
    var paint = this.cssColor();
    if (this.style === STYLE_STROKE) {
      // Java's BasicStroke(0) still draws a hairline; canvas ignores 0, so clamp.
      ctx.lineWidth = Math.max(this.lineWidth, 0.5);
      ctx.lineCap = 'round';   // BasicStroke.CAP_ROUND
      ctx.lineJoin = 'bevel';  // BasicStroke.JOIN_BEVEL
      ctx.strokeStyle = paint;
      ctx.stroke(this.path);
    } else {
      ctx.fillStyle = paint;
      ctx.fill(this.path, 'nonzero'); // GeneralPath.WIND_NON_ZERO
    }
  };

  Shape.lineSmoothing = true;

  Alchemy.Shape = Shape;
  Alchemy.STYLE_STROKE = STYLE_STROKE;
  Alchemy.STYLE_FILL = STYLE_FILL;
})(window.Alchemy = window.Alchemy || {});
