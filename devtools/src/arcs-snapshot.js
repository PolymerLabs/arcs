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
 * Saves/loads a snapshot which contains messages captured by devtools.
 */
class ArcsSnapshot extends MessengerMixin(PolymerElement) {
  static get template() {
    return html`
    <style include="shared-styles">
      :host {
        display: flex;
        flex-direction: column;
      }
    </style>
    <div class="wrapper">
      <iron-icon icon="image:photo-camera"></iron-icon>
      <input type="file" id="fileElem" style="display:none" on-change="_load">
      <button id="fileSelect">Load Snapshot</button>
      <button type="button" on-click="_save">Take Snapshot</button>
    </div>`;
  }

  static get is() { return 'arcs-snapshot'; }

  constructor() {
    super();
    this.messages = [];
  }

  ready() {
    super.ready();

    const params = new URLSearchParams(window.location.search);
    const hasSnapshot = params.has('snapshot');

    this.$.fileSelect.addEventListener(
      'click',
      e => hasSnapshot ? this.$.fileElem.click() : window.location.href = '?snapshot',
      false);

    if (hasSnapshot) {
      this.emitFilteredMessages([{messageType: 'mode-snapshot'}]);
    }
  }

  onMessage(message) {
    switch (message.messageType) {
      case 'mode-snapshot':
         this.$.fileElem.click();
        return;
      default:
        return;
    }
  }

  onRawMessageBundle(messages) {
    this.messages.push(...messages);
  }

  _save() {
    const zip = new JSZip();
    const file = zip.file('snapshot.txt', JSON.stringify(
      this.messages.filter(message => message.messageType != 'mode-snapshot')));
    file.generateAsync({type: 'blob', compression: 'DEFLATE'})
      .then(function(blob) {
        const a = document.createElement('a');
        a.download = `arcs-snapshot.zip`;
        a.href = window.URL.createObjectURL(blob);
        a.click();
      });
  }

  _load(event) {
    // Clears all contents in devtools.
    document.dispatchEvent(new CustomEvent('raw-messages', {detail: [{messageType: 'page-refresh'}]}));

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
    document.dispatchEvent(new CustomEvent('raw-messages', {detail: messages}));
  }
}

window.customElements.define(ArcsSnapshot.is, ArcsSnapshot);
