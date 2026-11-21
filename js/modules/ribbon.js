/*
 * Alchemy Web - modules/ribbon.js
 * The "Ribbon Shapes" create module, ported from
 * org.alchemy.create.RibbonShapes (Karl D.D. Willis and the Alchemy authors).
 *
 * The Java module credits it as based on James Alliban's code
 * (http://jamesalliban.wordpress.com/2008/12/04/2d-ribbons/), which is based
 * on Erik Natzke's (http://www.flickr.com/photos/natzke/2343461294/).
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version. See LICENSE.
 *
 * Flowing, twisting ribbons. The last 20 pen positions are particles with
 * gravity, friction and drag; a closed outline is built from points offset to
 * the left and right of each particle, wide in the middle and pointed at the
 * ends. Every Spacing ms the current ribbon is saved and a new one starts, so
 * a stroke leaves a trail of overlapping ribbon pieces.
 *
 * Friction above 1 (the default is 1.1) makes particles speed up rather than
 * slow down, so with gravity on the ribbons sag and fall the longer you hold
 * still, as in the desktop client. The physics runs once per pen event, so it
 * takes one event per frame for a steadier speed.
 */
(function (Alchemy) {
  'use strict';

  var HALF_PI = Math.PI / 2;
  var PARTICLES = 20;     // ribbonParticleAmount
  var RANDOMNESS = 0.2;
  var MAX_DISTANCE = 40;
  var DRAG = 2;
  var DRAG_FLARE = 0.015;

  /** math.random(n): [0, n) */
  function random(n) {
    return Math.random() * n;
  }

  function Particle(x, y) {
    this.px = x; this.py = y;
    this.xSpeed = 0; this.ySpeed = 0;
    this.radius = 0;
    this.leftPX = 0; this.leftPY = 0; this.rightPX = 0; this.rightPY = 0;
    this.lcx2 = 0; this.lcy2 = 0; this.rcx2 = 0; this.rcy2 = 0;
  }

  /** One physics step for particle i, between its neighbours (RibbonParticle.calculateParticles). */
  Particle.prototype.update = function (prev, next, ribbon, i) {
    var cx1 = (prev.px + this.px) / 2, cy1 = (prev.py + this.py) / 2;
    var cx2 = (next.px + this.px) / 2, cy2 = (next.py + this.py) / 2;
    var dx = cx2 - cx1, dy = cy2 - cy1;
    var angle = Math.atan2(dy, dx);
    var distance = Math.sqrt(dx * dx + dy * dy);

    // Too far from its neighbours: get dragged along, flaring the ribbon
    if (distance > MAX_DISTANCE) {
      var oldX = this.px, oldY = this.py;
      this.px += (MAX_DISTANCE / DRAG) * Math.cos(angle);
      this.py += (MAX_DISTANCE / DRAG) * Math.sin(angle);
      this.xSpeed += (this.px - oldX) * DRAG_FLARE;
      this.ySpeed += (this.py - oldY) * DRAG_FLARE;
    }

    this.ySpeed += ribbon.gravity;
    this.xSpeed *= ribbon.friction;
    this.ySpeed *= ribbon.friction;
    this.px += this.xSpeed + random(0.3);
    this.py += this.ySpeed + random(0.3);
    this.px += ((RANDOMNESS / 2) - random(RANDOMNESS)) * distance;
    this.py += ((RANDOMNESS / 2) - random(RANDOMNESS)) * distance;

    // Width: from the spacing in the newer half, tapering through the older half
    if (i > PARTICLES / 2) this.radius = distance / ribbon.radiusDivide;
    else this.radius = next.radius * 0.9;
    if (this.radius > ribbon.radiusMax) this.radius = ribbon.radiusMax;
    if ((i === PARTICLES - 2 || i === 1) && this.radius > 1) this.radius = 1;

    this.leftPX = this.px + Math.cos(angle + HALF_PI * 3) * this.radius;
    this.leftPY = this.py + Math.sin(angle + HALF_PI * 3) * this.radius;
    this.rightPX = this.px + Math.cos(angle + HALF_PI) * this.radius;
    this.rightPY = this.py + Math.sin(angle + HALF_PI) * this.radius;

    // Midpoints between this particle's edge points and the next one's
    this.lcx2 = (next.leftPX + this.leftPX) / 2;
    this.lcy2 = (next.leftPY + this.leftPY) / 2;
    this.rcx2 = (next.rightPX + this.rightPX) / 2;
    this.rcy2 = (next.rightPY + this.rightPY) / 2;
  };

  var Ribbon = {
    id: 'ribbon',
    name: 'Ribbon',
    type: 'create',
    coalesced: false,

    size: 50,         // "Size" spinner, 1-100 (max width; also sets how width follows speed)
    spacing: 25,      // "Spacing" spinner, 1-100 ms between ribbon pieces
    friction: 1.1,    // "Friction" slider 1-200, / 100
    gravity: 0.15,    // "Gravity" slider 0-200, / 100

    _particles: [],
    _time: 0,

    get radiusMax() { return this.size; },
    get radiusDivide() { return (100 - this.size) / 5; },

    _reset: function () {
      this._particles = [];
    },

    setup: function () {
      this._reset();
    },

    cleared: function () {
      this._reset();
    },

    _addParticle: function (x, y) {
      if (this._particles.length === PARTICLES) this._particles.shift();
      this._particles.push(new Particle(x, y));
    },

    /** Recalculate the particles and rebuild the current shape's outline (Ribbon.drawCurve). */
    _drawCurve: function (canvas) {
      var ps = this._particles, n = ps.length;
      for (var i = 1; i < n - 1; i++) ps[i].update(ps[i - 1], ps[i + 1], this, i);
      var shape = canvas.getCurrentCreateShape();
      // particles[1] only has edge points once it has been updated (3+ particles)
      if (!shape || n < 3) return;

      var segs = [{ type: 'M', x: ps[1].lcx2, y: ps[1].lcy2 }];
      var j, p;
      for (j = 2; j < n - 4; j++) {
        p = ps[j];
        segs.push({ type: 'C', c1x: p.leftPX, c1y: p.leftPY, c2x: p.lcx2, c2y: p.lcy2, x: p.lcx2, y: p.lcy2 });
      }
      for (j = n - 4; j > 1; j--) {
        p = ps[j];
        var pm1 = ps[j - 1];
        segs.push({ type: 'C', c1x: p.rightPX, c1y: p.rightPY, c2x: pm1.rcx2, c2y: pm1.rcy2, x: pm1.rcx2, y: pm1.rcy2 });
      }
      segs.push({ type: 'Z' });
      shape.setSegments(segs);
      shape.totalPoints = segs.length;
      canvas.redraw();
    },

    pointerDown: function (p, e, canvas) {
      canvas.createShapes.push(canvas.newShape(null));
    },

    pointerDrag: function (p, e, canvas) {
      var now = Date.now();
      if (now - this._time >= this.spacing) {
        // Save this piece and start a new one (this event adds no particle)
        canvas.commitShapes();
        canvas.createShapes.push(canvas.newShape(null));
        this._time = now;
      } else {
        this._addParticle(p.x, p.y);
        this._drawCurve(canvas);
      }
    },

    pointerUp: function (p, e, canvas) {
      this._reset();
      canvas.commitShapes();
      canvas.redraw();
    }
  };

  Alchemy.modules = Alchemy.modules || {};
  Alchemy.modules.ribbon = Ribbon;
})(window.Alchemy = window.Alchemy || {});
