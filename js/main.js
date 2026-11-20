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
  var createOptions = { splatter: document.getElementById('splatter-options') };
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
