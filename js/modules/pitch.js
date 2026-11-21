/*
 * Alchemy Web - modules/pitch.js
 * The "Pitch Shapes" create module, ported from org.alchemy.create.PitchShapes
 * (the Alchemy authors).
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version. See LICENSE.
 *
 * Stroke width follows the pitch of your voice: low notes draw thick (up to
 * 50 px each side) and high notes thin (down to 1 px), mapped across Lower
 * Pitch to Upper Pitch (default 50-1800 Hz). The width eases toward the
 * target by 2 px per move, so changes are smooth.
 *
 * Pitch detection follows the Java, which used the Beads audio library:
 * about 57 times a second, take the frequency spectrum, find its 10
 * strongest peaks, and use their strength-weighted average frequency. It
 * only updates when the strongest peak is loud enough, so silence keeps the
 * last width. Here the spectrum comes from a Web Audio analyser, and "loud
 * enough" is a fixed level of about -40 dB, roughly matching the Java's
 * threshold.
 *
 * Fixed from the Java: the Upper Pitch slider's handler was attached to the
 * Lower Pitch slider, so Upper Pitch did nothing.
 */
(function (Alchemy) {
  'use strict';

  var MIN_WEIGHT = 1, MAX_WEIGHT = 50;
  var PEAKS = 10;
  var THRESHOLD_DB = -40;
  var INTERVAL = 1000 * 777 / 44100;   // the Java's hop size, ~17.6 ms

  var Pitch = {
    id: 'pitch',
    name: 'Pitch',
    type: 'create',

    minPitch: 50,       // "Lower Pitch" slider, 50-1800 Hz
    maxPitch: 1800,     // "Upper Pitch" slider, 50-1800 Hz
    pitch: 0,           // last detected pitch, for the toolbar readout
    onPitch: null,      // set by main.js to show the current pitch

    _weight: 1,
    _target: 1,
    _timer: null,
    _spectrum: null,

    setup: function () {
      Alchemy.mic.acquire();
      var self = this;
      if (!this._timer) this._timer = setInterval(function () { self._listen(); }, INTERVAL);
    },

    deselect: function () {
      if (this._timer) clearInterval(this._timer);
      this._timer = null;
      Alchemy.mic.release();
    },

    /** One analysis step: find the pitch and set the target width. */
    _listen: function () {
      var analyser = Alchemy.mic.getAnalyser();
      if (!analyser) return;
      var n = analyser.frequencyBinCount;
      if (!this._spectrum || this._spectrum.length !== n) this._spectrum = new Float32Array(n);
      var db = this._spectrum;
      analyser.getFloatFrequencyData(db);
      var pitch = Pitch.detect(db, Alchemy.mic.getSampleRate(), analyser.fftSize);
      if (pitch === null) return;
      this.pitch = pitch;
      this.setPitch(pitch);
      if (this.onPitch) this.onPitch(pitch);
    },

    /** Map a pitch to the target width (PitchShapes.affectDrawingShapeSomehow). */
    setPitch: function (pitch) {
      var lo = Math.min(this.minPitch, this.maxPitch), hi = Math.max(this.minPitch, this.maxPitch);
      if (pitch >= hi) this._target = MIN_WEIGHT;
      else if (pitch <= lo) this._target = MAX_WEIGHT;
      else this._target = (MAX_WEIGHT - MIN_WEIGHT) * (1 - (pitch - lo) / (hi - lo)) + MIN_WEIGHT;
    },

    pointerDown: function (p, e, canvas) {
      var shape = canvas.newShape(null);
      canvas.createShapes.push(shape);
      shape.spineTo(canvas.penLocation, this._weight);
      canvas.redraw();
    },

    pointerDrag: function (p, e, canvas) {
      // Ease toward the target width, 2 px per move
      var diff = this._target - this._weight;
      var step = Math.min(2, Math.abs(diff));
      this._weight += diff < 0 ? -step : step;
      var shape = canvas.getCurrentCreateShape();
      // Check for a shape in case the canvas was cleared mid-stroke.
      if (!shape) return;
      shape.spineTo(canvas.penLocation, this._weight);
      canvas.redraw();
    },

    pointerUp: function (p, e, canvas) {
      if (canvas.getCurrentCreateShape()) {
        canvas.redraw();
        canvas.commitShapes();
      }
    }
  };

  /**
   * The strength-weighted average frequency of the strongest spectral
   * peaks, or null if the strongest is below the loudness threshold.
   * `db` is a spectrum in decibels (AnalyserNode.getFloatFrequencyData).
   */
  Pitch.detect = function (db, sampleRate, fftSize) {
    var peaks = [];
    for (var i = 1; i < db.length - 1; i++) {
      if (db[i] > db[i - 1] && db[i] >= db[i + 1] && isFinite(db[i])) peaks.push(i);
    }
    if (!peaks.length) return null;
    peaks.sort(function (a, b) { return db[b] - db[a]; });
    peaks = peaks.slice(0, PEAKS);
    if (db[peaks[0]] < THRESHOLD_DB) return null;
    var weighted = 0, energy = 0;
    peaks.forEach(function (bin) {
      var power = Math.pow(10, db[bin] / 10);   // dB to linear power
      weighted += bin * sampleRate / fftSize * power;
      energy += power;
    });
    return energy > 0 ? weighted / energy : null;
  };

  Alchemy.modules = Alchemy.modules || {};
  Alchemy.modules.pitch = Pitch;
})(window.Alchemy = window.Alchemy || {});
