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
    // True for shapes drawn point by point (AlcShape.penShape); Gradient uses it.
    this.penShape = false;
    // Optional linear gradient {x1, y1, x2, y2}: shape colour at p1 fading to
    // transparent at p2, like the GradientPaint set by the Gradient affect.
    this.gradient = attrs.gradient ? copyGradient(attrs.gradient) : null;
    // Bumped whenever the path changes, so affects can cache work per shape.
    this.version = 0;
    // Variable-width strokes (AlcShape.spine): the centre line and the width
    // at each point. The path is the outline built around it by createSpine().
    this.spine = null;
    this.spineWidth = null;

    if (p) {
      // AlcShape.setup(Point): moveTo, then totalPoints++ and savePoints(p).
      this.path.moveTo(p.x, p.y);
      this.segments.push({ type: 'M', x: p.x, y: p.y });
      this.totalPoints++;
      this._savePoint(p);
    }
  }

  function copyGradient(g) {
    return { x1: g.x1, y1: g.y1, x2: g.x2, y2: g.y2 };
  }

  Shape.prototype._savePoint = function (p) {
    this.totalPoints++;
    this.lastPoint = { x: p.x, y: p.y };
    this.penShape = true;
    this.version++;
  };

  var MIN_DISTANCE_SPINE = 3; // spine points closer than this (px) are ignored

  /**
   * The point `distance` px from p1, at a right angle to the line from p2 to
   * p1 (AlcShape.rightAngle). Positive distances go to the left of travel.
   */
  Shape.rightAngle = function (p1, p2, distance) {
    var angle = Math.atan2(p1.y - p2.y, p1.x - p2.x) - Math.PI / 2;
    return { x: p1.x + distance * Math.cos(angle), y: p1.y + distance * Math.sin(angle) };
  };

  Shape.prototype.hasSpine = function () {
    return this.spine !== null;
  };

  /** Restart the path at p (AlcShape.setPoint). Like the Java, lastPoint is kept. */
  Shape.prototype.setPoint = function (p) {
    this.path = new Path2D();
    this.path.moveTo(p.x, p.y);
    this.segments = [{ type: 'M', x: p.x, y: p.y }];
    this.totalPoints = 1;
    this.version++;
  };

  /** Add a centre-line point with a width, and rebuild the outline (AlcShape.spineTo). */
  Shape.prototype.spineTo = function (p, width) {
    this.penShape = true;
    if (!this.spine) this.spine = [];
    if (!this.spineWidth) this.spineWidth = [];
    if (this.spine.length === 0) {
      this.spine.push({ x: p.x, y: p.y });
      this.spineWidth.push(width);
    } else if (distance(p, this.spine[this.spine.length - 1]) > MIN_DISTANCE_SPINE) {
      this.spine.push({ x: p.x, y: p.y });
      this.spineWidth.push(width);
      this.createSpine();
    }
  };

  /**
   * Rebuild the closed outline from the spine (AlcShape.createSpine): out
   * along one side, offset by each point's width at a right angle, then back
   * along the other side.
   */
  Shape.prototype.createSpine = function () {
    var spine = this.spine, widths = this.spineWidth;
    if (!spine || spine.length === 0) return;
    this.setPoint(spine[0]);
    var i;
    for (i = 1; i < spine.length; i++) {
      this.curveTo(Shape.rightAngle(spine[i], spine[i - 1], widths[i]));
    }
    for (var j = 1; j < spine.length; j++) {
      var index = spine.length - j;
      this.curveTo(Shape.rightAngle(spine[index - 1], spine[index], widths[index]));
    }
    this.path.closePath();
    this.segments.push({ type: 'Z' });
  };

  /**
   * Append a quadratic curve directly, without smoothing or the minimum
   * distance check (SplatterShapes does this via getPath().quadTo()).
   */
  Shape.prototype.quadTo = function (c, p) {
    this.path.quadraticCurveTo(c.x, c.y, p.x, p.y);
    this.segments.push({ type: 'Q', cx: c.x, cy: c.y, x: p.x, y: p.y });
    this.version++;
  };

  /** First point of the path (its first moveTo), or null. */
  Shape.prototype.getStartPoint = function () {
    for (var i = 0; i < this.segments.length; i++) {
      if (this.segments[i].type === 'M') return { x: this.segments[i].x, y: this.segments[i].y };
    }
    return null;
  };

  /** Where the path currently ends, like GeneralPath.getCurrentPoint(). */
  Shape.prototype.getCurrentPoint = function () {
    for (var i = this.segments.length - 1; i >= 0; i--) {
      var s = this.segments[i];
      if (s.type !== 'Z') return { x: s.x, y: s.y };
    }
    return null;
  };

  /** Bounding box of every point and control point, as {x, y, width, height}. */
  Shape.prototype.getBounds = function () {
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    function add(x, y) {
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
    for (var i = 0; i < this.segments.length; i++) {
      var s = this.segments[i];
      if (s.type === 'Z') continue;
      add(s.x, s.y);
      if (s.type === 'Q') add(s.cx, s.cy);
      if (s.type === 'C') { add(s.c1x, s.c1y); add(s.c2x, s.c2y); }
    }
    if (minX === Infinity) return { x: 0, y: 0, width: 0, height: 0 };
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
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
    this.version++;
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
    copy.penShape = this.penShape;
    if (this.spine) {
      copy.spine = this.spine.map(map);
      copy.spineWidth = this.spineWidth.slice();
    }
    if (this.gradient) {
      var g1 = map({ x: this.gradient.x1, y: this.gradient.y1 });
      var g2 = map({ x: this.gradient.x2, y: this.gradient.y2 });
      copy.gradient = { x1: g1.x, y1: g1.y, x2: g2.x, y2: g2.y };
    }
    copy.rebuildPath();
    return copy;
  };

  /** Replace the whole path with a new segment list (like AlcShape.setPath). */
  Shape.prototype.setSegments = function (segments) {
    this.segments = segments;
    this.rebuildPath();
  };

  // One shared, untransformed context for hit testing.
  var hitCtx = null;

  /**
   * Is point p inside the shape's area (GeneralPath.contains)? Open paths
   * count as closed and the non-zero winding rule applies, so a thin line
   * only "contains" the area it loops around, as in the desktop client.
   */
  Shape.prototype.contains = function (p) {
    if (!hitCtx) hitCtx = document.createElement('canvas').getContext('2d');
    return hitCtx.isPointInPath(this.path, p.x, p.y, 'nonzero');
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

  /** Colour with the given alpha (default: the shape's own), as a CSS string. */
  Shape.prototype.cssColor = function (alpha) {
    var hex = this.color.replace('#', '');
    var r = parseInt(hex.substr(0, 2), 16);
    var g = parseInt(hex.substr(2, 2), 16);
    var b = parseInt(hex.substr(4, 2), 16);
    var a = (alpha != null ? alpha : this.alpha) / 255;
    return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
  };

  /** Solid colour, or the gradient if one is set (AlcShape.getPaint). */
  Shape.prototype.getPaint = function (ctx) {
    var g = this.gradient;
    // A zero-length canvas gradient paints nothing, so fall back to the colour.
    if (!g || (g.x1 === g.x2 && g.y1 === g.y2)) return this.cssColor();
    // Like an acyclic java.awt.GradientPaint: solid before p1, clear after p2.
    var paint = ctx.createLinearGradient(g.x1, g.y1, g.x2, g.y2);
    paint.addColorStop(0, this.cssColor());
    paint.addColorStop(1, this.cssColor(0));
    return paint;
  };

  /** Draw onto a 2D context, matching AlcCanvas.paintComponent. */
  Shape.prototype.draw = function (ctx) {
    var paint = this.getPaint(ctx);
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
