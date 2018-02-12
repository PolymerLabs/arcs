/*
@license
Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

import "../data-explorer.js";
import Xen from '../xen/xen.js';

const template = Xen.Template.createTemplate(
  `<style>
    handle-explorer > [banner] {
      padding: 6px 4px;
      background-color: whitesmoke;
      margin-bottom: 8px;
      border-top: 1px dotted silver;
    }
  </style>

  <div banner>Arc Handles</div>
  <div style="padding: 8px;">{{arcHandles}}</div>

  <div banner>Context Handles</div>
  <div style="padding: 8px;">{{contextHandles}}</div>`
);

const handleTemplate = Xen.Template.createTemplate(
  `<!--<div style="margin-bottom: 8px;">
    <span>{{name}}</span>
    <a href="{{href}}" target="_blank"><i class="material-icons" style="font-size: 0.8em; vertical-align: middle;">open_in_new</i></a>
  </div>-->
  <data-explorer style="font-size: 0.8em;" object="{{data}}"></data-explorer>
  <br>`
);

class HandleExplorer extends Xen.Base {
  static get observedAttributes() { return ['arc']; }
  get template() {
    return template;
  }
  get host() {
    return this;
  }
  _wouldChangeProp() {
    return true;
  }
  _willReceiveProps(props) {
    this._setState({arcHandles: null, contextHandles: null});
    if (props.arc) {
      this._queryHandles(props.arc);
    }
  }
  async _queryHandles(arc) {
    const arcHandles = await this._digestHandles(arc._handleTags);
    const find = manifest => {
      let tags = [...manifest._handleTags];
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
        let values = `(don't know how to dereference)`;
        if (handle.toList) {
          const list = await handle.toList();
          values = list.map(item => item.rawData);
        } else {
          values = await handle.get();
        }
        const data = {
          name: handle.name,
          tags: tags ? [...tags].join(', ') : '',
          id: handle.id,
          //values: JSON.stringify(handle.toList ? await handle.toList() : `await handle.get()`, null, '  ')
          values
        };
        let moniker = handle.id.split(':').pop();
        result.push({tags: data.tags, data, name: handle.name || data.tags || moniker});
      }
    }
    return result;
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
}
customElements.define("handle-explorer", HandleExplorer);
