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
    scrawl: document.getElementById('scrawl-options'),
    detach: document.getElementById('detach-options'),
    xshapes: document.getElementById('xshapes-options'),
    pressure: document.getElementById('pressure-options'),
    ribbon: document.getElementById('ribbon-options'),
    type: document.getElementById('type-options'),
    pull: document.getElementById('pull-options'),
    evolve: document.getElementById('evolve-options')
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

  // Detach options
  slider('detach-distance', function (v) { Alchemy.modules.detach.distance = v; });

  // X Shapes options: the Java slider value is halved into the multiplier
  slider('xshapes-distance', function (v) { Alchemy.modules.xshapes.multiplier = Math.trunc(v / 2); });

  // Ribbon options
  var ribbon = Alchemy.modules.ribbon;
  var ribbonSize = document.getElementById('ribbon-size');
  ribbonSize.addEventListener('change', function () { ribbon.size = clampInput(ribbonSize); });
  var ribbonSpacing = document.getElementById('ribbon-spacing');
  ribbonSpacing.addEventListener('change', function () { ribbon.spacing = clampInput(ribbonSpacing); });
  slider('ribbon-friction', function (v) { ribbon.friction = v * 0.01; });
  slider('ribbon-gravity', function (v) { ribbon.gravity = v * 0.01; });

  // Type options
  var typeMod = Alchemy.modules.type;
  slider('type-distortion', function (v) { typeMod.distortion = v * 0.01; });
  slider('type-size', function (v) { typeMod.size = 0.1 + v / 10; });
  document.getElementById('type-generate').addEventListener('click', function () {
    typeMod.generate(canvas);
  });
  var typeKeys = document.getElementById('type-keys');
  typeKeys.addEventListener('click', function () {
    typeMod.keys = !typeMod.keys;
    pressed(typeKeys, typeMod.keys);
  });

  // Shape library groups, shared by Pull and the Evolver
  var svgFile = document.getElementById('svg-file');
  var onSvgLoaded = null;
  svgFile.addEventListener('change', function () {
    var files = svgFile.files;
    if (!files || !files.length || !onSvgLoaded) return;
    var done = onSvgLoaded;
    Alchemy.shapes.loadSVGFiles(files, 'My Shapes', function (count) {
      if (!count) alert('No shapes were found in that SVG file.');
      refreshGroupLists();
      done(count);
    });
  });
  function pickSVG(callback) {
    onSvgLoaded = callback;
    svgFile.value = '';
    svgFile.click();
  }
  var pullGroup = document.getElementById('pull-group');
  var evolverGroup = document.getElementById('evolver-group');
  function refreshGroupLists() {
    var groups = Alchemy.shapes.getGroups();
    var pullValue = pullGroup.value;
    pullGroup.innerHTML = '<option value="-1">All Shapes</option>';
    evolverGroup.innerHTML = '<option value="" disabled selected>Library…</option>';
    groups.forEach(function (g, i) {
      var label = g.name + ' (' + g.shapes.length + ')';
      pullGroup.add(new Option(label, String(i)));
      evolverGroup.add(new Option(label, String(i)));
    });
    if (pullValue) pullGroup.value = pullValue;
  }
  refreshGroupLists();

  // Pull options
  var pull = Alchemy.modules.pull;
  pullGroup.addEventListener('change', function () { pull.group = Number(pullGroup.value); });
  document.getElementById('pull-load').addEventListener('click', function () {
    pickSVG(function (count) {
      if (!count) return;
      // Switch to the group the shapes went into
      var groups = Alchemy.shapes.getGroups();
      for (var i = 0; i < groups.length; i++) {
        if (groups[i].name === 'My Shapes') { pullGroup.value = String(i); pull.group = i; }
      }
    });
  });
  slider('pull-spacing', function (v) { pull.spacing = v; });
  slider('pull-size', function (v) { pull.size = 0.1 + v / 10; });
  var pullRotate = document.getElementById('pull-rotate');
  pullRotate.addEventListener('click', function () {
    pull.rotate = !pull.rotate;
    pressed(pullRotate, pull.rotate);
  });

  // Evolve options and the Evolver window
  var evolve = Alchemy.modules.evolve;
  var evolver = document.getElementById('evolver');
  var evolverGrid = document.getElementById('evolver-grid');
  slider('evolve-spacing', function (v) { evolve.spacing = v; });

  function renderEvolver() {
    evolverGrid.innerHTML = '';
    if (!evolve.shapes.length) {
      var empty = document.createElement('p');
      empty.className = 'evolver-empty';
      empty.textContent = 'No shapes yet. Load shapes from the canvas, the library or an SVG file to begin.';
      evolverGrid.appendChild(empty);
      return;
    }
    var ink = getComputedStyle(document.documentElement).getPropertyValue('--bar-text').trim() || '#000';
    var dpr = window.devicePixelRatio || 1;
    evolve.shapes.forEach(function (shape, i) {
      var tile = document.createElement('div');
      tile.className = 'evolver-tile';
      var cv = document.createElement('canvas');
      cv.width = 100 * dpr; cv.height = 100 * dpr;
      var ctx = cv.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = ink;
      ctx.fill(shape.path, 'nonzero');
      var label = document.createElement('label');
      label.textContent = 'Rank ';
      var rank = document.createElement('input');
      rank.type = 'number'; rank.min = '0'; rank.max = '100'; rank.step = '1';
      rank.value = String(shape.rank || 0);
      rank.setAttribute('aria-label', 'Rank for shape ' + (i + 1));
      rank.addEventListener('input', function () {
        var v = Math.max(0, Math.min(100, Math.round(Number(rank.value)) || 0));
        shape.rank = v;
      });
      label.appendChild(rank);
      tile.appendChild(cv);
      tile.appendChild(label);
      evolverGrid.appendChild(tile);
    });
  }
  document.getElementById('evolve-open').addEventListener('click', function () {
    if (!evolve.shapes.length) evolve.loadFromCanvas(canvas);
    renderEvolver();
    evolver.showModal();
  });
  document.getElementById('evolver-canvas').addEventListener('click', function () {
    evolve.loadFromCanvas(canvas);
    renderEvolver();
  });
  evolverGroup.addEventListener('change', function () {
    var g = Alchemy.shapes.getGroups()[Number(evolverGroup.value)];
    if (g) evolve.setShapes(g.shapes);
    evolverGroup.selectedIndex = 0;
    renderEvolver();
  });
  document.getElementById('evolver-svg').addEventListener('click', function () {
    pickSVG(function () {
      var groups = Alchemy.shapes.getGroups();
      var mine = groups.filter(function (g) { return g.name === 'My Shapes'; })[0];
      if (mine) evolve.setShapes(mine.shapes);
      renderEvolver();
    });
  });
  var evolverMutation = document.getElementById('evolver-mutation');
  evolverMutation.addEventListener('input', function () {
    evolve.mutation = Number(evolverMutation.value) / 100;
  });
  document.getElementById('evolver-evolve').addEventListener('click', function () {
    evolve.evolve();
    renderEvolver();
  });
  document.getElementById('evolver-done').addEventListener('click', function () {
    evolver.close();
  });

  // Pressure options
  var pressureAmount = document.getElementById('pressure-amount');
  pressureAmount.addEventListener('change', function () {
    Alchemy.modules.pressure.amount = clampInput(pressureAmount);
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

  // Opacity: shown as 1-100%, stored as Alchemy's 0-255 alpha. Like colour and
  // weight it applies to new strokes; shapes already drawn keep theirs.
  var opacityInput = document.getElementById('opacity');
  var opacityValue = document.getElementById('opacity-value');
  opacityInput.value = Math.round(canvas.alpha / 255 * 100);
  function showOpacity() {
    canvas.alpha = Math.round(Number(opacityInput.value) / 100 * 255);
    opacityValue.textContent = opacityInput.value + '%';
  }
  opacityInput.addEventListener('input', showOpacity);
  showOpacity();

  // Background colour: repaints straight away, and is used by the exports
  var bgColorInput = document.getElementById('bg-color');
  bgColorInput.value = canvas.bgColor;
  bgColorInput.addEventListener('input', function () {
    canvas.bgColor = bgColorInput.value;
    canvas.redraw();
  });

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

  /** Wire an affect's on/off button, showing its options row while it's on. */
  function affectToggle(buttonId, module, optionsId) {
    var button = document.getElementById(buttonId);
    var options = optionsId ? document.getElementById(optionsId) : null;
    button.addEventListener('click', function () {
      var on = !canvas.isAffectActive(module);
      canvas.setAffect(module, on);
      pressed(button, on);
      if (options) options.hidden = !on;
    });
  }

  // Smooth affect
  affectToggle('smooth', Alchemy.modules.smooth, 'smooth-options');
  var smoothRepeat = document.getElementById('smooth-repeat');
  smoothRepeat.addEventListener('click', function () {
    Alchemy.modules.smooth.repeat = !Alchemy.modules.smooth.repeat;
    pressed(smoothRepeat, Alchemy.modules.smooth.repeat);
  });

  // Blindness affect
  var blindness = Alchemy.modules.blindness;
  affectToggle('blindness', blindness, 'blindness-options');
  document.getElementById('blindness-reveal').addEventListener('click', function () {
    blindness.reveal();
  });
  var blindnessAuto = document.getElementById('blindness-auto');
  blindnessAuto.addEventListener('click', function () {
    blindness.autoReveal = !blindness.autoReveal;
    pressed(blindnessAuto, blindness.autoReveal);
  });

  // Color Switcher affect
  var cs = Alchemy.modules.colorswitcher;
  affectToggle('colorswitcher', cs, 'colorswitcher-options');
  var csBaseColor = document.getElementById('cs-base-color');
  document.getElementById('colorswitcher').addEventListener('click', function () {
    // The base colour starts as the toolbar colour the first time it's turned on
    if (cs.baseColor) csBaseColor.value = cs.baseColor;
  });
  csBaseColor.addEventListener('input', function () {
    cs.setBaseColor(csBaseColor.value);
  });
  var csBase = document.getElementById('cs-base');
  csBase.addEventListener('click', function () {
    cs.switchColor = !cs.switchColor;
    pressed(csBase, cs.switchColor);
  });
  slider('cs-range', function (v) { cs.range = v; });
  var csAlpha = document.getElementById('cs-alpha');
  csAlpha.addEventListener('click', function () {
    cs.switchAlpha = !cs.switchAlpha;
    pressed(csAlpha, cs.switchAlpha);
  });
  var csConstant = document.getElementById('cs-constant');
  csConstant.addEventListener('click', function () {
    cs.constant = !cs.constant;
    pressed(csConstant, cs.constant);
  });

  // Keep the toolbar's colour and opacity in step when a module changes them
  canvas.onSettingsChanged = function () {
    colorInput.value = canvas.color;
    opacityInput.value = Math.max(1, Math.round(canvas.alpha / 255 * 100));
    opacityValue.textContent = opacityInput.value + '%';
  };

  // Limit affect
  affectToggle('limit', Alchemy.modules.limit, 'limit-options');
  var limitNumber = document.getElementById('limit-number');
  limitNumber.addEventListener('change', function () {
    Alchemy.modules.limit.limit = clampInput(limitNumber);
    canvas.redraw();
  });

  // Random affect
  affectToggle('random', Alchemy.modules.random, 'random-options');
  slider('random-distortion', function (v) { Alchemy.modules.random.distortion = v; });

  // Repeat affect
  var repeatMod = Alchemy.modules.repeat;
  affectToggle('repeat', repeatMod, 'repeat-options');
  var repeatOn = document.getElementById('repeat-on');
  function toggleRepeating() {
    repeatMod.repeat = !repeatMod.repeat;
    pressed(repeatOn, repeatMod.repeat);
    repeatOn.textContent = repeatMod.repeat ? 'Repeating' : 'Paused';
  }
  repeatOn.addEventListener('click', toggleRepeating);
  slider('repeat-interval', function (v) { repeatMod.interval = v; });

  // Displace affect
  affectToggle('displace', Alchemy.modules.displace, 'displace-options');
  slider('displace-amount', function (v) { Alchemy.modules.displace.displacement = v; });

  // Keyboard shortcuts: S toggles style, Backspace/Delete clears, Esc cancels axis select
  window.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && mirror.selectingAxis) {
      mirror.cancelAxisSelect();
      return;
    }
    if (e.target.tagName === 'INPUT' || e.metaKey || e.ctrlKey || e.altKey) return;
    var typing = canvas.createModule === typeMod;
    if (typing && e.key === ' ') {
      // Space makes an abstract shape; stop it from also pressing a focused button
      e.preventDefault();
      if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
      if (!e.repeat) typeMod.generate(canvas);
    } else if (typing && typeMod.keys && e.key.length === 1 && !e.repeat) {
      // Key Drawing takes over single-character shortcuts while it's on
      typeMod.typeKey(canvas, e.key);
    } else if ((e.key === 'r' || e.key === 'R') && canvas.isAffectActive(blindness)) {
      blindness.reveal();
    } else if ((e.key === 'b' || e.key === 'B') && canvas.isAffectActive(repeatMod)) {
      toggleRepeating();
    } else if (e.key === 's' || e.key === 'S') {
      styleButton.click();
    } else if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault();
      canvas.clear();
    }
  });
})(window.Alchemy);
