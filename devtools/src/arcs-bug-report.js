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
<<<<<<< HEAD
import '../deps/jszip/dist/jszip.js';
=======
import '../node_modules/jszip/dist/jszip.js';
import '../node_modules/file-saver/dist/FileSaver.js';
>>>>>>> Add zip and download.

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
<<<<<<< HEAD
      <input type="file" id="fileElem" style="display:none" onchange="_loadBugReport(this.files)">
      <button id="fileSelect">Select some files</button>
=======
      <button type="button" on-click="_loadBugReport">Load Bug Report</button>
>>>>>>> Add zip and download.
      <button type="button" on-click="_saveBugReport">Save Bug Report</button>
    </div>`;
  }

  static get is() { return 'arcs-bug-report'; }

  constructor() {
    super();
    this.messages = [];
<<<<<<< HEAD

    const fileElem = this.$.fileElem;
    this.$.fileSelect.addEventListener("click", function (e) {
      if (fileElem) {
        fileElem.click();
      }
    }, false);
=======
>>>>>>> Add zip and download.
  }

  onRawMessageBundle(messages) {
    this.messages = this.messages.concat(messages);
  }

  _saveBugReport() {
    console.log("save here");

    var zip = new JSZip();
    var file = zip.file("bugreport.txt", JSON.stringify(this.messages));
    file.generateAsync({ type: "blob" })
      .then(function (blob) {
        saveAs(blob, "bugreport.zip");
      });
<<<<<<< HEAD
  }

  _loadBugReport(files) {
    console.log("load here " + files);
=======

    
   // JSZip.writeFile("bugreport.json", messagesString);
  }

  _loadBugReport() {
    console.log("load here");
>>>>>>> Add zip and download.
  }
}

window.customElements.define(ArcsBugReport.is, ArcsBugReport);
