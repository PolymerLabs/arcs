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
    </style>
    <div root>
      <template is="dom-repeat" items="{{entries}}">
        <div entry>
          <object-explorer data="[[item.pecMsgBody]]">
            <span noPointer on-click="_blockEvent">
              [[item.time]]
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
        case 'PecLog':
          newEntries.push(this.newEntry(msg.messageBody));
          break;
        case 'page-refresh':
        case 'arc-transition':
          this.reset();
          return;
      }
    }
    if (newEntries.length) {
      this.push('entries', ...newEntries);
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

    return {
      icon,
      name,
      pecMsgBody: msg.pecMsgBody,
      stack,
      time: formatTime(msg.timestamp, 3),
      highlight: msg.pecMsgBody.callback === this.highlightedGroupCallbackId
    };
  }

  _blockEvent(event) {
    event.stopPropagation();
  }

  _toggleStack(event) {
    this.set(`entries.${event.model.index}.stack.collapsed`, !event.model.item.stack.collapsed);
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
