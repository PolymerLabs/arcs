import '../deps/@polymer/iron-dropdown/iron-dropdown.js';
import {PolymerElement} from '../deps/@polymer/polymer/polymer-element.js';
import {html} from '../deps/@polymer/polymer/lib/utils/html-tag.js';
import {MessengerMixin} from './arcs-shared.js';

class ArcsSelector extends MessengerMixin(PolymerElement) {
  static get template() {
    return html`
    <style include="shared-styles">
      :host {
        display: block;
      }
      [selector] {
        padding-left: 4px;
        cursor: pointer;
        line-height: 20px;
      }
      [count] {
        color: white;
        background-color: var(--dark-gray);
        padding: 2px 6px;
        border-radius: 20px;
      }
      [selector] [name] {
        margin-left: 6px;
      }
      [selector] [name][none] {
        font-style: italic;
        color: var(--dark-gray);
      }
      .triangle {
        margin-left: 12px;
      }
      iron-dropdown {
        box-shadow: var(--drop-shadow);
        background-color: white;
        padding: 8px 0;
        min-width: 160px;
      }
      [list] {
        /* Overrides attributes set by the iron-dropdown */
        max-width: 50vw !important;
        max-height: 50vh !important;
      }
      [entry] {
        line-height: 20px;
        padding: 4px 12px;
        cursor: pointer;
      }
      [entry][active] [name] {
        font-weight: bold;
      }
      [annotation] {
        font-style: italic;
      }
      [arcId] {
        font-size: 10px;
        color: var(--dark-gray);
      }
      [entry]:hover, [entry]:hover [arcId] {
        color: #fff;
        background-color: var(--highlight-blue);
      }
    </style>
    <div selector on-click="_openDropdown"><span count>[[arcs.length]]</span><span name none$="[[!active]]">[[_activeName(active)]]</span><span class="triangle devtools-small-icon" expanded></span></div>
    <iron-dropdown id="dropdown" horizontal-align="left" horizontal-offset="-6" vertical-align="top" vertical-offset="23">
      <div slot="dropdown-content" list>
        <template is="dom-repeat" items="[[arcs]]">
          <div entry active$=[[item.active]] on-click="_arcSelected">
            <div name>[[item.name]] <span annotation>[[item.annotation]]</span></div>
            <div arcId>[[item.id]]</div>
          </div>
        </template>
      </div>
    </iron-dropdown>`;
  }
  static get is() { return 'arcs-selector'; }

  constructor() {
    super();
    this.active = null;
    this.arcs = [];
    this.messages = new Map();
  }

  onRawMessageBundle(messages) {
    const messagesToForward = [];
    for (const msg of messages) {
      switch (msg.messageType) {
        case 'page-refresh':
          this.arcs = [];
          this.active = null;
          this.messages.clear();
          this.$.dropdown.close();
          messagesToForward.push(msg);
          break;
        case 'arc-available': {
          const id = msg.meta.arcId;
          const name = id.substring(id.indexOf(':') + 1);
          const item = {id, name};
          if (name.endsWith('-null')) item.annotation = '(Planning)';
          if (!this.messages.has(id)) this.messages.set(id, []);
          this.push('arcs', item);
          this._select(item);
          break;
        }
        case 'arc-transition': {
          const arcName = msg.messageBody;
          const item = arcName
              ? this.arcs.find(i => i.name === arcName)
              : this.arcs.find(i => i.name.endsWith('-launcher'));
          if (item) this._select(item);
          break;
        }
        default: {
          if (msg.meta) {
            const id = msg.meta.arcId;
            if (!this.messages.has(id)) this.messages.set(id, []);
            this.messages.get(id).push(msg);
            if (this.active && id === this.active.id) messagesToForward.push(msg);
          } else {
            messagesToForward.push(msg);
          }
        }
      }  
    }
    if (messagesToForward.length) this.emitFilteredMessages(messagesToForward);  
  }

  _arcSelected(e) {
    this._select(e.model.item);
    this.$.dropdown.close();
  }

  _select(item) {
    if (!item.active) {
      if (this.arcs.includes(this.active)) {
        this.set(`arcs.${this.arcs.indexOf(this.active)}.active`, false);
      }
      this.set(`arcs.${this.arcs.indexOf(item)}.active`, true);
      this.active = item;
      const msgs = this.messages.get(item.id);
      this.emitFilteredMessages([
        {messageType: 'arc-selected', messageBody: {arcId: item.id}},
        ...msgs
      ]);
    }
  }

  _openDropdown() {
    this.$.dropdown.open();
  }

  _activeName(active) {
    return active ? active.name : 'none';
  }
}

window.customElements.define(ArcsSelector.is, ArcsSelector);
