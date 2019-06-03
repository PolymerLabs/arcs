/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import Xen from '../xen/xen.js';

//const log = Xen.logFactory('MicInput', 'blue');

class MicInput extends Xen.Base {
  _didMount() {
    if (this._supportsSpeech()) {
      this._initSpeech();
      document.addEventListener('keydown', this._onKeydown.bind(this));
      document.addEventListener('keyup', this._onKeyup.bind(this));
    }
  }
  _update(props, state) {
    if (state.active && !state.started) {
      state.started = true;
      this.start();
    }
    if (!state.active && state.recognizing) {
      this.stop();
      state.started = false;
    }
  }
  _render(props, state) {
    return state;
  }
  _supportsSpeech() {
    return ('webkitSpeechRecognition' in window);
  }
  _initSpeech(state) {
    const recognition = new window.webkitSpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onstart = this._onRecognitionStart.bind(this);
    recognition.onerror = this._onRecognitionError.bind(this);
    recognition.onend = this._onRecognitionEnd.bind(this);
    recognition.onresult = this._onRecognitionResult.bind(this);
    this._setState({recognition});
  }
  start() {
    const {recognition, recognizing} = this._state;
    if (recognition) {
      if (recognizing) {
        recognition.stop();
      } else {
        try {
          recognition.start();
          this._setState({finalTranscript: '', ignoreOnEnd: false});
        } catch (x) {
          this._setState({wontStart: x});
        }
      }
    }
  }
  stop() {
    const {recognition, recognizing, duration, finalTranscript} = this._state;
    if (recognizing) {
      recognition.stop();
    }
  }
  _onStartClick() {
    this.start();
  }
  _onRecognitionStart() {
    this._setState({recognizing: true});
    this._fire('start');
  }
  _onRecognitionError() {
    if (event.error == 'no-speech') {
      // TODO: something?
    }
    if (event.error == 'audio-capture') {
      // TODO: something?
    }
    if (event.error == 'not-allowed') {
      // TODO: something?
    }
    this._setState({ignoreOnEnd: true});
  }
  _onRecognitionResult() {
    let {ignoreOnEnd, finalTranscript} = this._state;
    let interimTranscript = '';
    for (let i = event.resultIndex; i < event.results.length; ++i) {
      if (event.results[i].isFinal) {
        finalTranscript += event.results[i][0].transcript;
      } else {
        interimTranscript += event.results[i][0].transcript;
      }
    }
    this._setState({interimTranscript, finalTranscript});
    const transcript = `${finalTranscript}${interimTranscript}`;
    this.value = transcript;
    this._fire('result', transcript);
  }
  _onRecognitionEnd() {
    const {ignoreOnEnd, finalTranscript} = this._state;
    this._setState({recognizing: false});
    // TODO(sjmiles): these conditionals in original demo code, leaving here in case I figure out why
    /*
    if (!ignoreOnEnd) {
      if (!finalTranscript) {
      } else {
      }
    }
    */
    this.value = finalTranscript;
    this._fire('end', finalTranscript);
  }
  _handleListenKey(e, keyIsDown) {
    const name = e.target.localName;
    if (!{textarea: 1, input: 1}[name] && (e.key === 'Shift')) {
      this._setState({active: keyIsDown});
    }
  }
  _onKeydown(e) {
    this._handleListenKey(e, true);
  }
  _onKeyup(e) {
    this._handleListenKey(e, false);
  }
}
customElements.define('mic-input', MicInput);
