/*
 * Alchemy Web - microphone.js
 * Shared microphone input for the sound modules, standing in for
 * org.alchemy.core.AlcMicrophone. Uses the Web Audio API: the browser asks
 * for permission the first time a sound module is turned on.
 *
 * Samples are reported like the Java (16-bit, -32768 to 32767), and the
 * level like AlcMicrophone.getMicLevel(): the average size of the samples
 * divided by 100.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version. See LICENSE.
 */
(function (Alchemy) {
  'use strict';

  var FFT_SIZE = 2048;

  var context = null, analyser = null, stream = null, source = null;
  var buffer = new Float32Array(FFT_SIZE);
  var users = 0;
  var starting = null;
  var warned = false;

  function explain(err) {
    if (warned) return;
    warned = true;
    var reason = err && err.name === 'NotAllowedError' ?
      'Microphone access was blocked.' :
      (err && err.message) || 'The microphone isn’t available.';
    alert(reason + '\n\nThe sound modules need a microphone. If you allowed access and it still ' +
      'doesn’t work, your browser may not allow the microphone on pages opened from disk: in a ' +
      'terminal, run `python3 -m http.server` in the alchemy-web folder and open ' +
      'http://localhost:8000 instead.');
  }

  function open() {
    if (starting) return starting;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      starting = Promise.reject(new Error('This page can’t use the microphone (it needs a secure page).'));
    } else {
      starting = navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
      }).then(function (s) {
        stream = s;
        var AC = window.AudioContext || window.webkitAudioContext;
        context = new AC();
        source = context.createMediaStreamSource(stream);
        analyser = context.createAnalyser();
        analyser.fftSize = FFT_SIZE;
        analyser.smoothingTimeConstant = 0;
        source.connect(analyser);
        if (context.state === 'suspended') context.resume();
        return analyser;
      });
    }
    starting.catch(function (err) {
      starting = null;
      explain(err);
    });
    return starting;
  }

  function close() {
    if (stream) stream.getTracks().forEach(function (t) { t.stop(); });
    if (context) context.close();
    context = analyser = stream = source = null;
    starting = null;
  }

  /** Read the latest audio into the buffer; false if the mic isn't running yet. */
  function read() {
    if (!analyser) return false;
    analyser.getFloatTimeDomainData(buffer);
    return true;
  }

  function toInt16(v) {
    return Math.max(-32768, Math.min(32767, Math.round(v * 32767)));
  }

  Alchemy.mic = {
    /** Start using the microphone (asks for permission once). Returns a promise. */
    acquire: function () {
      users++;
      return open();
    },

    /** Stop using it; the microphone turns off when no module needs it. */
    release: function () {
      users = Math.max(0, users - 1);
      if (users === 0) close();
    },

    isRunning: function () {
      return !!analyser;
    },

    /** The most recent n samples as 16-bit values (zeros until the mic starts). */
    samples: function (n) {
      var out = new Int16Array(n);
      if (!read()) return out;
      var start = Math.max(0, FFT_SIZE - n);
      for (var i = 0; i < n && start + i < FFT_SIZE; i++) out[i] = toInt16(buffer[start + i]);
      return out;
    },

    /** The single most recent sample, as a 16-bit value. */
    latestSample: function () {
      if (!read()) return 0;
      return toInt16(buffer[FFT_SIZE - 1]);
    },

    /** AlcMicrophone.getMicLevel over the last n samples. */
    level: function (n) {
      var s = this.samples(n || 1);
      var sum = 0;
      for (var i = 0; i < s.length; i++) sum += Math.abs(s[i]);
      return (sum / s.length) / 100;
    },

    /** The analyser and sample rate, for pitch detection. */
    getAnalyser: function () { return analyser; },
    getSampleRate: function () { return context ? context.sampleRate : 44100; }
  };
})(window.Alchemy = window.Alchemy || {});
