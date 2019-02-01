import {PolymerElement} from '../deps/@polymer/polymer/polymer-element.js';
import {html} from '../deps/@polymer/polymer/lib/utils/html-tag.js';
import '../deps/@polymer/iron-list/iron-list.js';
import {ObjectExplorer} from './object-explorer.js';
import {formatTime, MessengerMixin} from './arcs-shared.js';

class ArcsPecLog extends MessengerMixin(PolymerElement) {
  static get template() {
    return html`
    <style>
      :host {
        display: block;
      }
      iron-list {
        height: calc(100vh - 27px);
      }
      [noPointer] {
        cursor: default;
      }
      [stack] {
        padding: 4px;
        border-radius: 10px;
        margin-left: 6px;
        --iron-icon-height: 12px;
        --iron-icon-width: 12px;
      }
      [stack]:hover {
        background-color: lightgreen;
      }
      [stack].pointer {
        cursor: pointer;
      }
      [stack].invisible {
        visibility: hidden;
      }
      [stackFrame] {
        font-size: 11px;
        font-family: monospace;
        line-height: 15px;
        margin-left: 20px;
      }
      [stackMethod] {
        min-width: 300px;
        display: inline-block;
        color: green;
      }
      .link {
        color: darkblue;
        cursor: pointer;
      }
      .link:hover {
        text-decoration: underline;
      }
      .noLink {
        color: gray;
      }
      [dirIcon] {
        font-size: 14px;
        font-family: monospace;
        width: 20px;
        line-height: 20px;
        border-radius: 10px;
        text-align: center;
        margin-left: 4px;
      }
      [dirIcon][highlight] {
        color: white;
        background-color: var(--highlight-blue);
      }
      [dirIcon][callbackId]:hover {
        color: white;
        background-color: var(--highlight-blue);
      }
      [name] {
        margin: 0 4px;
      }
      [index] {
        margin: 0 1ch;
        color: var(--devtools-blue);
      }
      object-explorer {
        margin: 2px;
      }
    </style>
    <iron-list id="list" items="{{filteredEntries}}">
      <template>
        <div entry>
          <object-explorer data="[[item.explorerData]]" on-expand="_handleExpand">
            <span noPointer on-click="_blockEvent">
              <span index>[[item.msgCount]]:</span>[[item.time]]
              <span stack class$="[[item.stack.iconClass]]" on-click="_toggleStack">
                <iron-icon icon="menu"></iron-icon>
              </span>
            </span>
            <span dirIcon highlight$="[[item.highlight]]" callbackId$="[[item.pecMsgBody.callback]]" on-click="_highlightGroup">[[item.icon]]</span>
            <span name>[[item.name]]</span>
          </object-explorer>
          <div hidden$="{{item.stack.collapsed}}">
            <template is="dom-repeat" items="[[item.stack.frames]]" as="frame">
              <div stackFrame>
                <span stackMethod>[[frame.method]]</span>
                <span class$="[[frame.targetClass]]" on-click="_goToSource">[[frame.location]]</span>
              </div>
            </template>
          </div>
        </div>
      </template>
    </iron-list>`;
  }

  static get is() { return 'arcs-pec-log'; }

  constructor() {
    super();
    this.reset();
  }

  static get properties() {
    return {
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
  }

  reset() {
    this.entries = [];
    this.filteredEntries = [];
    this.originalCallName = {}; // Callback id to original method name;
    this.highlightedGroupCallbackId = null;
  }

  onMessageBundle(messages) {
    const newFilteredEntries = [];
    for (const msg of messages) {
      switch (msg.messageType) {
        case 'PecLog': {
          const entry = this.newEntry(msg.messageBody);
          this.entries.push(entry);
          if (!this.searchParams || entry.explorerData.found) {
            newFilteredEntries.push(entry);
          }
          break;
        }
        case 'arc-selected':
        case 'page-refresh':
          this.reset();
          break;
      }
    }
    if (newFilteredEntries.length) {
      this.push('filteredEntries', ...newFilteredEntries);
    }
  }

  newEntry(msg) {
    let name = msg.name;
    let icon = null;
    const isCallback = name.endsWith('Callback');

    if (name.startsWith('on')) { // Host <- Context.
      name = name.substring(2);
      if (msg.pecMsgBody.callback) {
        icon = isCallback ? '↩' : '←';
      } else {
        icon = '⇤';
      }
    } else { // Host -> Context.
      if (msg.pecMsgBody.callback) {
        icon = isCallback ? '↪' : '→';
      } else {
        icon = '⇥';
      }
    }

    if (!isCallback && msg.pecMsgBody.callback) {
      this.originalCallName[msg.pecMsgBody.callback] = name;
    }

    if (name === 'SimpleCallback' && msg.pecMsgBody.callback
        && this.originalCallName[msg.pecMsgBody.callback]) {
      name = this.originalCallName[msg.pecMsgBody.callback] + 'Callback';
    }

    const stack = {
      iconClass: msg.stack.length ? 'pointer' : 'invisible',
      frames: msg.stack,
      collapsed: true
    };

    const explorerData = ObjectExplorer.prepareData(msg.pecMsgBody);
    ObjectExplorer.find(explorerData, this.searchParams);

    return {
      icon,
      name,
      pecMsgBody: msg.pecMsgBody,
      explorerData,
      stack,
      msgCount: msg.pecMsgCount,
      time: formatTime(msg.timestamp, 3),
      highlight: msg.pecMsgBody.callback === this.highlightedGroupCallbackId
    };
  }

  _blockEvent(event) {
    event.stopPropagation();
  }

  _toggleStack(event) {
    this.set(`filteredEntries.${event.model.index}.stack.collapsed`, !event.model.item.stack.collapsed);
    this.$.list.updateSizeForIndex(event.model.index);
    event.stopPropagation();
  }

  _goToSource(event) {
    const target = event.model.frame.target;
    if (target !== null) {
      const parts = target.split(':');
      const line = Number(parts.pop()) - 1;
      chrome.devtools.panels.openResource(parts.join(':'), line);
    }
  }

  _handleExpand(e) {
    const ix = this.filteredEntries.findIndex(item => item.explorerData === e.detail);
    this.$.list.updateSizeForIndex(ix);
  }

  _highlightGroup(event) {
    const callbackId = event.model.item.pecMsgBody.callback;
    if (!callbackId || this.highlightedGroupCallbackId === callbackId) {
      this.highlightedGroupCallbackId = null;
    } else {
      this.highlightedGroupCallbackId = callbackId;
    }

    // Update filtered items.
    for (let i = 0; i < this.filteredEntries.length; i++) {
      const entry = this.filteredEntries[i];
      const inHighlightedGroup = entry.pecMsgBody.callback === this.highlightedGroupCallbackId;
      if (entry.highlight !== inHighlightedGroup) {
        this.set(`filteredEntries.${i}.highlight`, inHighlightedGroup);
      }
    }

    // Update data in the unfiltered list.
    for (const entry of this.entries) {
      entry.highlight = entry.pecMsgBody.callback === this.highlightedGroupCallbackId;
    }

    event.stopPropagation();
  }
}

window.customElements.define(ArcsPecLog.is, ArcsPecLog);
