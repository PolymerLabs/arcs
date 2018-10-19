import {PolymerElement} from '../deps/@polymer/polymer/polymer-element.js';
import {MessengerMixin} from './arcs-shared.js';
import './object-explorer.js';
import {html} from '../deps/@polymer/polymer/lib/utils/html-tag.js';

class ArcsStores extends MessengerMixin(PolymerElement) {
  static get template() {
    return html`
    <style include="shared-styles">
      :host {
        display: block;
        border-left: 1px solid var(--mid-gray);
        line-height: 22px;
      }
      .group-title {
        display: flex;
        align-items: center;
        background-color: var(--light-gray);
        border-bottom: 1px solid var(--mid-gray);
        white-space: nowrap;
        overflow: hidden;
        position: relative;
        cursor: pointer;
      }
      .refresh {
        -webkit-mask-position: -84px 48px;
        position: absolute;
        right: 0;
        top: -1px;
        cursor: pointer;
        transition: transform .5s;
      }
      :host([loading]) .refresh {
        transform: rotate(1turn);
      }
      .group-content {
        background-color: white;
        border-bottom: 1px solid var(--mid-gray);
        display: flex;
        flex-direction: column;
      }
      .item-title {
        font-family: Menlo, monospace;
        font-size: 11px;
        display: inline-flex;
        align-items: center;
        white-space: nowrap;
        overflow: hidden;
        cursor: pointer;
        width: fit-content;
        max-width: 100%;
      }
      .empty {
        text-align: center;
        font-style: italic;
        color: var(--mid-gray);
        white-space: nowrap;
      }
      [name]:not(:empty) {
        color: var(--devtools-purple);
        margin-right: 1ch;
      }
      [tags]:not(:empty) {
        color: var(--devtools-blue);
        margin-right: 1ch;
      }
      [type]:not(:empty) {
        margin-right: 1ch;
      }
      [id] {
        color: var(--devtools-red);
      }
    </style>
    <template is="dom-repeat" items="{{storeGroups}}">
      <div class="group-title" on-click="_handleExpand">
        <span class="triangle devtools-small-icon" expanded$="{{item.expanded}}"></span>
        {{item.label}}
        <span class="devtools-icon refresh" on-click="_fetchStores"></span>
      </div>
      <template is="dom-if" if="{{item.expanded}}">
        <div class="group-content">
          <template is="dom-repeat" items="{{item.items}}">
            <div class="item-title" on-click="_handleExpand">
              <span class="triangle devtools-small-icon" expanded$="{{item.expanded}}"></span>
              <span name>[[item.store.name]]</span>
              <span tags>[[_tagsString(item.store.tags)]]</span>
              <span type>[[_typeString(item.store.type)]]</span>
              <span id>[[item.store.id]]</span>
            </div>
            <template is="dom-if" if="{{item.expanded}}">
              <object-explorer data="[[item.store]]" expanded skip-header></object-explorer>
            </template>
          </template>
          <template is="dom-if" if="{{!item.items.length}}">
            <div class="empty">No stores</div>
          </template>
        </div>
      </template>
    </template>`;
  }

  static get is() { return 'arcs-stores'; }

  static get properties() {
    return {
      loading: {
        type: Boolean,
        reflectToAttribute: true,
        value: false
      }
    };
  }

  constructor() {
    super();
    this.storeGroups = [{
      label: 'Arc Stores',
      expanded: true,
      items: []
    }, {
      label: 'Context Stores',
      expanded: true,
      items: []
    }];
  }

  onMessageBundle(messages) {
    for (const msg of messages) {
      switch (msg.messageType) {
        case 'arc-available':
          if (!this.arcId && !msg.messageBody.isSpeculative && !msg.messageBody.id.endsWith('-pipes')) {
            this.arcId = msg.messageBody.id;
            this._fetchStores();
          }
          break;
        case 'fetch-stores-result':
          this.loading = false;
          // Need to do below to force re-render without any stale data.
          this.set('storeGroups.0.items', []);
          this.set('storeGroups.1.items', []);
          Promise.resolve().then(() => {
            this.set('storeGroups.0.items', msg.messageBody.arcStores.map(h => this._toDisplayItem(h)));
            this.set('storeGroups.1.items', msg.messageBody.contextStores.map(h => this._toDisplayItem(h)));
          });
          break;
        case 'page-refresh':
          this.arcId = null;
          this.loading = false;
          this.set('storeGroups.0.items', []);
          this.set('storeGroups.1.items', []);
          break;
      }
    }
  }

  _toDisplayItem(store) {
    // For nicer printing in object-explorer, but without being enumerable.
    Object.defineProperty(store.type, 'toString', {value: () => this._typeString(store.type)});
    return {store, expanded: false};
  }

  _fetchStores(e) {
    this.loading = true;
    this.send({
      messageType: 'fetch-stores',
      messageBody: {},
      arcId: this.arcId
    });
    if (e) e.cancelBubble = true;
  }

  _tagsString(tags) {
    return tags.map(t => `#${t}`).join(' ');
  }

  _typeString(type) {
    switch (type.tag) {
      case 'Collection': return `[${this._typeString(type.data)}]`;
      case 'Entity': return type.data._model.names.join(' ');
    }
    return type.tag;
  }

  _handleExpand(e) {
    e.model.set('item.expanded', !e.model.item.expanded);
  }
}

window.customElements.define(ArcsStores.is, ArcsStores);
