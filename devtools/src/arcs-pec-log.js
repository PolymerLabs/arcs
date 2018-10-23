import {PolymerElement} from '../deps/@polymer/polymer/polymer-element.js';
import {html} from '../deps/@polymer/polymer/lib/utils/html-tag.js';
import './object-explorer.js';
import {formatTime, indentPrint, MessengerMixin} from './arcs-shared.js';

class ArcsPecLog extends MessengerMixin(PolymerElement) {
  static get template() {
    return html`
    <style>
      :host {
        display: block;
      }
      [root] {
        overflow: scroll;
        height: calc(100vh - 27px);
      }
      [entry] {
        padding: 4px;
      }
      [icon] {
        font-size: 14px;
        font-family: monospace;
        width: 20px;
        line-height: 20px;
        border-radius: 10px;
        text-align: center;
        margin: 0 4px;
      }
      [icon][highlight] {
        color: white;
        background-color: var(--highlight-blue);
      }
      [icon][callbackId]:hover {
        color: white;
        background-color: var(--highlight-blue);
      }
      [name] {
        padding-right: 4px;
      }
    </style>
    <div root>
      <template is="dom-repeat" items="{{entries}}">
        <div entry>
          <object-explorer data="[[item.pecMsgBody]]">
            [[item.time]]:
            <span icon highlight$="[[item.highlight]]" callbackId$="[[item.pecMsgBody.callback]]" on-click="_highlightGroup">[[item.icon]]</span>
            <span name>[[item.name]]</span>
          </object-explorer>
        </div>
      </template>
    </div>
    <div id="content"></div>`;
  }

  static get is() { return 'arcs-pec-log'; }

  constructor() {
    super();
    this.reset();
  }

  reset() {
    this.entries = [];
    this.originalCallName = {}; // Callback id to original method name;
    this.highlightedGroupCallbackId = null;
  }

  onMessageBundle(messages) {
    const newEntries = [];
    for (const msg of messages) {
      switch (msg.messageType) {
        case 'PecLog': newEntries.push(this.newEntry(msg.messageBody)); break;
        case 'page-refresh': this.reset(); return;
      }
    }
    if (newEntries.length) {
      this.push('entries', ...newEntries);
    }
  }

  newEntry(msg) {
    let name = msg.name;
    let icon = null;

    if (name.startsWith('on')) { // Host <- Context.
      name = name.substring(2);
      if (msg.pecMsgBody.callback) {
        icon = name.endsWith('Callback') ? '↩' : '←';
      } else {
        icon = '⇤';
      }
    } else { // Host -> Context.
      if (msg.pecMsgBody.callback) {
        icon = name.endsWith('Callback') ? '↪' : '→';
      } else {
        icon = '⇥';
      }
    }

    if (!name.endsWith('Callback') && msg.pecMsgBody.callback) {
      this.originalCallName[msg.pecMsgBody.callback] = name;
    }

    if (name === 'SimpleCallback' && msg.pecMsgBody.callback
        && this.originalCallName[msg.pecMsgBody.callback]) {
      name = this.originalCallName[msg.pecMsgBody.callback] + 'Callback';
    }

    return {
      icon,
      name,
      pecMsgBody: msg.pecMsgBody,
      time: formatTime(msg.timestamp, 3),
      highlight: msg.pecMsgBody.callback === this.highlightedGroupCallbackId
    };
  }

  _highlightGroup(event) {
    const callbackId = event.currentTarget.getAttribute('callbackId');
    if (!callbackId || this.highlightedGroupCallbackId === callbackId) {
      this.highlightedGroupCallbackId = null;
    } else {
      this.highlightedGroupCallbackId = callbackId;
    }

    for (let i = 0; i < this.entries.length; i++) {
      const entry = this.entries[i];
      const inHighlightedGroup = entry.pecMsgBody.callback === this.highlightedGroupCallbackId;
      if (entry.highlight !== inHighlightedGroup) {
        this.set(`entries.${i}.highlight`, inHighlightedGroup);
      }
    }

    event.stopPropagation();
  }
}

window.customElements.define(ArcsPecLog.is, ArcsPecLog);
