/*
 * Alchemy Web - shapelib.js
 * Shape libraries for the modules that stamp ready-made shapes (Pull and
 * Evolve): the built-in library from Alchemy's `shapes` folder, plus SVG
 * files you load yourself. The desktop client read PDFs here; browsers can't
 * without a library, so the built-in PDFs were converted with
 * tools/build-shapes.js and you load SVGs instead.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version. See LICENSE.
 */
(function (Alchemy) {
  'use strict';

  // ---------------------------------------------------------------------------
  // SVG path data -> Shape segments

  /** Points along an SVG elliptical arc, as line segments (good enough for stamps). */
  function arcPoints(x1, y1, rx, ry, phi, largeArc, sweep, x2, y2) {
    rx = Math.abs(rx); ry = Math.abs(ry);
    if (!rx || !ry) return [{ x: x2, y: y2 }];
    var cos = Math.cos(phi), sin = Math.sin(phi);
    var dx = (x1 - x2) / 2, dy = (y1 - y2) / 2;
    var x1p = cos * dx + sin * dy, y1p = -sin * dx + cos * dy;
    var lam = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
    if (lam > 1) { rx *= Math.sqrt(lam); ry *= Math.sqrt(lam); }
    var num = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p;
    var den = rx * rx * y1p * y1p + ry * ry * x1p * x1p;
    var co = Math.sqrt(Math.max(0, num / den)) * (largeArc === sweep ? -1 : 1);
    var cxp = co * rx * y1p / ry, cyp = -co * ry * x1p / rx;
    var cx = cos * cxp - sin * cyp + (x1 + x2) / 2, cy = sin * cxp + cos * cyp + (y1 + y2) / 2;
    function ang(ux, uy, vx, vy) {
      var a = Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
      return a;
    }
    var t1 = ang(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
    var dt = ang((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry);
    if (!sweep && dt > 0) dt -= 2 * Math.PI;
    if (sweep && dt < 0) dt += 2 * Math.PI;
    var steps = Math.max(4, Math.ceil(Math.abs(dt) / (Math.PI / 8)));
    var pts = [];
    for (var i = 1; i <= steps; i++) {
      var t = t1 + dt * i / steps;
      var ex = rx * Math.cos(t), ey = ry * Math.sin(t);
      pts.push({ x: cos * ex - sin * ey + cx, y: sin * ex + cos * ey + cy });
    }
    return pts;
  }

  /**
   * Parse SVG path data (all commands, absolute and relative) into segments,
   * passing every point through `m` (a 2D matrix [a, b, c, d, e, f]).
   */
  function parsePathData(d, m) {
    m = m || [1, 0, 0, 1, 0, 0];
    function tx(x, y) { return { x: m[0] * x + m[2] * y + m[4], y: m[1] * x + m[3] * y + m[5] }; }
    var tokens = d.match(/[a-zA-Z]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g) || [];
    var segs = [];
    var i = 0, cmd = null;
    var x = 0, y = 0, sx = 0, sy = 0;     // current point and sub-path start (untransformed)
    var lcx = null, lcy = null, lqx = null, lqy = null;  // last control points for S and T
    function n() { return Number(tokens[i++]); }
    function isNum() { return i < tokens.length && !/[a-zA-Z]/.test(tokens[i]); }
    while (i < tokens.length) {
      if (/[a-zA-Z]/.test(tokens[i])) cmd = tokens[i++];
      else if (!cmd) { i++; continue; }
      var rel = cmd === cmd.toLowerCase() && cmd !== 'z' ? true : false;
      var C = cmd.toUpperCase();
      var ox = rel ? x : 0, oy = rel ? y : 0;
      var p, c1, c2;
      if (C === 'Z') {
        segs.push({ type: 'Z' });
        x = sx; y = sy;
        lcx = lqx = null;
        cmd = null;
        continue;
      }
      if (!isNum()) { cmd = null; continue; }
      if (C === 'M') {
        x = ox + n(); y = oy + n(); sx = x; sy = y;
        p = tx(x, y); segs.push({ type: 'M', x: p.x, y: p.y });
        cmd = rel ? 'l' : 'L';  // further pairs are line-tos
        lcx = lqx = null;
      } else if (C === 'L') {
        x = ox + n(); y = oy + n();
        p = tx(x, y); segs.push({ type: 'L', x: p.x, y: p.y });
        lcx = lqx = null;
      } else if (C === 'H') {
        x = ox + n();
        p = tx(x, y); segs.push({ type: 'L', x: p.x, y: p.y });
        lcx = lqx = null;
      } else if (C === 'V') {
        y = (rel ? y : 0) + n();
        p = tx(x, y); segs.push({ type: 'L', x: p.x, y: p.y });
        lcx = lqx = null;
      } else if (C === 'C' || C === 'S') {
        var x1, y1;
        if (C === 'C') { x1 = ox + n(); y1 = oy + n(); }
        else if (lcx !== null) { x1 = 2 * x - lcx; y1 = 2 * y - lcy; }
        else { x1 = x; y1 = y; }
        var x2 = ox + n(), y2 = oy + n();
        x = ox + n(); y = oy + n();
        c1 = tx(x1, y1); c2 = tx(x2, y2); p = tx(x, y);
        segs.push({ type: 'C', c1x: c1.x, c1y: c1.y, c2x: c2.x, c2y: c2.y, x: p.x, y: p.y });
        lcx = x2; lcy = y2; lqx = null;
      } else if (C === 'Q' || C === 'T') {
        var qx, qy;
        if (C === 'Q') { qx = ox + n(); qy = oy + n(); }
        else if (lqx !== null) { qx = 2 * x - lqx; qy = 2 * y - lqy; }
        else { qx = x; qy = y; }
        x = ox + n(); y = oy + n();
        c1 = tx(qx, qy); p = tx(x, y);
        segs.push({ type: 'Q', cx: c1.x, cy: c1.y, x: p.x, y: p.y });
        lqx = qx; lqy = qy; lcx = null;
      } else if (C === 'A') {
        var rx = n(), ry = n(), rot = n() * Math.PI / 180, large = n() ? 1 : 0, sw = n() ? 1 : 0;
        var ex = ox + n(), ey = oy + n();
        arcPoints(x, y, rx, ry, rot, large, sw, ex, ey).forEach(function (q) {
          var t = tx(q.x, q.y);
          segs.push({ type: 'L', x: t.x, y: t.y });
        });
        x = ex; y = ey;
        lcx = lqx = null;
      } else {
        i++;
      }
    }
    return segs;
  }

  // ---------------------------------------------------------------------------
  // Segments -> Shapes

  function segmentBounds(segs) {
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    segs.forEach(function (s) {
      ['', 'c', 'c1', 'c2'].forEach(function (k) {
        var x = s[k ? k + 'x' : 'x'], y = s[k ? k + 'y' : 'y'];
        if (x === undefined) return;
        if (x < minX) minX = x; if (y < minY) minY = y;
        if (x > maxX) maxX = x; if (y > maxY) maxY = y;
      });
    });
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  }

  /** Move segments so their bounding box starts at 0,0. */
  function resetLocation(segs) {
    var b = segmentBounds(segs);
    return segs.map(function (s) {
      var t = { type: s.type };
      if (s.x !== undefined) { t.x = s.x - b.x; t.y = s.y - b.y; }
      if (s.cx !== undefined) { t.cx = s.cx - b.x; t.cy = s.cy - b.y; }
      if (s.c1x !== undefined) {
        t.c1x = s.c1x - b.x; t.c1y = s.c1y - b.y; t.c2x = s.c2x - b.x; t.c2y = s.c2y - b.y;
      }
      return t;
    });
  }

  /** A library shape (Alchemy.Shape) from segments. */
  function makeShape(segs) {
    var shape = new Alchemy.Shape(null, {});
    shape.setSegments(segs);
    shape.totalPoints = segs.length;
    return shape;
  }

  // ---------------------------------------------------------------------------
  // Loading SVG files

  /** The 2D matrix of an element's transform attribute (through all ancestors). */
  function elementMatrix(el, root) {
    var m = [1, 0, 0, 1, 0, 0];
    var chain = [];
    for (var node = el; node && node !== root.parentNode; node = node.parentNode) chain.unshift(node);
    chain.forEach(function (node) {
      if (!node.transform || !node.transform.baseVal) return;
      var t = node.transform.baseVal.consolidate();
      if (!t) return;
      var a = t.matrix;
      // m = m * a
      m = [
        m[0] * a.a + m[2] * a.b, m[1] * a.a + m[3] * a.b,
        m[0] * a.c + m[2] * a.d, m[1] * a.c + m[3] * a.d,
        m[0] * a.e + m[2] * a.f + m[4], m[1] * a.e + m[3] * a.f + m[5]
      ];
    });
    return m;
  }

  function num(el, name) {
    return parseFloat(el.getAttribute(name)) || 0;
  }

  /** Path data for basic SVG shapes. */
  function elementPathData(el) {
    var tag = el.localName;
    if (tag === 'path') return el.getAttribute('d') || '';
    if (tag === 'rect') {
      var x = num(el, 'x'), y = num(el, 'y'), w = num(el, 'width'), h = num(el, 'height');
      return 'M' + x + ' ' + y + 'H' + (x + w) + 'V' + (y + h) + 'H' + x + 'Z';
    }
    if (tag === 'circle' || tag === 'ellipse') {
      var cx = num(el, 'cx'), cy = num(el, 'cy');
      var rx = tag === 'circle' ? num(el, 'r') : num(el, 'rx');
      var ry = tag === 'circle' ? rx : num(el, 'ry');
      return 'M' + (cx - rx) + ' ' + cy + 'A' + rx + ' ' + ry + ' 0 1 0 ' + (cx + rx) + ' ' + cy +
        'A' + rx + ' ' + ry + ' 0 1 0 ' + (cx - rx) + ' ' + cy + 'Z';
    }
    if (tag === 'polygon' || tag === 'polyline') {
      var pts = (el.getAttribute('points') || '').trim().split(/[\s,]+/);
      if (pts.length < 4) return '';
      var d = 'M' + pts[0] + ' ' + pts[1];
      for (var i = 2; i + 1 < pts.length; i += 2) d += 'L' + pts[i] + ' ' + pts[i + 1];
      return tag === 'polygon' ? d + 'Z' : d;
    }
    if (tag === 'line') {
      return 'M' + num(el, 'x1') + ' ' + num(el, 'y1') + 'L' + num(el, 'x2') + ' ' + num(el, 'y2');
    }
    return '';
  }

  /**
   * Shapes from an SVG file's text: every path or basic shape becomes one
   * shape moved to 0,0, skipping anything inside defs/clipPath/mask and
   * shapes as big as the page (like getPDFShapes). Returns [] if none.
   */
  function shapesFromSVG(text) {
    var doc = new DOMParser().parseFromString(text, 'image/svg+xml');
    var root = doc.documentElement;
    if (!root || root.localName !== 'svg' || doc.getElementsByTagName('parsererror').length) return [];
    var vb = (root.getAttribute('viewBox') || '').split(/[\s,]+/).map(Number);
    var pageW = vb.length === 4 ? vb[2] : parseFloat(root.getAttribute('width')) || Infinity;
    var pageH = vb.length === 4 ? vb[3] : parseFloat(root.getAttribute('height')) || Infinity;
    var shapes = [];
    var els = root.querySelectorAll('path, rect, circle, ellipse, polygon, polyline, line');
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (el.closest('defs, clipPath, mask, symbol, pattern, marker')) continue;
      var d = elementPathData(el);
      if (!d) continue;
      var segs = parsePathData(d, elementMatrix(el, root));
      if (segs.length < 2) continue;
      var b = segmentBounds(segs);
      if (b.width >= pageW || b.height >= pageH || (b.width === 0 && b.height === 0)) continue;
      shapes.push(makeShape(resetLocation(segs)));
    }
    return shapes;
  }

  // ---------------------------------------------------------------------------
  // The library: built-in groups plus any loaded SVGs

  var groups = null;

  /** All groups: [{ name, shapes: [Shape] }]. Built-in groups are parsed on first use. */
  function getGroups() {
    if (groups) return groups;
    groups = (Alchemy.shapeLibrary || []).map(function (g) {
      return {
        name: g.name,
        shapes: g.shapes.map(function (d) { return makeShape(parsePathData(d)); })
      };
    });
    return groups;
  }

  /** Read SVG files into a new group (or add to an existing one with the same name). */
  function loadSVGFiles(files, groupName, done) {
    var pending = files.length, loaded = [];
    if (!pending) { done(0); return; }
    Array.prototype.forEach.call(files, function (file) {
      var reader = new FileReader();
      reader.onload = function () {
        loaded = loaded.concat(shapesFromSVG(String(reader.result)));
        finish();
      };
      reader.onerror = finish;
      reader.readAsText(file);
    });
    function finish() {
      if (--pending > 0) return;
      if (loaded.length) {
        var all = getGroups();
        var group = all.filter(function (g) { return g.name === groupName; })[0];
        if (group) group.shapes = group.shapes.concat(loaded);
        else all.push({ name: groupName, shapes: loaded });
      }
      done(loaded.length);
    }
  }

  // ---------------------------------------------------------------------------
  // Stamping copies onto the canvas

  /**
   * A copy of a library shape scaled about 0,0, rotated about its centre and
   * then moved so it's centred on `at`, with the canvas's current colour,
   * opacity, style and weight. Mirrors the clone / scale / rotate / move /
   * setup() sequence in PullShapes and EvolveShapes.addRandomShape. As in the
   * Java, the move is by (at - half the size), so a rotated shape can end up
   * a little off-centre.
   */
  function stamp(shape, canvas, scale, angle, at) {
    var copy = shape.transformed(function (p) { return { x: p.x * scale, y: p.y * scale }; });
    if (angle) {
      var b = copy.getBounds();
      var cx = b.x + b.width / 2, cy = b.y + b.height / 2;
      var cos = Math.cos(angle), sin = Math.sin(angle);
      copy = copy.transformed(function (p) {
        var dx = p.x - cx, dy = p.y - cy;
        return { x: cx + dx * cos - dy * sin, y: cy + dx * sin + dy * cos };
      });
    }
    var b2 = copy.getBounds();
    var mx = at.x - b2.width / 2, my = at.y - b2.height / 2;
    copy = copy.transformed(function (p) { return { x: p.x + mx, y: p.y + my }; });
    copy.color = canvas.color;
    copy.alpha = canvas.alpha;
    copy.style = canvas.style;
    copy.lineWidth = canvas.lineWidth;
    copy.gradient = null;
    return copy;
  }

  /**
   * Copies scaled so their longest side is `size` px and moved to 0,0
   * (AlcCanvas.normailzeShapes). Shapes with no size are dropped.
   */
  function normalize(shapes, size) {
    var out = [];
    shapes.forEach(function (s) {
      var b = s.getBounds();
      var longest = Math.max(b.width, b.height);
      if (!longest) return;
      var k = size / longest;
      out.push(s.transformed(function (p) { return { x: (p.x - b.x) * k, y: (p.y - b.y) * k }; }));
    });
    return out;
  }

  Alchemy.shapes = {
    stamp: stamp,
    normalize: normalize,
    getGroups: getGroups,
    loadSVGFiles: loadSVGFiles,
    shapesFromSVG: shapesFromSVG,
    parsePathData: parsePathData,
    resetLocation: resetLocation,
    makeShape: makeShape
  };
})(window.Alchemy = window.Alchemy || {});
