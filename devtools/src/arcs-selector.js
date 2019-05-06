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
        display: inline-block;
        margin-left: 6px;
        padding-right: 5px;
        max-width: 150px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        vertical-align: middle;
      }
      [selector] [name][none] {
        font-style: italic;
        color: var(--dark-gray);
      }
      .triangle {
        margin-left: 12px;
      }
      iron-dropdown {
        min-width: 160px;
      }
      [dropdown] {
        /* Overrides attributes set by the iron-dropdown */
        max-width: 90vw !important;
        max-height: 90vh !important;
      }
      [list] {
        min-width: 200px;
        line-height: 24px;
        max-height: calc(90vh - 80px);
        overflow: scroll;
      }
      [list]:not([show-inner]) [inner]:not([speculative]) {
        display: none;
      }
      [list]:not([show-speculative]) [speculative] {
        display: none;
      }
      [entry] {
        padding: 4px 12px;
        cursor: pointer;
        border-bottom: 1px solid var(--light-gray);
      }
      [entry][active] [name] {
        font-weight: bold;
      }
      [entry][speculative], [entry][inner] {
        padding-left: 30px;
        position: relative;
      }
      [entry][speculative]:before, [entry][inner]:before {
        font-family: 'Material Icons';
        font-size: 18px;
        position: absolute;
        color: #444;
        left: 6px;
      }
      [entry][speculative]:before {
        content: 'blur_on';
      }
      [entry][inner]:before {
        content: 'radio_button_unchecked';
      }
      [entry][speculative][inner]:before {
        content: 'blur_circular';
      }
      [option] {
        border-top: 1px solid var(--light-gray);
        vertical-align: middle;
        padding: 0px 8px;
        color: #444;
        background-color: white;
        line-height: 22px;
      }
      [option]:not(:last-child) {
        box-shadow: 0px -2px 2px rgba(0,0,0,.3);
      }
      [option] i {
        font-size: 18px;
        vertical-align: middle;
      }
      [option] label {
        display: inline-block;
      }
      [option] input {
        vertical-align: top;
        margin-top: 5px;
      }
      [desc] {
        font-style: italic;
        color: #444;
      }
      [desc]:not(:empty):before {
        content: '"';
      }
      [desc]:not(:empty):after {
        content: '"';
      }
      [annotation] {
        font-style: italic;
      }
      [arcId] {
        font-size: 10px;
        color: var(--dark-gray);
      }
      [entry]:hover, [entry]:hover [arcId], [entry]:hover [desc], [entry]:hover:before {
        color: #fff;
        background-color: var(--highlight-blue);
      }
    </style>
    <div selector on-click="_openDropdown"><span count>[[arcs.length]]</span><span name none$="[[!active]]">[[_activeName(active)]]</span><span class="triangle devtools-small-icon" expanded></span></div>
    <iron-dropdown class="dropdown" id="dropdown" horizontal-align="left" horizontal-offset="-6" vertical-align="top" vertical-offset="23">
      <div slot="dropdown-content" dropdown>
        <div list show-inner$=[[showInner]] show-speculative$=[[showSpeculative]]>
          <template is="dom-repeat" items="[[arcs]]">
            <div entry active$=[[item.active]] on-click="_arcSelected" speculative$=[[item.speculative]] inner$=[[item.inner]]>
              <div desc>[[item.description]]</div>
              <div name>[[item.name]] <span annotation>[[item.annotation]]</span></div>
              <div arcId>[[item.id]]</div>
            </div>
          </template>
          <template is="dom-if" if="[[!arcs.length]]">
            <div class="empty-label">No arcs</div>
          </template>
        </div>
        <div option>
          <input type="checkbox" id="inner" checked="{{showInner::change}}">
          <label for="inner">
            <i class="material-icons">radio_button_unchecked</i>
            Show inner arcs
            ([[innerCount]])
          </label>
        </div>
        <div option>
          <input type="checkbox" id="speculative" checked="{{showSpeculative::change}}">
          <label for="speculative">
            <i class="material-icons">blur_on</i>
            Show speculative arcs<br>
            <i class="material-icons">blur_circular</i>
            and their inner arcs
            ([[speculativeCount]])
          </label>
        </div>
      </div>
    </iron-dropdown>`;
  }
  static get is() { return 'arcs-selector'; }

  static get properties() {
    return {
      activePage: {
        type: String
      },
      showInner: {
        type: Boolean,
        value: false
      },
      innerCount: {
        type: Number,
        computed: 'countInnerArcs(arcs.*)'
      },
      showSpeculative: {
        type: Boolean,
        value: false
      },
      speculativeCount: {
        type: Number,
        computed: 'countSpeculativeArcs(arcs.*)'
      }
    };
  }

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
          const item = {
            id: id,
            name: id.substring(id.indexOf(':') + 1),
            speculative: msg.messageBody.speculative,
            inner: msg.messageBody.inner
          };
          if (item.name.endsWith('-null')) item.annotation = '(Planning)';
          if (!this.messages.has(id)) this.messages.set(id, []);
          this.push('arcs', item);
          if (!item.speculative && !item.inner) {
            this._select(item);
            messagesToForward.length = 0;
          }
          break;
        }
        case 'arc-description': {
          const id = msg.meta.arcId;
          const description = msg.messageBody;
          const ix = this.arcs.findIndex(a => a.id === id);
          if (ix === -1) break;
          this.set(`arcs.${ix}.description`, description);
          break;
        }
        case 'arc-transition': {
          const arcName = msg.messageBody;
          const defaultArcSuffix = (this.activePage === 'planning'
              || this.activePage === 'strategyExplorer') ? '-null' : '-launcher';
          const item = arcName
              ? this.arcs.find(i => i.name === arcName)
              : this.arcs.find(i => i.name.endsWith(defaultArcSuffix));
          if (item) this._select(item);
          break;
        }
        default: {
          if (msg.meta) {
            const id = msg.meta.arcId;
            if (!msg.requestId) { // Don't store request/response messages for replay.
              if (!this.messages.has(id)) this.messages.set(id, []);
              this.messages.get(id).push(msg);
            }
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

  countInnerArcs() {
    return this.arcs.filter(a => a.inner && !a.speculative).length;
  }

  countSpeculativeArcs() {
    return this.arcs.filter(a => a.speculative).length;
  }
}

window.customElements.define(ArcsSelector.is, ArcsSelector);
