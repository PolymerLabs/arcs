/*
@license
Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

import Xen from './xen/xen.js';
import Icons from './icons.css.js';

const log = Xen.logFactory('MicInput', 'blue');

class MicInput extends Xen.Base {
  _getInitialState() {
    return {
    };
  }
  _didMount() {
    if (this._supportsSpeech()) {
      this._initSpeech();
      document.addEventListener('keydown', this._onKeydown.bind(this));
      document.addEventListener('keyup', this._onKeyup.bind(this));
    }
  }
  _update(props, state) {
    if (state.active && !state.recognizing) {
      this._start();
    }
    if (!state.active && state.recognizing) {
      this._stop();
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
    const {recognition, recognizing, finalTranscript} = this._state;
    if (recognition) {
      this._start();
    } // else complain
  }
  _start() {
    const {recognition, recognizing, duration, finalTranscript} = this._state;
    if (recognizing) {
      recognition.stop();
    } else {
      recognition.start();
      this._setState({
        finalTranscript: '',
        ignoreOnEnd: false
      });
      this._fire('start');
    }
  }
  _stop() {
    const {recognition, recognizing, duration, finalTranscript} = this._state;
    if (recognizing) {
      recognition.stop();
      this._fire('end');
    }
  }
  _onStartClick() {
    this.start();
  }
  _onRecognitionStart() {
    this._setState({recognizing: true});
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
  _onKeydown(e) {
    const name = e.target.localName;
    if (!{textarea: 1, input: 1}[name]) {
      if (e.key == 'Shift') {
        this._setState({active: true});
      }
      //this._start();
    }
  }
  _onKeyup(e) {
    const name = e.target.localName;
    if (!{textarea: 1, input: 1}[name]) {
      if (e.key == 'Shift') {
        this._setState({active: false});
      }
      //this._stop();
    }
  }
}
customElements.define('mic-input', MicInput);
