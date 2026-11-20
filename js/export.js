/*
 * Alchemy Web - export.js
 * Export the canvas as PNG (optionally with a transparent background) or SVG,
 * like the original's export dialog (AlcExportDialog / File > Export).
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version. See LICENSE.
 */
(function (Alchemy) {
  'use strict';

  /** Every shape that's visible, in drawing order (guides are left out). */
  function visibleShapes(canvas) {
    return canvas.shapes.concat(canvas.createShapes, canvas.affectShapes);
  }

  /** alchemy-2026-11-20-143205.png */
  function filename(ext) {
    var d = new Date();
    function pad(n) { return (n < 10 ? '0' : '') + n; }
    return 'alchemy-' + d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
      '-' + pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds()) + '.' + ext;
  }

  function download(blob, name) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  // ---------------------------------------------------------------------------
  // PNG: re-render the vector shapes at full device resolution

  function exportPNG(canvas, transparent) {
    var dpr = canvas.dpr || 1;
    var out = document.createElement('canvas');
    out.width = Math.round(canvas.width * dpr);
    out.height = Math.round(canvas.height * dpr);
    var ctx = out.getContext('2d');
    if (!transparent) {
      ctx.fillStyle = canvas.bgColor;
      ctx.fillRect(0, 0, out.width, out.height);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var shapes = visibleShapes(canvas);
    for (var i = 0; i < shapes.length; i++) shapes[i].draw(ctx);
    out.toBlob(function (blob) {
      if (blob) download(blob, filename('png'));
    }, 'image/png');
  }

  // ---------------------------------------------------------------------------
  // SVG: write each shape's segments out as a <path>

  function num(n) {
    return String(Math.round(n * 100) / 100);
  }

  function rgb(shape) {
    var hex = shape.color.replace('#', '');
    return 'rgb(' + parseInt(hex.substr(0, 2), 16) + ',' + parseInt(hex.substr(2, 2), 16) + ',' +
      parseInt(hex.substr(4, 2), 16) + ')';
  }

  function pathData(shape) {
    var d = [];
    for (var i = 0; i < shape.segments.length; i++) {
      var s = shape.segments[i];
      if (s.type === 'M') d.push('M' + num(s.x) + ' ' + num(s.y));
      else if (s.type === 'L') d.push('L' + num(s.x) + ' ' + num(s.y));
      else if (s.type === 'Q') d.push('Q' + num(s.cx) + ' ' + num(s.cy) + ' ' + num(s.x) + ' ' + num(s.y));
      else if (s.type === 'C') {
        d.push('C' + num(s.c1x) + ' ' + num(s.c1y) + ' ' + num(s.c2x) + ' ' + num(s.c2y) +
          ' ' + num(s.x) + ' ' + num(s.y));
      } else if (s.type === 'Z') d.push('Z');
    }
    return d.join('');
  }

  function buildSVG(canvas) {
    var w = canvas.width, h = canvas.height;
    var defs = [];
    var body = [];
    var shapes = visibleShapes(canvas);

    for (var i = 0; i < shapes.length; i++) {
      var shape = shapes[i];
      if (shape.segments.length < 2) continue; // a lone moveTo draws nothing
      var color = rgb(shape);
      var opacity = num(shape.alpha / 255);
      var paint = color;
      var g = shape.gradient;

      // Same rule as Shape.getPaint: a zero-length gradient uses the plain colour.
      if (g && !(g.x1 === g.x2 && g.y1 === g.y2)) {
        var id = 'g' + defs.length;
        defs.push('<linearGradient id="' + id + '" gradientUnits="userSpaceOnUse" x1="' +
          num(g.x1) + '" y1="' + num(g.y1) + '" x2="' + num(g.x2) + '" y2="' + num(g.y2) + '">' +
          '<stop offset="0" stop-color="' + color + '" stop-opacity="' + opacity + '"/>' +
          '<stop offset="1" stop-color="' + color + '" stop-opacity="0"/>' +
          '</linearGradient>');
        paint = 'url(#' + id + ')';
        opacity = '1'; // the gradient stops already carry the alpha
      }

      var attrs;
      if (shape.style === Alchemy.STYLE_STROKE) {
        attrs = 'fill="none" stroke="' + paint + '" stroke-opacity="' + opacity +
          '" stroke-width="' + num(Math.max(shape.lineWidth, 0.5)) +
          '" stroke-linecap="round" stroke-linejoin="bevel"';
      } else {
        attrs = 'fill="' + paint + '" fill-opacity="' + opacity + '" fill-rule="nonzero"';
      }
      body.push('<path d="' + pathData(shape) + '" ' + attrs + '/>');
    }

    return '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h +
      '" viewBox="0 0 ' + w + ' ' + h + '">\n' +
      '<!-- Made with Alchemy Web -->\n' +
      (defs.length ? '<defs>\n' + defs.join('\n') + '\n</defs>\n' : '') +
      '<rect width="100%" height="100%" fill="' + canvas.bgColor + '"/>\n' +
      body.join('\n') + '\n</svg>\n';
  }

  function exportSVG(canvas) {
    download(new Blob([buildSVG(canvas)], { type: 'image/svg+xml' }), filename('svg'));
  }

  Alchemy.exporter = {
    exportPNG: exportPNG,
    exportSVG: exportSVG,
    buildSVG: buildSVG
  };
})(window.Alchemy = window.Alchemy || {});
