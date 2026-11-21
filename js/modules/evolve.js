/*
 * Alchemy Web - modules/evolve.js
 * The "Evolve Shapes" create module, ported from
 * org.alchemy.create.EvolveShapes (Karl D.D. Willis and the Alchemy authors).
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version. See LICENSE.
 *
 * A small genetic algorithm for shapes. The Evolver window shows the
 * current generation (shapes from the canvas, a library group or an SVG
 * file, each scaled to 100 px). Give the ones you like a rank and press
 * Evolve:
 *   - Neighbouring pairs where at least one is ranked are bred: their
 *     points are blended, weighted by rank.
 *   - The rest of the generation is filled with mixes of the best child and
 *     random parents, then mutated (random point jitter, then smoothing).
 *   - If nothing is ranked, every shape is just mutated.
 * Mutation (0-100) sets how often points jump and how much they're smoothed.
 *
 * Drawing stamps random members of the current generation along your
 * stroke, one every Spacing * 2 + 1 ms, rotated to the direction you're
 * moving and scaled by pen pressure (x2 at full pressure; a mouse draws at
 * 1x). The first time it's selected it starts from what's on the canvas.
 *
 * Differences from the desktop client: shapes load from SVG files or the
 * built-in library instead of PDFs, and generations are sorted by rank with
 * a proper sort (the Java's comparator was inconsistent).
 */
(function (Alchemy) {
  'use strict';

  var SIZE = 100;   // shapes are normalised to this size, like the Java

  function random(a, b) {
    return b === undefined ? Math.random() * a : a + Math.random() * (b - a);
  }

  /** AlcMath.map */
  function map(v, a1, b1, a2, b2) {
    return a2 + (b2 - a2) * ((v - a1) / (b1 - a1));
  }

  function lineShape(template, points) {
    var segs = points.map(function (p, i) { return { type: i ? 'L' : 'M', x: p.x, y: p.y }; });
    var copy = template.transformed(function (p) { return p; });
    copy.setSegments(segs);
    copy.totalPoints = segs.length;
    copy.spine = null;
    copy.spineWidth = null;
    return copy;
  }

  /** True if the points run clockwise (EvolveShapes.getWinding). */
  function winding(points) {
    var total = 0, n = points.length;
    for (var i = 0; i < n; i++) {
      var prev = points[(i - 1 + n) % n], next = points[(i + 1) % n];
      total += points[i].x * (next.y - prev.y);
    }
    return total / 2 > 0;
  }

  /** Blend two shapes' points; mix 1 = all s1, 0 = all s2 (EvolveShapes.breedShapes). */
  function breed(s1, s2, mix) {
    var p1 = s1.getPoints(), p2 = s2.getPoints();
    if (!p1.length || !p2.length) return s1.transformed(function (p) { return p; });
    if (winding(p1) !== winding(p2)) p2.reverse();
    var total = Math.max(1, Math.round(p1.length * mix + p2.length * (1 - mix)));
    var pts = [];
    for (var i = 0; i < total; i++) {
      var t = total > 1 ? i / (total - 1) : 0;
      var a = p1[Math.floor(t * (p1.length - 1))], b = p2[Math.floor(t * (p2.length - 1))];
      var im = 1 - mix;
      pts.push({ x: a.x + (b.x - a.x) * im, y: a.y + (b.y - a.y) * im });
    }
    return lineShape(s1, pts);
  }

  /** 1-2-1 smoothing in place, each point using the already-smoothed one before it. */
  function smooth(points) {
    for (var i = 1; i < points.length - 1; i++) {
      var p0 = points[i - 1], p1 = points[i], p2 = points[i + 1];
      points[i] = { x: p0.x * 0.25 + p1.x * 0.5 + p2.x * 0.25, y: p0.y * 0.25 + p1.y * 0.5 + p2.y * 0.25 };
    }
    return points;
  }

  /** Randomly jitter points, then smooth a random number of times (EvolveShapes.mutateShape). */
  function mutate(shape, mutation) {
    var b = shape.getBounds();
    var bw = Math.trunc(b.width) / 2, bh = Math.trunc(b.height) / 2;
    var points = shape.getPoints();
    var rate = Math.trunc(map(mutation, 0, 1, 50, 0));
    rate *= rate;
    for (var i = 0; i < points.length; i++) {
      if (Math.floor(random(rate)) === 0) {
        points[i] = { x: points[i].x + random(-bw, bw), y: points[i].y + random(-bh, bh) };
      }
    }
    var smoothRate = Math.trunc(map(mutation, 0, 1, 1, 35));
    var passes = Math.floor(random(smoothRate));
    for (var k = 0; k < passes; k++) points = smooth(points);
    return lineShape(shape, points);
  }

  var Evolve = {
    id: 'evolve',
    name: 'Evolve',
    type: 'create',

    shapes: [],       // the current generation, normalised to 100 px
    mutation: 0.5,    // "Mutation" slider 0-100, / 100
    spacing: 25,      // "Spacing" slider 0-100; delay = 1 + spacing * 2 ms

    _initialised: false,
    _time: 0,
    _pen: { x: 0, y: 0 },
    _oldPen: { x: 0, y: 0 },

    setup: function (canvas) {
      // EvolveShapes.setup() runs once, when the module is first selected
      if (this._initialised) return;
      this._initialised = true;
      this.loadFromCanvas(canvas);
    },

    setShapes: function (shapes) {
      this.shapes = Alchemy.shapes.normalize(shapes, SIZE);
      this.shapes.forEach(function (s) { s.rank = 0; });
    },

    loadFromCanvas: function (canvas) {
      this.setShapes(canvas.shapes);
    },

    /** Breed the next generation from the ranks (EvolveShapes.evolveNextGeneration). */
    evolve: function () {
      var shapes = this.shapes;
      var n = shapes.length;
      if (!n) return;
      shapes.sort(function (a, b) { return (a.rank || 0) - (b.rank || 0); });
      var children = [];
      for (var i = 0; i < n - 1; i++) {
        var a = shapes[i], b = shapes[i + 1];
        var ra = a.rank || 0, rb = b.rank || 0;
        if (ra > 0 || rb > 0) {
          var child = breed(a, b, ra / (ra + rb));
          child.rank = ra + rb;
          children.push(child);
        }
      }
      var self = this;
      if (!children.length) {
        children = shapes.map(function (s) { return mutate(s, self.mutation); });
      } else {
        var master = children[children.length - 1];
        var extras = n - children.length;
        for (var j = 0; j < extras; j++) {
          var other = shapes[Math.floor(random(n))];
          children.push(mutate(breed(master, other, random(1)), this.mutation));
        }
      }
      // Normalise, clear the ranks and shuffle, keeping the generation size
      var next = Alchemy.shapes.normalize(children, SIZE);
      for (var k = next.length - 1; k > 0; k--) {
        var r = Math.floor(random(k + 1)), t = next[k];
        next[k] = next[r]; next[r] = t;
      }
      next.forEach(function (s) { s.rank = 0; });
      this.shapes = next;
    },

    _add: function (canvas, p) {
      if (!this.shapes.length) return;
      var shape = this.shapes[Math.floor(random(this.shapes.length))];
      var scale = canvas.penType === 'mouse' ? 1 : canvas.penPressure * 2;
      var angle = Math.atan2(this._oldPen.y - this._pen.y, this._oldPen.x - this._pen.x);
      canvas.createShapes.push(Alchemy.shapes.stamp(shape, canvas, scale, angle, p));
      canvas.redraw();
    },

    pointerDown: function (p, e, canvas) {
      if (!this.shapes.length) return;
      this._time = Date.now();
      this._add(canvas, p);
    },

    pointerDrag: function (p, e, canvas) {
      if (!this.shapes.length) return;
      this._pen = { x: canvas.penLocation.x, y: canvas.penLocation.y };
      var now = Date.now();
      if (now - this._time >= 1 + this.spacing * 2) {
        this._time = now;
        this._add(canvas, p);
        this._oldPen = this._pen;
      }
    },

    pointerUp: function (p, e, canvas) {
      if (this.shapes.length) canvas.commitShapes();
    }
  };

  Alchemy.modules = Alchemy.modules || {};
  Alchemy.modules.evolve = Evolve;
  // Exposed for testing
  Evolve._breed = breed;
  Evolve._mutate = mutate;
})(window.Alchemy = window.Alchemy || {});
