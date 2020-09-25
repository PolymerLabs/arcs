/**
 * @license
 * Copyright 2020 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {PolymerElement} from '../../deps/@polymer/polymer/polymer-element.js';
import {html} from '../../deps/@polymer/polymer/lib/utils/html-tag.js';
import {formatTime, MessengerMixin} from '../arcs-shared.js';
import '../../deps/@polymer/iron-list/iron-list.js';
import {ObjectExplorer} from '../common/object-explorer.js';
import '../common/filter-input.js';

class RawLog extends MessengerMixin(PolymerElement) {
  static get template() {
    return html`
    <style include="shared-styles">
      :host {
        position: absolute;
        top: 0;
        right: 0;
        bottom: 0;
        left: 0;
        display: flex;
        flex-direction: column;
      }
      header {
        flex-grow: 0;
      }
      iron-list {
        flex-grow: 1;
        overflow-y: auto;
      }
      #download {
        height: 20px;
      }
      [kind] {
        margin: 0 4px;
        color: var(--dark-red);
      }
    </style>
    <header class="header">
      <div section>
        <iron-icon id="download" disabled$="{{!downloadEnabled}}" icon="file-download" title="Download log" on-click="downloadLog"></iron-icon>
        <div divider></div>
        <filter-input filter="{{searchParams}}"></filter-input>
      </div>
    </header>
    <iron-list id="list" items="{{filteredEntries}}">
      <template>
        <div entry>
          <object-explorer data="[[item.explorerData]]" on-expand="_handleExpand">
            <span kind>[[item.kind]]</span>
          </object-explorer>
        </div>
      </template>
    </iron-list>`;
  }

  constructor() {
    super();
    this.reset();
  }

  static get properties() {
    return {
      active: {
        type: Boolean,
        observer: '_onActiveChanged',
        reflectToAttribute: true
      },
      searchParams: {
        type: Object,
        observer: '_onSearchChanged'
      },
      entries: Array,
      filteredEntries: Array,
    };
  }

  _onSearchChanged(params) {
    // Go through filtered and non-filtered entries at the same time and
    // check which messages should be removed/added/kept to the filtered entries.
    let fi = 0; // Filtered index.
    for (const entry of this.entries) {
      const found = ObjectExplorer.find(entry.explorerData, params);
      const filter = !params || found;
      if (entry === this.filteredEntries[fi]) {
        if (filter) {
          fi++;
        } else {
          this.splice('filteredEntries', fi, 1);
        }
      } else {
        if (filter) {
          this.splice('filteredEntries', fi, 0, entry);
          this.notifyPath(`filteredEntries.${fi}.highlight`);
          fi++;
        }
      }
    }
    for (const explorer of this.shadowRoot.querySelectorAll('[entry] > object-explorer')) {
      explorer.find = params;
    }
    this.downloadEnabled = !!this.filteredEntries.length;
  }

  reset() {
    this.entries = [];
    this.filteredEntries = [];
    this.downloadEnabled = false;
  }

  // We don't bundle messages in DevToolsNg yet, so there will be just one.
  onRawMessageBundle(msg) {
    if (msg.kind === 'RawStoreMessage') return;
    const entry = this.newEntry(msg);
    this.entries.push(entry);
    if (!this.searchParams || entry.explorerData.found) {
      this.push('filteredEntries', entry);
    }
    this.downloadEnabled = !!this.filteredEntries.length;
  }

  newEntry(msg) {
    const explorerData = ObjectExplorer.prepareData(msg.message);
    ObjectExplorer.find(explorerData, this.searchParams);

    return {
      kind: msg.kind,
      msg,
      explorerData,
    };
  }

  downloadLog() {
    if (!this.downloadEnabled) return;

    const lines = this.filteredEntries.map(e => {
      return `${JSON.stringify(e.msg)}\n`;
    });
    const a = document.createElement('a');
    a.download = `arcs-log.log`;
    a.href = window.URL.createObjectURL(new Blob(lines, {type: 'text/plain'}));
    a.dataset.downloadurl = ['text/plain', a.download, a.href].join(':');
    a.click();
  }

  _handleExpand(e) {
    const ix = this.filteredEntries.findIndex(item => item.explorerData === e.detail);
    this.$.list.updateSizeForIndex(ix);
  }

  _onActiveChanged(active) {
    if (active) {
      // Iron-list needs to be notified that the panel got shown, so that it draws itself.
      this.$.list.fire('iron-resize');
    }
  }


  static get is() { return 'devtools-raw-log'; }
}

window.customElements.define(RawLog.is, RawLog);
