/*
@license
Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

import {Xen} from '../../../lib/xen.js';
import {generateId} from '../../../../modalities/dom/components/generate-id.js';
import {getEntityManifest} from './pipe-sinks.js';

/*
  Examples:

  working:

  [id =] ShellApi.receiveEntity(`{"type": "tv_show", "name": "killing eve"}`)
  ShellApi.chooseSuggestion(`Killing Eve is on BBC America at 20:00 on Sunday.`)

  [id =] ShellApi.receiveEntity(`{"type": "artist", "name": "stone sour"}`)
  ShellApi.chooseSuggestion(`Learn more about Stone Sour.`)

  not working (yet):

  ShellApi.receiveEntity(`{"type": "search", "query": "restaurants"}`)
  ShellApi.receiveEntity(`{"type": "playRecord", ?}`)

*/

// DeviceClient object supplied externally, otherwise a fake
const DeviceClient = window.DeviceClient || {
  entityArcAvailable() {
  },
  foundSuggestions(suggestions) {
  },
  foundSuperSuggestions(info) {
    log(`DeviceClient:foundSuperSuggestions: `, info);
  }
};

// public handshake object
const ShellApi = window.ShellApi = {
  // attach a shell-aware agent
  registerPipe(pipe) {
    //console.log('ShellApi::registerPipe');
    ShellApi.pipe = pipe;
    if (ShellApi.pendingEntity) {
      ShellApi.receiveEntity(ShellApi.pendingEntity);
    }
  },
  // receive information from external pipe
  receiveEntity(entityJSON) {
    try {
      const entity = JSON.parse(entityJSON);
      entity.id = generateId();
      //console.log('ShellApi::receiveEntity:', entity);
      if (ShellApi.pipe) {
        ShellApi.pipe.receiveEntity(entity);
      } else {
        ShellApi.pendingEntity = entity;
      }
      return entity.id;
    } catch (x) {
      console.warn(x);
    }
  },
  chooseSuggestion(suggestion) {
    if (ShellApi.pipe) {
      ShellApi.pipe.chooseSuggestion(suggestion);
    }
  },
  reset() {
    if (ShellApi.pipe) {
      ShellApi.pipe.reset();
    }
  }
};

// const template = Xen.Template.html`
//   <web-arc id="pipes" env="{{env}}" storage="{{storage}}" context="{{context}}" config="{{config}}" manifest="{{manifest}}" on-arc="onArc"></web-arc>
// `;

const log = Xen.logFactory('DeviceClientPipe', '#a01a01');

class DeviceClientPipe extends Xen.Debug(Xen.Async, log) {
  static get observedAttributes() {
    return ['env', 'context', 'userid', 'storage', 'suggestions'];
  }
  // get template() {
  //   return template;
  // }
  _update({userid, context, suggestions}, state) {
    // if (userid && !state.config) {
    //   state.config = {
    //     id: `${userid}-pipes`,
    //     manifest: `import 'https://$particles/Pipes/Pipes.recipes'`
    //   };
    // }
    if (/*state.arc &&*/ !state.registered) {
      state.registered = true;
      ShellApi.registerPipe(this);
      log('registerPipe');
    }
    if (context && suggestions) {
      if (state.spawned || (state.lastEntity && state.lastEntity.type)) {
        if (state.lastEntity) {
          state.lastEntity.type = null;
        }
        const texts = suggestions.map(suggestion => suggestion.descriptionText);
        log('piped suggestions', texts);
        DeviceClient.foundSuggestions(JSON.stringify(texts));
      }
    }
    if (state.entity && state.entity.type === 'search') {
      this._updateSearch(state.entity);
      state.lastEntity = state.entity;
      state.entity = null;
    }
  }
  _render(props, state) {
    return [props, state];
  }
  _updateSearch(entity) {
    this.fire('search', entity.query);
  }
  onArc(e, arc) {
    this.state = {arc};
    this.fire('arc', arc);
  }
  chooseSuggestion(suggestionText) {
    const {suggestions} = this.props;
    if (suggestions) {
      const suggestion = suggestions.find(suggestion => suggestion.descriptionText === suggestionText);
      log('piped plan', suggestion);
      this.fire('suggestion', suggestion);
    }
  }
  receiveEntity(entity) {
    const manifest = getEntityManifest(entity);
    if (manifest) {
      const id = `${this.props.userid}-piped-${entity.id}`;
      this.fire('spawn', {id, manifest, description: `(from device) ${entity.name}`});
      this.state = {spawned: true};
    }
  }
  reset() {
    this.fire('reset');
  }
}
customElements.define('device-client-pipe', DeviceClientPipe);


