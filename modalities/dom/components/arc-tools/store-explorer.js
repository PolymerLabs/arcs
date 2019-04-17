/*
@license
Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

import '../elements/data-explorer.js';
import Xen from '../xen/xen.js';

// notes:
// Xen memoizes template parsing when given a <template> instead of String
// Xen.Template.html converts a String to a <template>
// we assign to `html` so syntax-highlighters treat the literals as HTML
const html = Xen.Template.html;

const template = html`
  <style>
    [toolbar] {
      margin-bottom: 8px;
      padding-left: 12px;
    }
    [toolbar] > * {
      margin-right: 16px;
    }
    [banner] {
      padding: 8px 0 8px 16px;
      background-color: whitesmoke;
    }
    [store] {
      padding: 8px 0 8px 16px;
      border-bottom: 1px dashed silver;
    }
  </style>

  <div toolbar>
    <button on-click="_onUpdate">Update</button>
  </div>

  <div banner>Arc Stores</div>
  <div>{{arcStores}}</div>

  <div banner>Context Stores</div>
  <div>{{contextStores}}</div>
`;

const storeTemplate = html`
  <div store>
    <data-explorer object="{{data}}"></data-explorer>
  </div>
`;

const nameSort = (a, b) => a.name > b.name ? 1 : a.name < b.name ? -1 : 0;

//const simpleNameOfType = type => type.getEntitySchema().names[0];

const nameOfType = type => {
  let typeName = type.getEntitySchema().names[0];
  if (type.isCollection) {
    typeName = `[${typeName}]`;
  }
  return typeName;
};

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
      let tags = [...manifest.storeTags];
      if (manifest.imports) {
        manifest.imports.forEach(imp => tags = tags.concat(find(imp)));
      }
      return tags;
    };
    const stores = await this._digestStores(find(context));
    this._setState({contextStores: stores.sort(nameSort)});
  }
  async _queryArcStores(arc) {
    const stores = await this._digestStores(arc.storeTags, true);
    this._setState({arcStores: stores.sort(nameSort)});
  }
  async _digestStores(stores, hideNamed) {
    const result = [];
    if (stores) {
      for (const [store, tags] of stores) {
        //if (store.name === null) {
        if (hideNamed && store.name && tags.length === 0) {
          continue;
        }
        if (store.type.tag === 'Interface') {
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
              console.warn('malformed store', list, tags, store);
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
          type: nameOfType(store.type), //.toString(),
          storage: store.storageKey,
          //values: JSON.stringify(store.toList ? await store.toList() : `await store.get()`, null, '  ')
          values,
          details: {
            tags: tags ? [...tags].join(', ') : '',
            id: store.id,
            type: store.type
          }
        };
        if (store.description) {
          data.description = store.description;
        }
        const moniker = store.id.split(':').pop();
        const name = store.name || data.tags || moniker;
        //const name = `${store.name || moniker}:${data.tags}`;
        const label = `${data.name || store.type.toPrettyString()} #${data.details.tags} ${data.type}`; // (type)`;
        result.push({tags: data.details.tags, data: {[label]: data}, name});
      }
    }
    return result;
  }
  _onUpdate() {
    this._setState({needsQuery: true});
  }
}
customElements.define('store-explorer', StoreExplorer);
