/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {PolymerElement} from '../deps/@polymer/polymer/polymer-element.js';
import {html} from '../deps/@polymer/polymer/lib/utils/html-tag.js';
import {MessengerMixin} from './arcs-shared.js';
import '../deps/jszip/dist/jszip.js';

/**
 * Saves/loads a bug report which contains debug messages sent to devtools.
 */
class ArcsBugReport extends MessengerMixin(PolymerElement) {
  static get template() {
    return html`
    <style include="shared-styles">
      :host {
        display: flex;
        flex-direction: column;
      }
    </style>
    <div class="wrapper">
      <input type="file" id="fileElem" style="display:none" on-change="_loadBugReport">
      <button id="fileSelect">Load Bug Report</button>
      <button type="button" on-click="_saveBugReport">Save Bug Report</button>
    </div>`;
  }

  static get is() { return 'arcs-bug-report'; }

  constructor() {
    super();
    this.messages = [];
  }

  ready() {
    super.ready();
    const fileElem = this.$.fileElem;
    this.$.fileSelect.addEventListener('click', function(e) {
      if (fileElem) {
        fileElem.click();
      }
    }, false);

    const params = new URLSearchParams(window.location.search);
    if (params.has('bugreport')) {
      this.emitFilteredMessages([{ messageType: 'mode-bugreport', }]);
    }
  }

  onMessage(msg) {
    switch (msg.messageType) {
      case 'mode-bugreport':
        const fileElem = this.$.fileElem;
        if (fileElem) {
          fileElem.click();
        }
        return;
      default:
        this.messages.push(msg);
        return;
    }
  }

  _saveBugReport() {
    const zip = new JSZip();
    const file = zip.file('bugreport.txt', JSON.stringify(this.messages));
    file.generateAsync({type: 'blob'})
      .then(function(blob) {
        const a = document.createElement('a');
        a.download = `bugreport.zip`;
        a.href = window.URL.createObjectURL(blob);
        a.click();
      });
  }

  _loadBugReport(event) {
    const files = event.target.files;
    for (let i = 0; i < files.length; i++) {
      JSZip.loadAsync(files[i]).then(
        zip => this._decompress(zip),
        e => alert('Error reading ' + f.name + ': ' + e.message));
    }
  }

  _decompress(zip) {
    zip.forEach(
      relativePath => zip.file(relativePath).async('text').then(
        txt => this._handleLog(txt)));
  }

  _handleLog(txt) {
    const messages = JSON.parse(txt);
    console.log(messages);
    this.emitFilteredMessages(messages);

    // document.dispatchEvent(new CustomEvent('raw-messages', {detail: messages}));
  }
}

window.customElements.define(ArcsBugReport.is, ArcsBugReport);
