/**
 * @license
 * Copyright (c) 2016 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Xen} from '../../../lib/components/xen.js';
import {generateId} from '../lib/modalities/dom/components/generate-id.js';

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

// abstract entity sink
const PipeSink = class {
  constructor() {
    this.sink = null;
    this.pending = [];
  }
  receiveEntityJSON(entityJSON) {
    try {
      const entity = JSON.parse(entityJSON);
      entity.id = generateId();
      this.receiveEntity(entity);
      return entity.id;
    } catch (x) {
      console.warn(x);
    }
  }
  receiveEntity(entity) {
    if (this.sink) {
      this.sink(entity);
    } else {
      this.pending.push(entity);
    }
  }
  registerSink(sink) {
    this.sink = sink;
    this.pending.forEach(entity => this.receiveEntity(entity));
  }
};

// public handshake object
const ShellApi = window.ShellApi = {
  observeSink: new PipeSink(),
  receiveSink: new PipeSink(),
  // attach a shell-aware agent
  registerPipe(pipe) {
    //console.log('ShellApi::registerPipe');
    ShellApi.pipe = pipe;
    ShellApi.receiveSink.registerSink(entity => pipe.receiveEntity(entity));
    ShellApi.observeSink.registerSink(entity => pipe.observeEntity(entity));
  },
  // receive information from external pipe
  receiveEntity(entityJSON) {
    ShellApi.receiveSink.receiveEntityJSON(entityJSON);
  },
  observeEntity(entityJSON) {
    ShellApi.observeSink.receiveEntityJSON(entityJSON);
  },
  queryEntities(queryJSON) {
    if (ShellApi.pipe) {
      ShellApi.pipe.queryObservedEntities(queryJSON);
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
    return ['context', 'storage', 'suggestions', 'arc', 'pipearc'];
  }
  update({context, suggestions, arc, pipearc}, state) {
    if (pipearc && !state.pipeStore) {
      state.pipeStore = pipearc._stores[0];
      if (!state.pipeStore) {
        // retry
        log('looking for pipestore...');
        setTimeout(() => this._invalidate(), 50);
      } else {
        log('got pipeStore', state.pipeStore);
      }
    }
    if (!state.registered && state.pipeStore) {
      state.registered = true;
      ShellApi.registerPipe(this);
      log('registerPipe');
    }
    if (state.entity) {
      this.updateEntity(state.entity);
      this.state = {entity: null};
    }
    if (state.observe && state.pipeStore) {
      this.updateObserved(state.observe, state.pipeStore);
      this.state = {observe: null};
    }
    //
    state.suggestions = null;
    if (arc && suggestions && suggestions.length > 0) {
      if (suggestions.arcid === String(arc.id)) {
        log('promoting suggestions for ', arc.id.toString());
        state.suggestions = suggestions;
      }
    }
    if (context && state.suggestions) {
      if (state.spawned) {
        const suggestion = state.suggestions[0];
        log('active recipe:', arc.activeRecipe.toString());
        log('suggested recipe:', suggestion.plan.toString());
        log(suggestion.descriptionText, suggestion);
        this.state = {spawned: false, staged: true, suggestions: null};
        this.fire('suggestion', suggestion);
      }
      if (state.staged && state.suggestions) {
         const texts = state.suggestions.map(suggestion => String(suggestion.descriptionText));
         state.suggestions = null;
         const unique = [...new Set(texts)];
        log(arc.activeRecipe.toString());
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
      const id = `user-piped-${entity.id}`;
      this.fire('spawn', {id, manifest, description: `(from device) ${entity.name || entity.type}`});
      state = {spawned: id};
    }
    // TODO(sjmiles): we need to know when suggestions we receive are up to date
    // relative to the changes we just made
    // instead, for now, wait 1s for planning to take place before updating state
    this.state = {spawned: false, staged: false, suggestions: null};
    setTimeout(() => this.state = state, 1000);
  }
  updateObserved(entity, store) {
    log('storing observed entity', entity);
    store.store({id: entity.id, rawData: entity}, [generateId()]);
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
  observeEntity(entity) {
    if (!entity.timestamp) {
      entity.timestamp = Date.now();
    }
    this.state = {observe: entity};
  }
  receiveEntity(entity) {
    if (entity.type === 'hack.com.google.android.apps.maps') {
      this.suggestFromObservations({type: 'address'});
    } else {
      entity.type = entity.type.replace(/\./g, '_');
      this.state = {entity};
    }
  }
  async suggestFromObservations(query) {
    const results = await this.queryObservedEntities({type: 'address'});
    const sorted = results.sort((a, b) => (b.rawData.timestamp || 0) - (a.rawData.timestamp || 0));
    //console.log(sorted);
    const sliced = sorted.slice(0, 3);
    const json = JSON.stringify(sliced.map(e => e.rawData));
    DeviceClient.foundSuggestions(json);
  }
  async queryObservedEntities(query) {
    const {pipeStore} = this.state;
    if (pipeStore) {
      const entities = await pipeStore.toList();
      const results = entities.filter(entity => entity.rawData.type === query.type);
      return results;
    }
  }
  reset() {
    this.fire('reset');
  }
}

customElements.define('device-client-pipe', DeviceClientPipe);

const buildEntityManifest = entity => `
import 'https://$particles/Pipes/Pipes.arcs'

resource PipeEntityResource
  start
  [{"type": "${entity.type}", "name": "${entity.name}"}]

store LivePipeEntity of PipeEntity 'LivePipeEntity' @0 #pipe_entity #pipe_${entity.type} in PipeEntityResource

recipe Pipe
  use 'LivePipeEntity' #pipe_entity #pipe_${entity.type} as pipe
  Trigger
    pipe = pipe
`;
