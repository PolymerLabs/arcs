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
import {formatDateTime, MessengerMixin} from '../arcs-shared.js';

class Overview extends MessengerMixin(PolymerElement) {
  static get template() {
    return html`
      <style include="shared-styles">
        [title] {
          line-height: 26px;
          padding: 0 8px;
          border-bottom: 1px solid var(--mid-gray);
          background-color: var(--light-gray);
        }
        [context] {
          font-family: Menlo, monospace;
          font-size: 11px;
          border-bottom: 1px solid var(--mid-gray);
        }
        [context] [type] {
          color: var(--darker-green);
          padding: 0 8px;
        }
        [context] [id] {
          color: var(--devtools-red);
          margin-right: 8px;
        }
        [context] [sk] {
          color: var(--devtools-blue);
          overflow: hidden;
          white-space: nowrap;
        }
      </style>
      <div title>Binding Contexts</div>
      <template is="dom-repeat" items="{{bindingContexts}}">
        <div context>
          <object-explorer context-id$="[[item.id]]" object="{{item}}">
            <span type>[[_typeString(item)]]</span>
            <span id>[[item.id]]</span>
            <span sk>[[item.storageKey]]</span>
          </object-explorer>
        </div>
      </template>
    `;
  }

  constructor() {
    super();
    this.bindingContexts = [];
  }

  // We don't bundle messages in DevToolsNg yet, so there will be just one.
  onRawMessageBundle(msg) {
    if (msg.kind === 'StoreOperationMessage' && msg.message.storeType === 'referenceMode') {
      const ctxIndex = this.bindingContexts.findIndex(context => context.id === msg.message.id);
      if (ctxIndex === -1) {
        this.push('bindingContexts', {
          id: msg.message.id,
          storageKey: msg.message.storageKey,
          operations: msg.message.operations.map(op => this.simplifyOp(op))
        });
      } else {
        this.push(`bindingContexts.${ctxIndex}.operations`,
          ...msg.message.operations.map(op => this.simplifyOp(op)));
        const explorer =  this.shadowRoot.querySelector(`object-explorer[context-id="${msg.message.id}"]`);
        explorer.refresh();
        explorer.flash();
      }
    }
  }

  simplifyOp(op) {
    const simplifyEntity = entity => ({
      creationTimestamp: formatDateTime(entity.creationTimestamp),
      expirationTimestamp: formatDateTime(entity.expirationTimestamp),
      fields: {...entity.singletons, ...entity.collections}
    });
    switch (op.type) {
      case 'add': return {
        type: op.type,
        added: simplifyEntity(op.added)
      };
      case 'update': return {
        type: op.type,
        value: simplifyEntity(op.value)
      };
      case 'remove': return {
        type: op.type,
        removed: op.removed
      };
      default: return {
        type: op.type,
      };
    }
  }

  _typeString(context) {
    return context.storageKey.match(/\/([^/]*)\}\{/)[1];
  }

  static get is() { return 'devtools-overview'; }
}

window.customElements.define(Overview.is, Overview);
