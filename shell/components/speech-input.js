/*
@license
Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

import Xen from './xen/xen.js';

const html = Xen.Template.html;
const template = html`

<style>
  :host {
  }
</style>

`;

let recognizing;
let ignore_onend;
let final_transcript = '';
let start_timestamp;
let recognition;

class SpeechInput extends Xen.Base {
  _didMount() {
    if ('webkitSpeechRecognition' in window) {

      //start_button.style.display = 'inline-block';
      recognition = new window.webkitSpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onstart = function() {
        recognizing = true;
        //showInfo('info_speak_now');
        //start_img.src = 'mic-animate.gif';
      };

      recognition.onerror = function(event) {
        if (event.error == 'no-speech') {
          //start_img.src = 'mic.gif';
          //showInfo('info_no_speech');
          ignore_onend = true;
        }
        if (event.error == 'audio-capture') {
          //start_img.src = 'mic.gif';
          //showInfo('info_no_microphone');
          ignore_onend = true;
        }
        if (event.error == 'not-allowed') {
          //if (event.timeStamp - start_timestamp < 100) {
          //  showInfo('info_blocked');
          //} else {
          //  showInfo('info_denied');
          //}
          ignore_onend = true;
        }
      };

      recognition.onend = function() {
        recognizing = false;
        if (ignore_onend) {
          return;
        }
        //start_img.src = 'mic.gif';
        if (!final_transcript) {
          //showInfo('info_start');
          return;
        }
        //showInfo('');
        // if (window.getSelection) {
        //   window.getSelection().removeAllRanges();
        //   let range = document.createRange();
        //   range.selectNode(document.getElementById('final_span'));
        //   window.getSelection().addRange(range);
        // }
        //if (create_email) {
        //  create_email = false;
        //  createEmail();
        //}
      };

      recognition.onresult = function(event) {
        let interim_transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final_transcript += event.results[i][0].transcript;
          } else {
            interim_transcript += event.results[i][0].transcript;
          }
        }
        final_transcript = capitalize(final_transcript);
        final_span.innerHTML = linebreak(final_transcript);
        interim_span.innerHTML = linebreak(interim_transcript);
        //if (final_transcript || interim_transcript) {
        //  showButtons('inline-block');
        //}
      };
    }
  }
  start() {
    if (recognizing) {
      recognition.stop();
      return;
    }
    final_transcript = '';
    //recognition.lang = select_dialect.value;
    recognition.start();
    ignore_onend = false;
    final_span.innerHTML = '';
    interim_span.innerHTML = '';
    //start_img.src = 'mic-slash.gif';
    //showInfo('info_allow');
    //showButtons('none');
    //start_timestamp = event.timeStamp;
    setTimeout(() => recognition.stop(), 10*1000);
  }
}

customElements.define('speech-input', SpeechInput);

const final_span = window.final_span;
const interim_span = window.interim_span;

const two_line = /\n\n/g;
const one_line = /\n/g;
const linebreak = s => s.replace(two_line, '<p></p>').replace(one_line, '<br>');

const first_char = /\S/;
const capitalize = s => s.replace(first_char, m => m.toUpperCase());

