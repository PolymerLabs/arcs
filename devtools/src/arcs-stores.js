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
import {MessengerMixin} from './arcs-shared.js';
import './common/object-explorer.js';
import {html} from '../deps/@polymer/polymer/lib/utils/html-tag.js';

class ArcsStores extends MessengerMixin(PolymerElement) {
  static get template() {
    return html`
    <style include="shared-styles">
      :host {
        display: block;
        line-height: 24px;
        height: calc(100vh - 27px);
        overflow-y: scroll;
      }
      .title {
        padding: 0 8px;
        height: 26px;
        border-bottom: 1px solid var(--mid-gray);
        background-color: var(--light-gray);
      }
      .refresh {
        -webkit-mask-position: -84px 48px;
        cursor: pointer;
        transition: transform .5s;
        vertical-align: middle;
      }
      :host([loading]) .refresh {
        transform: rotate(1turn);
      }
      .content {
        border-bottom: 1px solid var(--mid-gray);
        display: flex;
        flex-direction: column;
      }
      object-explorer {
        margin: 2px 4px;
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
      object-explorer[find]:not([found]) {
        display: none;
      }
    </style>
    <header class="header">
      <div section>
        <span class="devtools-icon refresh" on-click="_fetchStores"></span>
        <div divider></div>
        <filter-input filter="{{searchParams}}"></filter-input>
      </div>
    </header>
    <template is="dom-repeat" items="{{storeGroups}}">
      <div class="title">{{item.label}}</div>
      <div class="content">
        <template is="dom-repeat" items="{{item.items}}">
          <object-explorer object="{{item}}">
            <span name>[[item.name]]</span>
            <span tags>[[_tagsString(item.tags)]]</span>
            <span type>[[_typeString(item.type)]]</span>
            <span id>[[item.id]]</span>
          </object-explorer>
        </template>
        <template is="dom-if" if="{{!item.items.length}}">
          <div class="empty-label">No stores</div>
        </template>
      </div>
    </template>`;
  }

  static get is() { return 'arcs-stores'; }

  static get properties() {
    return {
      loading: {
        type: Boolean,
        reflectToAttribute: true,
        value: false
      },
      searchParams: {
        type: Object,
        observer: '_onSearchChanged'
      }
    };
  }

  constructor() {
    super();
    this.storeGroups = [{
      label: 'Arc Stores',
      items: []
    }, {
      label: 'Context Stores',
      items: []
    }];
  }

  _onSearchChanged(params) {
    for (const explorer of this.shadowRoot.querySelectorAll('object-explorer')) {
      explorer.find = params;
    }
  }

  onMessageBundle(messages) {
    for (const msg of messages) {
      switch (msg.messageType) {
        case 'fetch-stores-result':
          if (this.arcId !== msg.meta.arcId) break;
          this.loading = false;
          this.splice('storeGroups.0.items', 0, this.storeGroups[0].items.length, ...msg.messageBody.arcStores);
          this.splice('storeGroups.1.items', 0, this.storeGroups[1].items.length, ...msg.messageBody.contextStores);
          break;
        case 'arc-selected':
          this._reset();
          this.arcId = msg.messageBody.arcId;
          this._fetchStores();
          break;
        case 'page-refresh':
          this._reset();
          break;
      }
    }
  }

  _reset() {
    this.loading = false;
    this.set('storeGroups.0.items', []);
    this.set('storeGroups.1.items', []);
  }

  _fetchStores(e) {
    if (!this.arcId) return;
    this.loading = true;
    this.send({
      messageType: 'fetch-stores',
      arcId: this.arcId
    });
    if (e) e.cancelBubble = true;
  }

  _tagsString(tags) {
    return tags.map(t => `#${t}`).join(' ');
  }

  _typeString(type) {
    switch (type.tag) {
      case 'Collection': return `[${this._typeString(type.collectionType)}]`;
      case 'Entity': return type.entitySchema.names.join(' ');
    }
    return type.tag;
  }
}

window.customElements.define(ArcsStores.is, ArcsStores);
