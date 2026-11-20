/*
 * Alchemy Web - main.js
 * Sets up the canvas, selects the create module and wires up the toolbar.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version. See LICENSE.
 */
(function (Alchemy) {
  'use strict';

  var canvas = new Alchemy.Canvas(document.getElementById('canvas'));
  canvas.setCreateModule(Alchemy.modules.shapes);
  Alchemy.canvas = canvas; // handy for poking at from the browser console

  function pressed(button, on) {
    button.setAttribute('aria-pressed', on ? 'true' : 'false');
  }

  // Create module switcher: one create module at a time, each may have options
  var createButtons = document.querySelectorAll('.create-module');
  var createOptions = {
    splatter: document.getElementById('splatter-options'),
    speed: document.getElementById('speed-options'),
    scrawl: document.getElementById('scrawl-options')
  };
  function selectCreate(id) {
    canvas.setCreateModule(Alchemy.modules[id]);
    for (var i = 0; i < createButtons.length; i++) {
      pressed(createButtons[i], createButtons[i].dataset.module === id);
    }
    for (var key in createOptions) createOptions[key].hidden = key !== id;
  }
  for (var i = 0; i < createButtons.length; i++) {
    createButtons[i].addEventListener('click', function () {
      selectCreate(this.dataset.module);
    });
  }

  // Splatter options
  function clampInput(input) {
    var v = Math.round(Number(input.value));
    if (isNaN(v)) v = Number(input.defaultValue);
    v = Math.min(Number(input.max), Math.max(Number(input.min), v));
    input.value = v;
    return v;
  }
  var splatterSize = document.getElementById('splatter-size');
  var splatterDrips = document.getElementById('splatter-drips');
  splatterSize.addEventListener('change', function () {
    Alchemy.modules.splatter.setSize(clampInput(splatterSize));
  });
  splatterDrips.addEventListener('change', function () {
    Alchemy.modules.splatter.setDrips(clampInput(splatterDrips));
  });

  /** Wire a range slider to a module setting, showing its value in the <output>. */
  function slider(id, onChange) {
    var input = document.getElementById(id);
    var output = document.querySelector('output[for="' + id + '"]');
    input.addEventListener('input', function () {
      output.textContent = input.value;
      onChange(Number(input.value));
    });
  }

  // Speed options
  var speedLineType = document.getElementById('speed-linetype');
  speedLineType.addEventListener('click', function () {
    var speed = Alchemy.modules.speed;
    speed.freeform = !speed.freeform;
    speedLineType.textContent = speed.freeform ? 'Curved' : 'Straight';
  });
  slider('speed-multiplier', function (v) { Alchemy.modules.speed.multiplier = v; });

  // Scrawl options
  slider('scrawl-flow', function (v) { Alchemy.modules.scrawl.flow = v; });
  slider('scrawl-detail', function (v) { Alchemy.modules.scrawl.detail = v; });
  slider('scrawl-noise', function (v) { Alchemy.modules.scrawl.noise = v; });

  // Style: line (stroke) or solid (fill)
  var styleButton = document.getElementById('style');
  function showStyle() {
    var solid = canvas.style === Alchemy.STYLE_FILL;
    styleButton.textContent = solid ? 'Solid' : 'Line';
    styleButton.setAttribute('aria-pressed', solid ? 'true' : 'false');
  }
  styleButton.addEventListener('click', function () {
    canvas.style = canvas.style === Alchemy.STYLE_FILL ? Alchemy.STYLE_STROKE : Alchemy.STYLE_FILL;
    showStyle();
  });
  showStyle();

  // Colour
  var colorInput = document.getElementById('color');
  colorInput.value = canvas.color;
  colorInput.addEventListener('input', function () {
    canvas.color = colorInput.value;
  });

  // Line weight
  var weightInput = document.getElementById('weight');
  var weightValue = document.getElementById('weight-value');
  weightInput.value = canvas.lineWidth;
  function showWeight() {
    canvas.lineWidth = Number(weightInput.value);
    weightValue.textContent = weightInput.value;
  }
  weightInput.addEventListener('input', showWeight);
  showWeight();

  // Clear
  document.getElementById('clear').addEventListener('click', function () {
    canvas.clear();
  });

  // Mirror affect
  var mirror = Alchemy.modules.mirror;
  var mirrorButton = document.getElementById('mirror');
  var mirrorOptions = document.getElementById('mirror-options');
  var mirrorH = document.getElementById('mirror-h');
  var mirrorV = document.getElementById('mirror-v');
  var mirrorAxis = document.getElementById('mirror-axis');

  mirrorButton.addEventListener('click', function () {
    var on = !canvas.isAffectActive(mirror);
    canvas.setAffect(mirror, on);
    pressed(mirrorButton, on);
    mirrorOptions.hidden = !on;
  });
  mirrorH.addEventListener('click', function () {
    mirror.setHorizontal(!mirror.horizontal);
    pressed(mirrorH, mirror.horizontal);
  });
  mirrorV.addEventListener('click', function () {
    mirror.setVertical(!mirror.vertical);
    pressed(mirrorV, mirror.vertical);
  });
  mirrorAxis.addEventListener('click', function () {
    if (mirror.selectingAxis) {
      mirror.cancelAxisSelect();
    } else {
      mirror.startAxisSelect();
      pressed(mirrorAxis, true);
    }
  });
  mirror.onAxisSelectEnd = function () { pressed(mirrorAxis, false); };
  document.getElementById('mirror-reset').addEventListener('click', function () {
    mirror.resetAxis();
  });

  // Export: the button shows the format choices; picking one downloads a file
  var exportButton = document.getElementById('export');
  var exportOptions = document.getElementById('export-options');
  function showExport(on) {
    exportOptions.hidden = !on;
    pressed(exportButton, on);
  }
  exportButton.addEventListener('click', function () {
    showExport(exportOptions.hidden);
  });
  document.getElementById('export-png').addEventListener('click', function () {
    Alchemy.exporter.exportPNG(canvas, false);
    showExport(false);
  });
  document.getElementById('export-png-clear').addEventListener('click', function () {
    Alchemy.exporter.exportPNG(canvas, true);
    showExport(false);
  });
  document.getElementById('export-svg').addEventListener('click', function () {
    Alchemy.exporter.exportSVG(canvas);
    showExport(false);
  });

  // Flip the drawing
  document.getElementById('flip-h').addEventListener('click', function () {
    canvas.flipHorizontal();
  });
  document.getElementById('flip-v').addEventListener('click', function () {
    canvas.flipVertical();
  });

  // Background image: read the file as a data: URL so it works from file://
  // and can be embedded in SVG exports.
  var bgButton = document.getElementById('bg-image');
  var bgRemove = document.getElementById('bg-image-remove');
  var bgFile = document.getElementById('bg-image-file');
  bgButton.addEventListener('click', function () {
    bgFile.value = '';
    bgFile.click();
  });
  bgFile.addEventListener('change', function () {
    var file = bgFile.files && bgFile.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      canvas.setBackgroundImage(reader.result, function (ok) {
        if (ok) {
          bgRemove.hidden = false;
        } else {
          alert('That file couldn’t be loaded as an image. Please choose a JPG, PNG, GIF or WebP file.');
        }
      });
    };
    reader.onerror = function () {
      alert('That file couldn’t be read.');
    };
    reader.readAsDataURL(file);
  });
  bgRemove.addEventListener('click', function () {
    canvas.clearBackgroundImage();
    bgRemove.hidden = true;
  });

  // Gradient affect
  var gradientButton = document.getElementById('gradient');
  gradientButton.addEventListener('click', function () {
    var on = !canvas.isAffectActive(Alchemy.modules.gradient);
    canvas.setAffect(Alchemy.modules.gradient, on);
    pressed(gradientButton, on);
  });

  // Keyboard shortcuts: S toggles style, Backspace/Delete clears, Esc cancels axis select
  window.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && mirror.selectingAxis) {
      mirror.cancelAxisSelect();
      return;
    }
    if (e.target.tagName === 'INPUT' || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === 's' || e.key === 'S') {
      styleButton.click();
    } else if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault();
      canvas.clear();
    }
  });
})(window.Alchemy);
