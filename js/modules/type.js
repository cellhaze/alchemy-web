/*
 * Alchemy Web - modules/type.js
 * The "Type Shapes" create module, ported from org.alchemy.create.TypeShapes
 * (Karl D.D. Willis and the Alchemy authors).
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version. See LICENSE.
 *
 * Shapes made out of letters.
 *   - Press or drag: stamps a random character in a random font, rotated at
 *     random, at a size set by how fast you move (about every 50 ms).
 *   - Space / Auto-generate: builds an abstract shape from 5-11 distorted
 *     letter outlines merged together, placed at random on the canvas.
 *   - Key Drawing on: each key you type is stamped as a distorted glyph.
 * Distortion multiplies every outline coordinate by a slowly varying noise
 * factor between -scale and +scale (scale is 2-5, picked at random), so
 * letters get stretched, flipped and mangled; higher Distortion makes the
 * factor change faster along the outline.
 *
 * Differences from the desktop client, which read letter outlines directly
 * from the system fonts with Java2D:
 *   - Browsers can't hand over glyph outlines without a font-parsing
 *     library, so each letter is drawn offscreen and its outline traced back
 *     into a path (and cached per font and letter).
 *   - Browsers can't list installed fonts, so the random font comes from a
 *     list of common font names, keeping those you actually have.
 *   - Overlapping letters are merged by filling them into one mask and
 *     tracing that, which gives the same result as Java's Area union.
 *   - The Java cut long outlines off at 50 points; here outlines are
 *     simplified to at most 50 points instead.
 */
(function (Alchemy) {
  'use strict';

  var LETTERS = '.`-_\':,;^=+/"|)\\<>)iv%xclrs{*}I?!][1taeo7zjLu' +
    'nT#JCwfy325Fp6mqSghVd4EgXPGZbYkOA&8U$@KHDBWNMR0Q';
  var MAX_POINTS = 50;
  var TRACE_SIZE = 200;    // glyphs are traced at this size, then scaled
  var MASK_MAX = 1200;     // largest mask used to merge an auto-generated shape
  var DELAY = 50;          // ms between drag stamps

  function random(a, b) {
    return b === undefined ? Math.random() * a : a + Math.random() * (b - a);
  }

  // ---------------------------------------------------------------------------
  // 1D value noise, smooth and between 0 and about 1 (4 octaves, each half as
  // strong as the last, cosine smoothing), the kind AlcMath.noise produces.

  var noiseTable = null;
  function noise(x) {
    if (!noiseTable) {
      noiseTable = new Float32Array(4096);
      for (var k = 0; k < noiseTable.length; k++) noiseTable[k] = Math.random();
    }
    x = Math.abs(x);
    var xi = Math.floor(x), xf = x - xi, r = 0, amp = 0.5;
    for (var o = 0; o < 4; o++) {
      var t = 0.5 * (1 - Math.cos(xf * Math.PI));
      var a = noiseTable[xi & 4095], b = noiseTable[(xi + 1) & 4095];
      r += (a + t * (b - a)) * amp;
      amp *= 0.5;
      xi <<= 1; xf *= 2;
      if (xf >= 1) { xi++; xf--; }
    }
    return r;
  }

  // ---------------------------------------------------------------------------
  // Fonts: keep the candidates that are actually installed

  var CANDIDATE_FONTS = [
    'Arial', 'Helvetica', 'Times New Roman', 'Times', 'Georgia', 'Courier New', 'Courier',
    'Verdana', 'Trebuchet MS', 'Tahoma', 'Impact', 'Comic Sans MS', 'Palatino Linotype',
    'Palatino', 'Book Antiqua', 'Garamond', 'Bookman Old Style', 'Century Gothic',
    'Futura', 'Gill Sans', 'Optima', 'Didot', 'Baskerville', 'Rockwell', 'Copperplate',
    'Lucida Grande', 'Lucida Sans', 'Lucida Console', 'Segoe UI', 'Calibri', 'Cambria',
    'Candara', 'Consolas', 'Constantia', 'Corbel', 'Franklin Gothic Medium', 'Menlo',
    'Monaco', 'Avenir', 'Avenir Next', 'Hoefler Text', 'American Typewriter', 'Chalkboard',
    'Marker Felt', 'DejaVu Sans', 'DejaVu Serif', 'DejaVu Sans Mono', 'Liberation Sans',
    'Liberation Serif', 'Liberation Mono', 'Noto Sans', 'Noto Serif', 'Noto Sans Mono',
    'Ubuntu', 'Ubuntu Mono', 'Cantarell', 'FreeSans', 'FreeSerif', 'FreeMono', 'Roboto',
    'Roboto Slab', 'Open Sans', 'Source Sans Pro', 'Source Serif Pro', 'Fira Sans',
    'Inter', 'Droid Sans', 'Droid Serif', 'URW Bookman', 'URW Gothic', 'Nimbus Sans',
    'Nimbus Roman', 'C059', 'P052', 'Z003'
  ];
  var GENERIC_FONTS = ['serif', 'sans-serif', 'monospace', 'cursive', 'fantasy'];

  var fonts = null;
  function availableFonts() {
    if (fonts) return fonts;
    var ctx = document.createElement('canvas').getContext('2d');
    var sample = 'mmmmmmmmmmlliWQ@&';
    var base = {};
    ['monospace', 'serif', 'sans-serif'].forEach(function (g) {
      ctx.font = '72px ' + g;
      base[g] = ctx.measureText(sample).width;
    });
    fonts = GENERIC_FONTS.slice();
    CANDIDATE_FONTS.forEach(function (name) {
      // Installed if it renders differently from at least one fallback
      for (var g in base) {
        ctx.font = '72px "' + name + '", ' + g;
        if (ctx.measureText(sample).width !== base[g]) {
          fonts.push(name);
          return;
        }
      }
    });
    return fonts;
  }

  function fontCss(name) {
    return GENERIC_FONTS.indexOf(name) >= 0 ? name : '"' + name + '", sans-serif';
  }

  // ---------------------------------------------------------------------------
  // Tracing: turn a filled mask into closed outlines

  /**
   * Trace the boundaries of the filled pixels in a mask (Uint8Array, 1 =
   * filled) into closed loops of points. Each boundary edge runs with the
   * filled side on its right, so outer outlines and holes wind in opposite
   * directions and fill correctly with the non-zero rule.
   */
  function traceMask(mask, w, h) {
    function at(x, y) { return x >= 0 && y >= 0 && x < w && y < h && mask[y * w + x] === 1; }
    var edges = {};   // "x,y" start vertex -> list of end vertices
    var count = 0;
    function add(x1, y1, x2, y2) {
      var k = x1 + ',' + y1;
      (edges[k] || (edges[k] = [])).push([x2, y2]);
      count++;
    }
    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        if (!at(x, y)) continue;
        if (!at(x, y - 1)) add(x, y, x + 1, y);           // top, going right
        if (!at(x + 1, y)) add(x + 1, y, x + 1, y + 1);   // right, going down
        if (!at(x, y + 1)) add(x + 1, y + 1, x, y + 1);   // bottom, going left
        if (!at(x - 1, y)) add(x, y + 1, x, y);           // left, going up
      }
    }
    var loops = [];
    for (var key in edges) {
      while (edges[key] && edges[key].length) {
        var start = key.split(',').map(Number);
        var loop = [{ x: start[0], y: start[1] }];
        var cur = start, prevDir = null, guard = count + 1;
        while (guard-- > 0) {
          var list = edges[cur[0] + ',' + cur[1]];
          if (!list || !list.length) break;
          // Where two loops touch at a corner, turn right to keep them apart
          var pick = 0;
          if (list.length > 1 && prevDir) {
            var best = -Infinity;
            for (var i = 0; i < list.length; i++) {
              var dx = list[i][0] - cur[0], dy = list[i][1] - cur[1];
              var turn = prevDir[0] * dy - prevDir[1] * dx;
              if (turn > best) { best = turn; pick = i; }
            }
          }
          var next = list.splice(pick, 1)[0];
          prevDir = [next[0] - cur[0], next[1] - cur[1]];
          cur = next;
          if (cur[0] === start[0] && cur[1] === start[1]) break;
          loop.push({ x: cur[0], y: cur[1] });
        }
        if (loop.length >= 3) loops.push(loop);
      }
    }
    return loops;
  }

  /** Ramer-Douglas-Peucker simplification of a closed loop. */
  function simplify(points, tolerance) {
    if (points.length < 4) return points.slice();
    function rdp(pts, first, last, keep) {
      var maxD = 0, index = -1;
      var ax = pts[first].x, ay = pts[first].y, bx = pts[last].x, by = pts[last].y;
      var len = Math.hypot(bx - ax, by - ay) || 1;
      for (var i = first + 1; i < last; i++) {
        var d = Math.abs((bx - ax) * (ay - pts[i].y) - (ax - pts[i].x) * (by - ay)) / len;
        if (d > maxD) { maxD = d; index = i; }
      }
      if (maxD > tolerance && index > 0) {
        rdp(pts, first, index, keep);
        keep[index] = true;
        rdp(pts, index, last, keep);
      }
    }
    // Split the loop at its two furthest-apart points so RDP works on open halves
    var far = 0, farD = 0;
    for (var i = 1; i < points.length; i++) {
      var d = Math.hypot(points[i].x - points[0].x, points[i].y - points[0].y);
      if (d > farD) { farD = d; far = i; }
    }
    var keep = {};
    keep[0] = keep[far] = true;
    var ring = points.concat([points[0]]);
    rdp(ring, 0, far, keep);
    rdp(ring, far, points.length, keep);
    return points.filter(function (_, i) { return keep[i]; });
  }

  function loopArea(loop) {
    var a = 0;
    for (var i = 0; i < loop.length; i++) {
      var p = loop[i], q = loop[(i + 1) % loop.length];
      a += p.x * q.y - q.x * p.y;
    }
    return a / 2;
  }

  // ---------------------------------------------------------------------------
  // Glyph outlines

  var glyphCache = {};

  /**
   * The outer outline of one character, as points relative to its baseline
   * origin (y is negative above the baseline), at TRACE_SIZE px. Only the
   * biggest outline is kept, like the Java using a glyph's first sub-path.
   */
  function glyphOutline(fontName, ch) {
    var key = fontName + '\u0000' + ch;
    if (glyphCache[key] !== undefined) return glyphCache[key];
    var pad = Math.ceil(TRACE_SIZE * 0.5);
    var w = Math.ceil(TRACE_SIZE * 2), h = Math.ceil(TRACE_SIZE * 2);
    var cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    var ctx = cv.getContext('2d', { willReadFrequently: true });
    ctx.font = TRACE_SIZE + 'px ' + fontCss(fontName);
    ctx.textBaseline = 'alphabetic';
    var baseline = Math.ceil(TRACE_SIZE * 1.3);
    ctx.fillStyle = '#000';
    ctx.fillText(ch, pad, baseline);
    var data = ctx.getImageData(0, 0, w, h).data;
    var mask = new Uint8Array(w * h);
    for (var i = 0; i < mask.length; i++) mask[i] = data[i * 4 + 3] > 127 ? 1 : 0;

    var loops = traceMask(mask, w, h);
    var best = null, bestArea = 0;
    loops.forEach(function (l) {
      var a = Math.abs(loopArea(l));
      if (a > bestArea) { bestArea = a; best = l; }
    });
    var result = null;
    if (best) {
      var tol = 0.75, pts = simplify(best, tol);
      while (pts.length > MAX_POINTS) { tol *= 1.5; pts = simplify(best, tol); }
      result = pts.map(function (p) { return { x: p.x - pad, y: p.y - baseline }; });
    }
    glyphCache[key] = result;
    return result;
  }

  // ---------------------------------------------------------------------------

  var Type = {
    id: 'type',
    name: 'Type',
    type: 'create',
    // Stamp size comes from distance per event; take one event per frame like Speed.
    coalesced: false,

    distortion: 0.5,  // "Distortion" slider 0-100, / 100
    size: 2.5,        // "Size" slider 1-50: 0.1 + value / 10
    keys: false,      // "Key Drawing" toggle

    _scale: 2,
    _doubleScale: 4,
    _explode: 1,
    _noisiness: 0,
    _noiseScale: 0,
    _oldP: null,
    _time: 0,
    _firstDrag: true,

    _randomFont: function () {
      var list = availableFonts();
      return list[Math.floor(random(list.length))];
    },

    _randomLetter: function () {
      return LETTERS.charAt(Math.floor(random(LETTERS.length)));
    },

    _shuffle: function () {
      this._scale = Math.floor(random(2, 6));
      this._doubleScale = this._scale * 2;
      this._explode = Math.floor(random(1, 5));
      this._noisiness = random(0.00001, this.distortion);
    },

    _mess: function (v) {
      this._noiseScale += this._noisiness;
      return (noise(this._noiseScale) * this._doubleScale - this._scale) * v;
    },

    /**
     * A distorted, rotated, placed letter outline as a list of points
     * (TypeShapes.makeTypeShape). letter null = random letter ("auto"),
     * location null = random placement.
     */
    _typeShape: function (canvas, fontName, fontSize, letter, location) {
      var auto = letter == null;
      if (auto) letter = this._randomLetter();
      var outline = glyphOutline(fontName, letter);
      if (!outline) return null;
      var k = fontSize / TRACE_SIZE;
      var self = this;
      var pts = outline.map(function (p) {
        return { x: self._mess(p.x * k), y: self._mess(p.y * k) };
      });

      var tx, ty, w = canvas.width;
      if (location) {
        tx = location.x; ty = location.y;
      } else if (auto) {
        var off = w >> this._explode;
        tx = random(-off, off); ty = random(-off, off);
      } else {
        // The Java uses the canvas width for both, so key shapes can land below the window
        tx = random(0, w); ty = random(0, w);
      }
      var angle = random(0.3, 6.0);
      var cos = Math.cos(angle), sin = Math.sin(angle);
      return pts.map(function (p) {
        return { x: tx + p.x * cos - p.y * sin, y: ty + p.x * sin + p.y * cos };
      });
    },

    _shapeFromPoints: function (canvas, pts) {
      var shape = canvas.newShape(null);
      var segs = [{ type: 'M', x: pts[0].x, y: pts[0].y }];
      for (var i = 1; i < pts.length; i++) segs.push({ type: 'L', x: pts[i].x, y: pts[i].y });
      segs.push({ type: 'Z' });
      shape.setSegments(segs);
      shape.totalPoints = segs.length;
      return shape;
    },

    /** Stamp one letter at p and save it (TypeShapes.makeMouseShape). */
    _stamp: function (canvas, p, fontSize) {
      if (fontSize < 1) return;
      var pts = this._typeShape(canvas, this._randomFont(), fontSize, this._randomLetter(), p);
      if (!pts || pts.length < 3) return;
      canvas.createShapes.push(this._shapeFromPoints(canvas, pts));
      canvas.redraw();
      canvas.commitShapes();
    },

    /** Space / Auto-generate: several distorted letters merged into one shape. */
    generate: function (canvas) {
      this._shuffle();
      var fontName = this._randomFont();
      var fontSize = Math.floor(random(100, 300));
      var pieces = [];
      var iterations = Math.floor(random(5, 12));
      for (var i = 0; i < iterations + 1; i++) {
        var pts = this._typeShape(canvas, fontName, fontSize, null, null);
        if (pts && pts.length >= 3) pieces.push(pts);
      }
      if (!pieces.length) return;

      // Merge: fill every piece into one mask, then trace its outlines
      var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      pieces.forEach(function (pts) {
        pts.forEach(function (p) {
          minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
          maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
        });
      });
      var k = Math.min(1, MASK_MAX / Math.max(maxX - minX, maxY - minY, 1));
      var w = Math.ceil((maxX - minX) * k) + 4, h = Math.ceil((maxY - minY) * k) + 4;
      var cv = document.createElement('canvas');
      cv.width = w; cv.height = h;
      var ctx = cv.getContext('2d', { willReadFrequently: true });
      ctx.fillStyle = '#000';
      pieces.forEach(function (pts) {
        ctx.beginPath();
        pts.forEach(function (p, j) {
          var x = (p.x - minX) * k + 2, y = (p.y - minY) * k + 2;
          if (j === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        });
        ctx.closePath();
        ctx.fill('nonzero');
      });
      var data = ctx.getImageData(0, 0, w, h).data;
      var mask = new Uint8Array(w * h);
      for (var m = 0; m < mask.length; m++) mask[m] = data[m * 4 + 3] > 127 ? 1 : 0;
      var loops = traceMask(mask, w, h);
      if (!loops.length) return;

      // Back to canvas coordinates, placed at a random spot on the canvas
      var ox = random(canvas.width), oy = random(canvas.height);
      var segs = [];
      loops.forEach(function (loop) {
        var pts = simplify(loop, 1).map(function (p) {
          return { x: (p.x - 2) / k + minX + ox, y: (p.y - 2) / k + minY + oy };
        });
        if (pts.length < 3) return;
        // Smooth the traced staircase with curves through the midpoints
        var n = pts.length;
        var mid = function (a, b) { return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; };
        var start = mid(pts[n - 1], pts[0]);
        segs.push({ type: 'M', x: start.x, y: start.y });
        for (var i = 0; i < n; i++) {
          var e = mid(pts[i], pts[(i + 1) % n]);
          segs.push({ type: 'Q', cx: pts[i].x, cy: pts[i].y, x: e.x, y: e.y });
        }
        segs.push({ type: 'Z' });
      });
      if (!segs.length) return;
      var shape = canvas.newShape(null);
      shape.setSegments(segs);
      shape.totalPoints = segs.length;
      // Like the Java, the shape is added but not saved until the next commit
      canvas.createShapes.push(shape);
      canvas.redraw();
    },

    /** Key Drawing: stamp the typed character at a random spot. */
    typeKey: function (canvas, ch) {
      this._shuffle();
      var pts = this._typeShape(canvas, this._randomFont(), Math.floor(random(100, 300)), ch, null);
      if (!pts || pts.length < 3) return;
      canvas.createShapes.push(this._shapeFromPoints(canvas, pts));
      canvas.redraw();
      canvas.commitShapes();
    },

    pointerDown: function (p, e, canvas) {
      this._shuffle();
      this._stamp(canvas, p, Math.floor(this.size * 50));
      this._oldP = p;
    },

    pointerDrag: function (p, e, canvas) {
      var now = Date.now();
      if (this._firstDrag || now - this._time >= DELAY) {
        this._firstDrag = false;
        this._time = now;
        var old = this._oldP || p;
        var speed = Math.abs(p.x - old.x) + Math.abs(p.y - old.y);
        this._stamp(canvas, p, Math.floor(speed * this.size));
      }
      this._oldP = p;
    },

    pointerUp: function () {
      this._oldP = null;
    }
  };

  Alchemy.modules = Alchemy.modules || {};
  Alchemy.modules.type = Type;
  // Exposed for testing
  Type._traceMask = traceMask;
  Type._simplify = simplify;
  Type._noise = noise;
})(window.Alchemy = window.Alchemy || {});
