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
    return ['context', 'userid', 'storage', 'suggestions', 'pipearc'];
  }
  update({userid, context, suggestions, pipearc}, state) {
    if (pipearc && !state.pipeStore) {
      state.pipeStore = pipearc._stores[0];
      log('got pipeStore', state.pipeStore);
      // retry
      if (!state.pipeStore) {
        setTimeout(() => this._invalidate(), 50);
      }
    }
    if (!state.registered && state.pipeStore) {
      state.registered = true;
      ShellApi.registerPipe(this);
      log('registerPipe');
    }
    if (userid && state.entity) {
      this.updateEntity(state.entity);
      this.state = {entity: null};
    }
    if (state.observe && state.pipeStore) {
      this.updateObserved(state.observe, state.pipeStore);
      this.state = {observe: null};
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
  receiveEntity(entity) {
    if (entity.type === 'com.google.android.apps.maps') {
      this.queryObservedEntities({type: 'address'})
        .then(results => DeviceClient.foundSuggestions(JSON.stringify(results.slice(0, 3).map(address => address.rawData.name))));
      return;
    }
    this.state = {entity};
  }
  observeEntity(observe) {
    this.state = {observe};
  }
  async queryObservedEntities(query) {
    const {pipeStore} = this.state;
    if (pipeStore) {
      const entities = await pipeStore.toList();
      const results = entities.filter(entity => entity.rawData.type === query.type);
      console.log(results);
      return results;
    }
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
