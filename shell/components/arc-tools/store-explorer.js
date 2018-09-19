/*
@license
Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

import '../data-explorer.js';
import Xen from '../xen/xen.js';

// notes:
// Xen memoizes template parsing when given a <template> instead of String
// Xen.Template.html converts a String to a <template>
// we assign to `html` so syntax-highlighters treat the literals as HTML
const html = Xen.Template.html;

const template = html`
  <style>
    button {
      margin: 8px;
    }
    [banner] {
      padding: 6px 4px;
      background-color: whitesmoke;
      margin-bottom: 8px;
      border-top: 1px dotted silver;
    }
  </style>

  <div><button on-click="_onUpdate">Update</button></div>

  <div banner>Arc Stores</div>
  <div style="padding: 8px;">{{arcStores}}</div>

  <div banner>Context Stores</div>
  <div style="padding: 8px;">{{contextStores}}</div>
`;

const storeTemplate = html`
  <div style="border-bottom: 1px dashed silver; padding-bottom: 8px; margin-bottom: 8px;">
    <data-explorer style="font-size: 0.8em;" object="{{data}}"></data-explorer>
  </div>
`;

class StoreExplorer extends Xen.Base {
  static get observedAttributes() { return ['arc', 'context']; }
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
      if (arc) {
        state.needsQuery = false;
        this._queryArcStores(arc);
      }
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
      let tags = [...manifest._storeTags];
      if (manifest.imports) {
        manifest.imports.forEach(imp => tags = tags.concat(find(imp)));
      }
      return tags;
    };
    const contextStores = await this._digestStores(find(context));
    this._setState({contextStores});
  }
  async _queryArcStores(arc) {
    const arcStores = await this._digestStores(arc._storeTags, true);
    this._setState({arcStores});
  }
  async _digestStores(stores, hideNamed) {
    const result = [];
    if (stores) {
      for (let [store, tags] of stores) {
        //if (store.name === null) {
        if (hideNamed && store.name) {
          continue;
        }
        let malformed = false;
        let values = `(don't know how to dereference)`;
        if (store.toList) {
          const list = await store.toList();
          values = {};
          list.forEach(item => {
            if (item) {
              values[item.id] = item.rawData;
            } else if (!malformed) {
              malformed = true;
              console.warn('malformed store', tags, store);
            }
          });
          //values = list.map(item => item.rawData);
        } else if (store.get) {
          values = await store.get();
        } else {
          // lint?
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
        let moniker = store.id.split(':').pop();
        if (!store.type || store.type.tag !== 'Interface') {
          const label = data.name || `${store.type.toPrettyString()}`; // (type)`;
          result.push({tags: data.tags, data: {[label]: data}, name: store.name || data.tags || moniker});
        }
      }
    }
    return result;
  }
  _onUpdate() {
    this._setState({needsQuery: true});
  }
}
customElements.define('store-explorer', StoreExplorer);
