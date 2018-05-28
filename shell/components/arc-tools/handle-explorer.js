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

  <div banner>Arc Handles</div>
  <div style="padding: 8px;">{{arcHandles}}</div>

  <div banner>Context Handles</div>
  <div style="padding: 8px;">{{contextHandles}}</div>
`;

const handleTemplate = html`
  <!--<div style="margin-bottom: 8px;">
    <span>{{name}}</span>
    <a href="{{href}}" target="_blank"><i class="material-icons" style="font-size: 0.8em; vertical-align: middle;">open_in_new</i></a>
  </div>-->
  <data-explorer style="font-size: 0.8em;" object="{{data}}"></data-explorer>
  <br>
`;

class HandleExplorer extends Xen.Base {
  static get observedAttributes() { return ['arc']; }
  get template() {
    return template;
  }
  _wouldChangeProp() {
    return true;
  }
  _willReceiveProps(props, state) {
    state.needsQuery = true;
  }
  _update(props, state) {
    if (props.arc && state.needsQuery) {
      state.needsQuery = false;
      //this._setState({arcHandles: null, contextHandles: null});
      this._queryHandles(props.arc);
    }
  }
  _render(props, state) {
    return {
      arcHandles: {
        template: handleTemplate,
        models: state.arcHandles
      },
      contextHandles: {
        template: handleTemplate,
        models: state.contextHandles
      }
    };
  }
  async _queryHandles(arc) {
    const arcHandles = await this._digestHandles(arc._storeTags);
    const find = manifest => {
      let tags = [...manifest._storeTags];
      if (manifest.imports) {
        manifest.imports.forEach(imp => tags = tags.concat(find(imp)));
      }
      return tags;
    };
    const contextHandles = await this._digestHandles(find(arc.context));
    this._setState({arcHandles, contextHandles});
  }
  async _digestHandles(handles) {
    const result = [];
    if (handles) {
      for (let [handle, tags] of handles) {
        //if (handle.name === null) {
        //  continue;
        //}
        let values = `(don't know how to dereference)`;
        if (handle.toList) {
          const list = await handle.toList();
          values = list.map(item => item.rawData);
        } else if (handle.get) {
          values = await handle.get();
        } else {
          // lint?
        }
        const data = {
          name: handle.name,
          tags: tags ? [...tags].join(', ') : '',
          id: handle.id,
          storage: handle.storageKey,
          type: handle.type,
          //values: JSON.stringify(handle.toList ? await handle.toList() : `await handle.get()`, null, '  ')
          values
        };
        if (handle.description) {
          data.description = handle.description;
        }
        let moniker = handle.id.split(':').pop();
        result.push({tags: data.tags, data, name: handle.name || data.tags || moniker});
      }
    }
    return result;
  }
  _onUpdate() {
    this._setState({needsQuery: true});
  }
}
customElements.define('handle-explorer', HandleExplorer);
