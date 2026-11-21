/*
 * Alchemy Web - canvas.js
 * A port of the drawing parts of org.alchemy.core.AlcCanvas
 * (Karl D.D. Willis, Jacob Hina and the Alchemy authors).
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version. See LICENSE.
 */
(function (Alchemy) {
  'use strict';

  /**
   * Holds the shape lists and the drawing settings, renders them, and passes
   * pointer events on to the current create module and any affect modules.
   *
   *   shapes        finished shapes (also flattened into an offscreen buffer)
   *   createShapes  shapes the create module is drawing right now
   *   affectShapes  extra shapes made by affect modules (e.g. mirror copies)
   *   guideShapes   helper lines that are drawn but never committed
   */
  function Canvas(el) {
    this.el = el;
    this.ctx = el.getContext('2d');
    this.buffer = document.createElement('canvas');
    this.bufferCtx = this.buffer.getContext('2d');

    this.shapes = [];
    this.createShapes = [];
    this.affectShapes = [];
    this.guideShapes = [];

    // Drawing settings (AlcCanvas defaults: black, alpha 255, stroke, width 1)
    this.color = '#000000';
    this.alpha = 255;
    this.style = Alchemy.STYLE_STROKE;
    this.lineWidth = 1;
    this.bgColor = '#ffffff';

    // Background image (View > Load Background Image in the desktop client):
    // drawn centred under the shapes. `bgImageSrc` is a data: URL, kept so the
    // SVG export can embed the picture.
    this.bgImage = null;
    this.bgImageSrc = null;

    // Pen state, filled in from pointer events
    this.penDown = false;
    this.penType = 'mouse';   // 'mouse' | 'pen' | 'touch'
    this.penPressure = 1;
    this.penLocation = { x: 0, y: 0 };

    this.createModule = null;
    this.affectModules = [];
    // When false the create module gets no pointer events (AlcCanvas.setCreateEvents),
    // e.g. while Mirror is waiting for the user to pick an axis.
    this.createEvents = true;
    // When false the screen isn't updated while drawing (Blindness).
    this.redrawEnabled = true;
    // Called when a module changes colour/opacity, so the toolbar can update
    // (AlcCanvas.refreshColorButtonRelay). Set by main.js.
    this.onSettingsChanged = null;

    this._frameRequested = false;
    this._activePointer = null;

    this.resize();
    this._bindEvents();
  }

  /** A new shape that starts at p and uses the current colour/style/width. */
  Canvas.prototype.newShape = function (p) {
    return new Alchemy.Shape(p, {
      color: this.color,
      alpha: this.alpha,
      style: this.style,
      lineWidth: this.lineWidth
    });
  };

  Canvas.prototype.hasCreateShapes = function () {
    return this.createShapes.length > 0;
  };

  Canvas.prototype.getCurrentCreateShape = function () {
    return this.createShapes.length ? this.createShapes[this.createShapes.length - 1] : null;
  };

  /**
   * Run the affects, then repaint on the next animation frame. When redrawing
   * is switched off (Blindness), the shapes still update but the screen stays
   * as it was until forceRedraw().
   */
  Canvas.prototype.redraw = function (fullRedraw) {
    for (var i = 0; i < this.affectModules.length; i++) {
      if (this.affectModules[i].affect) this.affectModules[i].affect();
    }
    if (fullRedraw) this._renderBuffer();
    if (this.redrawEnabled === false) return;
    if (!this._frameRequested) {
      this._frameRequested = true;
      var self = this;
      requestAnimationFrame(function () {
        self._frameRequested = false;
        self._paint();
      });
    }
  };

  /**
   * Re-render the finished shapes into the buffer, e.g. after an affect
   * removes or changes some. The next paint shows the result.
   */
  Canvas.prototype.renderBuffer = function () {
    this._renderBuffer();
  };

  /** Turn screen updates on or off (AlcCanvas.setRedraw). */
  Canvas.prototype.setRedraw = function (on) {
    this.redrawEnabled = on;
  };

  /** Repaint everything now, even if redrawing is off (AlcCanvas.forceRedraw). */
  Canvas.prototype.forceRedraw = function () {
    this._renderBuffer();
    this._paint(true);
  };

  /** Move create/affect shapes into the finished list and flatten them into the buffer. */
  Canvas.prototype.commitShapes = function () {
    var added = this.createShapes.concat(this.affectShapes);
    this._withScale(this.bufferCtx, function (ctx) {
      for (var i = 0; i < added.length; i++) added[i].draw(ctx);
    });
    Array.prototype.push.apply(this.shapes, added);
    this.createShapes.length = 0;
    this.affectShapes.length = 0;
    this.redraw();
  };

  Canvas.prototype.clear = function () {
    this.shapes.length = 0;
    this.createShapes.length = 0;
    this.affectShapes.length = 0;
    this.guideShapes.length = 0;
    var mods = [this.createModule].concat(this.affectModules);
    for (var i = 0; i < mods.length; i++) {
      if (mods[i] && mods[i].cleared) mods[i].cleared();
    }
    this.redraw(true);
    // Clear the screen even if redrawing is off, as in AlcCanvas.clear()
    if (this.redrawEnabled === false) this.forceRedraw();
  };

  Canvas.prototype.setCreateModule = function (module) {
    if (module === this.createModule) return;
    if (this.hasCreateShapes()) this.commitShapes();
    if (this.createModule && this.createModule.deselect) this.createModule.deselect(this);
    this.createModule = module;
    if (module && module.setup) module.setup(this);
  };

  Canvas.prototype.isAffectActive = function (module) {
    return this.affectModules.indexOf(module) >= 0;
  };

  /** Turn an affect module on or off. Several affects can be active at once. */
  Canvas.prototype.setAffect = function (module, on) {
    var active = this.isAffectActive(module);
    if (on && !active) {
      this.affectModules.push(module);
      if (module.setup) module.setup(this);
    } else if (!on && active) {
      this.affectModules.splice(this.affectModules.indexOf(module), 1);
      if (module.deselect) module.deselect(this);
    }
    this.redraw();
  };

  // ---------------------------------------------------------------------------
  // Flip (Edit > Flip Horizontal / Flip Vertical in the desktop client)

  /**
   * Mirror every finished shape across the centre of the canvas, gradients
   * included. Like AlcCanvas.flipHorizontal/flipVertical, shapes still being
   * drawn and the background image are left alone.
   */
  Canvas.prototype._flip = function (map) {
    for (var i = 0; i < this.shapes.length; i++) {
      this.shapes[i] = this.shapes[i].transformed(map);
    }
    this.redraw(true);
  };

  Canvas.prototype.flipHorizontal = function () {
    var w = this.width;
    this._flip(function (p) { return { x: w - p.x, y: p.y }; });
  };

  Canvas.prototype.flipVertical = function () {
    var h = this.height;
    this._flip(function (p) { return { x: p.x, y: h - p.y }; });
  };

  // ---------------------------------------------------------------------------
  // Background image

  /**
   * Set the background image from a data: URL. Calls done(true) once it has
   * loaded, or done(false) if the file isn't an image the browser can read.
   */
  Canvas.prototype.setBackgroundImage = function (src, done) {
    var self = this;
    var img = new Image();
    img.onload = function () {
      self.bgImage = img;
      self.bgImageSrc = src;
      self.redraw();
      if (done) done(true);
    };
    img.onerror = function () {
      if (done) done(false);
    };
    img.src = src;
  };

  Canvas.prototype.clearBackgroundImage = function () {
    this.bgImage = null;
    this.bgImageSrc = null;
    this.redraw();
  };

  /**
   * Where the background image goes, in CSS pixels: centred at its natural
   * size like the desktop client, but scaled down to fit if it is bigger than
   * the window (so a large photo isn't cropped to its middle).
   */
  Canvas.prototype.getBackgroundImageRect = function () {
    var img = this.bgImage;
    if (!img || !img.naturalWidth || !img.naturalHeight) return null;
    var scale = Math.min(1, this.width / img.naturalWidth, this.height / img.naturalHeight);
    var w = img.naturalWidth * scale;
    var h = img.naturalHeight * scale;
    return { x: (this.width - w) / 2, y: (this.height - h) / 2, width: w, height: h };
  };

  // ---------------------------------------------------------------------------
  // Rendering

  Canvas.prototype.resize = function () {
    var dpr = window.devicePixelRatio || 1;
    var w = window.innerWidth, h = window.innerHeight;
    this.width = w;
    this.height = h;
    this.dpr = dpr;
    this.el.width = this.buffer.width = Math.round(w * dpr);
    this.el.height = this.buffer.height = Math.round(h * dpr);
    this.el.style.width = w + 'px';
    this.el.style.height = h + 'px';
    this._renderBuffer();
    this._paint();
  };

  Canvas.prototype._withScale = function (ctx, fn) {
    ctx.save();
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    fn(ctx);
    ctx.restore();
  };

  /** Redraw every finished shape into the offscreen buffer (after resize/clear). */
  Canvas.prototype._renderBuffer = function () {
    var shapes = this.shapes;
    this.bufferCtx.clearRect(0, 0, this.buffer.width, this.buffer.height);
    this._withScale(this.bufferCtx, function (ctx) {
      for (var i = 0; i < shapes.length; i++) shapes[i].draw(ctx);
    });
  };

  /** Draw the background image (if any) onto a context scaled to CSS pixels. */
  Canvas.prototype.drawBackgroundImage = function (ctx) {
    var r = this.getBackgroundImageRect();
    if (r) ctx.drawImage(this.bgImage, r.x, r.y, r.width, r.height);
  };

  /**
   * Paint the screen. With redrawing off (Blindness), only the background and
   * finished shapes are drawn, like AlcCanvas.paintComponent skipping the
   * create/affect lists; `force` draws everything.
   */
  Canvas.prototype._paint = function (force) {
    var ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = this.bgColor;
    ctx.fillRect(0, 0, this.el.width, this.el.height);
    var self = this;
    if (this.bgImage) this._withScale(ctx, function (c) { self.drawBackgroundImage(c); });
    ctx.drawImage(this.buffer, 0, 0);

    var lists = (this.redrawEnabled || force) ?
      [this.createShapes, this.affectShapes, this.guideShapes] : [this.guideShapes];
    this._withScale(ctx, function (c) {
      for (var j = 0; j < lists.length; j++) {
        for (var i = 0; i < lists[j].length; i++) lists[j][i].draw(c);
      }
    });
  };

  // ---------------------------------------------------------------------------
  // Pointer events (mouse, pen and touch all arrive here)

  Canvas.prototype._point = function (e) {
    var rect = this.el.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  Canvas.prototype._updatePen = function (e) {
    this.penType = e.pointerType || 'mouse';
    // Mice report 0.5 while pressed; treat them as full pressure like Alchemy's PEN_CURSOR.
    this.penPressure = this.penType === 'mouse' ? 1 : (e.pressure || 0);
    this.penLocation = this._point(e);
  };

  Canvas.prototype._dispatch = function (method, p, e) {
    var mods = (this.createEvents ? [this.createModule] : []).concat(this.affectModules);
    for (var i = 0; i < mods.length; i++) {
      if (mods[i] && mods[i][method]) mods[i][method](p, e, this);
    }
  };

  Canvas.prototype._bindEvents = function () {
    var self = this;
    var el = this.el;

    el.addEventListener('pointerdown', function (e) {
      // Pen tip and left mouse button are both button 0; ignore barrel/right buttons.
      if (e.button !== 0 || self._activePointer !== null) return;
      e.preventDefault();
      self._activePointer = e.pointerId;
      el.setPointerCapture(e.pointerId);
      self.penDown = true;
      self._updatePen(e);
      self._dispatch('pointerDown', self.penLocation, e);
    });

    el.addEventListener('pointermove', function (e) {
      if (self._activePointer !== null && e.pointerId !== self._activePointer) return;
      // Coalesced events give every sample from a fast pen, not one per frame.
      // Modules that measure speed per event (like SplatterShapes) can opt out
      // with `coalesced: false`, so events arrive at a rate closer to Java's.
      var wantAll = !self.createModule || self.createModule.coalesced !== false;
      var events = (wantAll && e.getCoalescedEvents && e.getCoalescedEvents().length) ?
        e.getCoalescedEvents() : [e];
      for (var i = 0; i < events.length; i++) {
        self._updatePen(events[i]);
        self._dispatch(self.penDown ? 'pointerDrag' : 'pointerMove', self.penLocation, events[i]);
      }
    });

    function end(e) {
      if (e.pointerId !== self._activePointer) return;
      self._activePointer = null;
      self.penDown = false;
      self.penLocation = self._point(e);
      self._dispatch('pointerUp', self.penLocation, e);
    }
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);

    // Pen barrel buttons often map to right-click; don't pop up a menu over the canvas.
    el.addEventListener('contextmenu', function (e) { e.preventDefault(); });

    window.addEventListener('resize', function () { self.resize(); });
  };

  Alchemy.Canvas = Canvas;
})(window.Alchemy = window.Alchemy || {});
