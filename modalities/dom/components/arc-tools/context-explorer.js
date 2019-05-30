/**
 * @license
 * Copyright (c) 2016 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import '../elements/data-explorer.js';
import Xen from '../xen/xen.js';

// notes:
// Xen memoizes template parsing when given a <template> instead of String
// Xen.Template.html converts a String to a <template>
// we assign to `html` so syntax-highlighters treat the literals as HTML
const html = Xen.Template.html;

const template = html`

  <div><button on-click="_onUpdate">Update</button></div>
  <br>
  <div>{{contextStores}}</div>
`;

const storeTemplate = html`
  <div style="border-bottom: 1px dashed silver; padding-bottom: 8px; margin-bottom: 8px;">
    <data-explorer style="font-size: 0.8em;" expand object="{{data}}"></data-explorer>
  </div>
`;

customElements.define('context-explorer', class extends Xen.Base {
  static get observedAttributes() { return ['context']; }
  get template() {
    return template;
  }
  _wouldChangeProp() {
    return true;
  }
  _willReceiveProps(props, state) {
    state.needsQuery = true;
  }
  _update({arc, context}, state) {
    if (state.needsQuery) {
      if (context) {
        state.needsQuery = false;
        this._queryContextStores(context);
      }
    }
  }
  _render(props, state) {
    return {
      arcStores: {
        template: storeTemplate,
        models: state.arcStores
      },
      contextStores: {
        template: storeTemplate,
        models: state.contextStores
      }
    };
  }
  async _queryContextStores(context) {
    const find = manifest => {
      let tags = [...manifest.storeTags];
      if (manifest.imports) {
        manifest.imports.forEach(imp => tags = tags.concat(find(imp)));
      }
      return tags;
    };
    const contextStores = await this._digestStores(find(context));
    this._setState({contextStores});
  }
  async _digestStores(stores) {
    const result = [];
    if (stores) {
      for (const [store, tags] of stores) {
        //if (store.name === null) {
        //  continue;
        //}
        let values;
        if (store.toList) {
          const list = await store.toList();
          values = {};
          list.forEach(item => values[item.id] = item.rawData);
          //values = list.map(item => item.rawData);
        } else if (store.get) {
          values = await store.get();
        } else {
          values = `(don't know how to dereference)`;
        }
        const data = {
          name: store.name,
          tags: tags ? [...tags].join(', ') : '',
          id: store.id,
          storage: store.storageKey,
          type: store.type,
          //values: JSON.stringify(store.toList ? await store.toList() : `await store.get()`, null, '  ')
          values
        };
        if (store.description) {
          data.description = store.description;
        }
        const moniker = store.id.split(':').pop();
        if (!store.type || store.type.tag !== 'Interface') {
          const label = data.name || `unnamed (${store.type.toPrettyString()})`;
          result.push({tags: data.tags, data: {[label]: data}, name: store.name || data.tags || moniker});
        }
      }
    }
    return result;
  }
  _onUpdate() {
    this._setState({needsQuery: true});
  }
});
