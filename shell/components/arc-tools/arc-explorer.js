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
    arc-explorer > [banner] {
      padding: 6px 4px;
      background-color: whitesmoke;
      margin-bottom: 8px;
      border-top: 1px dotted silver;
    }
  </style>
  <!--
  <div banner>Profile Arcs</div>
  <div>{{profileArcs}}</div>
  <div banner>Shared Arcs</div>
  <div>{{sharedArcs}}</div>
  -->
  <div banner>Handles By Tag</div>
  <div style="padding: 8px;">{{handles}}</div>
  <div banner>Profile Handles</div>
  <div style="padding: 8px;">{{profiles}}</div>
  <br>
  <!--
  <div banner>Danger Zone</div>
  <div style="padding:8px;"><button on-click="_onPrivatize">Global Privatize (remove all shares)</button></div>
  <hr>
  -->
  <!--
  <button on-click="dumpDb">Dump Database</button>
  <data-explorer style="font-size: 0.6em;" object="{{data}}"></data-explorer>
  -->`
);

const templateArc = Xen.Template.createTemplate(
  `<arc-item key="{{key}}" data="{{data}}"></arc-item><br>`
);

const templateHandle = Xen.Template.createTemplate(
  `<div style="margin-bottom: 8px;">
    <span>{{name}}</span>
    <!--<a href="{{href}}" target="_blank"><i class="material-icons" style="font-size: 0.8em; vertical-align: middle;">open_in_new</i></a>-->
  </div>
  <data-explorer style="font-size: 0.8em;" object="{{data}}"></data-explorer>
  <br>`
);

class ArcExplorer extends Xen.Base {
  static get observedAttributes() { return ['user','arc']; }
  get template() { return template; }
  get host() {
    return this;
  }
  _wouldChangeProp() {
    return true;
  }
  _willReceiveProps(props) {
    this._setState({profiles: null, shared: null});
    if (props.user) {
      this._queryProfileArcs(props.user.profiles);
      this._querySharedArcs(props.user.shared);
    }
    if (props.arc) {
      this._queryHandles(props.arc);
    }
  }
  _queryProfileArcs(profiles) {
    // get a map of async function invocations,
    // when all functions complete, update state
    Promise.all(this._arcPromises(profiles)).then(profiles => this._setState({profiles}));
  }
  _querySharedArcs(shared) {
    Promise.all(this._arcPromises(shared)).then(shared => this._setState({shared}));
  }
  _arcPromises(keys) {
    // creates a map of async function invocations
    return Object.keys(keys || 0).map(async key => {
      return {
        key: key,
        data: (await db.child(`arcs/${key}`).once('value')).val()
      };
    });
  }
  async _queryHandles(arc) {
    let arcHandles = await this._renderHandles(arc._handleTags);
    //
    const find = manifest => {
      let tags = [...manifest._handleTags];
      if (manifest.imports) {
        manifest.imports.forEach(imp => tags = tags.concat(find(imp)));
      }
      return tags;
    };
    const contextHandles = await this._renderHandles(find(arc.context));
    //
    //let contextHandles = await this._renderHandles(arc.context);
    //
    this._setState({handles: arcHandles.concat(contextHandles)});
  }
  _render(props, state) {
    let list = (template, models) => { return {template,models}; };
    let arc_t = templateArc;
    let handle_t = templateHandle;
    return {
      profileArcs: list(arc_t, state.profiles),
      sharedArcs: list(arc_t, state.shared),
      data: state.data,
      profiles: list(handle_t, this._renderProfiles(state.profiles)),
      handles: list(handle_t, state.handles || [])
    };
  }
  _renderProfiles(profiles) {
    let result = [];
    profiles && profiles.forEach(({key, data}) => {
      let href = `${location.origin}/${location.pathname}?amkey=${key}`;
      let handles = data.views;
      Object.keys(handles || {}).forEach(name => {
        let {metadata: {tags}, values} = handles[name];
        if (values) {
          values = values.length ? values.map(v => v.rawData) : values.rawData;
        }
        let data = {
          tags: tags ? tags.join(',') : '',
          values
        };
        /*
        if (data.metadata) {
          data.metadata.type = '<redacted>';
        }
        */
        result.push({name, data, href});
      });
    });
    return result;
  }
  async _renderHandles(handles) {
    let result = [];
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
  dumpDb() {
    db.child('arcs').once('value').then(s => {
      this._setState({data: s.val()});
    });
  }
}
customElements.define("arc-explorer", ArcExplorer);
