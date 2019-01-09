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

/*
  Examples:

  working:

  ShellApi.receiveEntity(`{"type": "tv_show", "name": "killing eve"}`)
  ShellApi.chooseSuggestion(`Killing Eve is on BBC America at 20:00 on Sunday.`)

  ShellApi.receiveEntity(`{"type": "artist", "name": "stone sour"}`)
  ShellApi.chooseSuggestion(`Learn more about Stone Sour.`)

  ShellApi.receiveEntity(`{"type": "search", "query": "restaurants"}`)
  ShellApi.chooseSuggestion(`Find restaurants near you.`)

  not working (yet):

  ShellApi.receiveEntity(`{"type": "playRecord", ?}`)

*/

// DeviceClient object supplied externally, otherwise a fake
const DeviceClient = window.DeviceClient || {
  entityArcAvailable() {
  },
  foundSuggestions(suggestionJSON) {
    log(`> DeviceClient.foundSuggestions(${suggestionJSON})`);
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

const log = Xen.logFactory('DeviceClientPipe', '#a01a01');

class DeviceClientPipe extends Xen.Debug(Xen.Async, log) {
  static get observedAttributes() {
    return ['context', 'userid', 'storage', 'suggestions'];
  }
  update({userid, context, suggestions}, state) {
    if (!state.registered) {
      state.registered = true;
      ShellApi.registerPipe(this);
      log('registerPipe');
    }
    if (userid && state.entity) {
      this.updateEntity(state.entity);
      this.state = {entity: null};
    }
    if (context && suggestions && suggestions.length > 0) {
      if (state.spawned) {
        log(suggestions[0]);
        this.state = {spawned: false, staged: true, suggestions};
        this.fire('suggestion', suggestions[0]);
      }
      if (state.staged && state.suggestions !== suggestions) {
         const texts = suggestions.map(suggestion => suggestion.descriptionText);
         const unique = [...new Set(texts)];
         DeviceClient.foundSuggestions(JSON.stringify(unique));
         log(`try\n\t> ShellApi.chooseSuggestion('${unique[0]}')`);
      }
    }
  }
  render(props, state) {
    return [props, state];
  }
  updateEntity(entity) {
    let state;
    if (entity.type === 'search') {
      this.fire('search', entity.query);
      state = {staged: true};
    } else {
      const manifest = buildEntityManifest(entity);
      log(manifest);
      const id = `${this.props.userid}-piped-${entity.id}`;
      this.fire('spawn', {id, manifest, description: `(from device) ${entity.name}`});
      state = {spawned: true};
    }
    // TODO(sjmiles): we need to know when suggestions we receive are up to date
    // relative to the changes we just made
    // instead, for now, wait 1s for planning to take place before updating state
    setTimeout(() => this.state = state, 1000);
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
    this.state = {entity};
  }
  reset() {
    this.fire('reset');
  }
}

customElements.define('device-client-pipe', DeviceClientPipe);

const buildEntityManifest = entity => `
import 'https://$particles/Pipes/Pipes.recipes'

resource PipeEntityResource
  start
  [{"type": "${entity.type}", "name": "${entity.name}"}]

store LivePipeEntity of PipeEntity 'LivePipeEntity' @0 #pipe_entity #pipe_${entity.type} in PipeEntityResource

recipe Pipe
  use 'LivePipeEntity' #pipe_entity #pipe_${entity.type} as pipe
  PipeEntityReceiver
    pipe = pipe
`;
