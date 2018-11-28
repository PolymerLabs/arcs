/*
@license
Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

import Xen from '../../../../modalities/dom/components/xen/xen.js';
import Firebase from '../../../lib/firebase.js';
import Arcs from '../../../lib/arcs.js';
import '../background-arcs/bg-arc.js';
import {schemas} from '../sharing/schemas.js';

// DeviceClient object supplied externally, otherwise a fake
const DeviceClient = window.DeviceClient || {
  entityArcAvailable() {
  },
  foundSuggestions(suggestions) {
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
  receiveEntity(entity) {
    //console.log('ShellApi::receiveEntity:', entity);
    if (ShellApi.pipe) {
      ShellApi.pipe._receiveEntity(entity);
    } else {
      ShellApi.pendingEntity = entity;
    }
  },
  chooseSuggestion(suggestion) {
    if (ShellApi.pipe) {
      ShellApi.pipe._chooseSuggestion(suggestion);
    }
  },
  openLauncher() {
    if (ShellApi.pipe) {
      ShellApi.pipe._openLauncher();
    }
  }
};

const template = Xen.Template.html`
  <bg-arc userid="{{userid}}" key="{{key}}" context="{{context}}" manifest="{{manifest}}" on-arc="_onArc"></bg-arc>
`;

const log = Xen.logFactory('DeviceClientPipe', '#a01a01');

class DeviceClientPipe extends Xen.Debug(Xen.Base, log) {
  static get observedAttributes() {
    return ['context', 'userid', 'metaplans', 'suggestions'];
  }
  get template() {
    return template;
  }
  _update({context, userid, metaplans, suggestions}, state) {
    if (userid) {
      state.key = `${userid}-pipes`;
      state.manifest = `import '${window.arcsPath}/artifacts/Pipes/Pipes.recipes'`;
    }
    if (state.arc && !state.registered) {
      state.registered = true;
      ShellApi.registerPipe(this);
      log('registerPipe');
    }
    if (context && state.lastEntity && metaplans && metaplans.suggestions) {
      if (state.lastEntity.type !== 'search') {
        this._updateMetaplans(metaplans, context, state.lastEntity);
      }
    }
    if (context && state.lastEntity && suggestions) {
      if (state.lastEntity.type === 'search') {
        state.lastEntity.type = 'usedup';
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
    if (state.entity) {
      if (state.arc && !state.stores) {
        state.stores = true;
        this._requireFindShowStore(state.arc);
        this._requireFindShowcaseArtistStore(state.arc);
        this._requireShowcasePlayRecordStore(state.arc);
      }
      if (state.stores) {
        this._updateEntity(state.entity, state);
        state.lastEntity = state.entity;
        state.entity = null;
      }
    }
  }
  _render(props, state) {
    return [props, state];
  }
  _updateSearch(entity) {
    this._fire('search', entity.query);
  }
  _updateEntity(entity, state) {
    const stores = {
      tv_show: state.findShowStore,
      artist: state.findShowcaseArtistStore,
      play_record: state.playRecordStore
    };
    const store = stores[entity.type];
    if (store) {
      state.entity = entity;
      this._setPipedEntity(store, entity);
    }
  }
  _setPipedEntity(store, rawData) {
    //const id = store.generateID();
    const id = `${Date.now()}-${Math.floor(Math.random()*1e6)}`;
    const entity = {id, rawData};
    log('storing piped entity', entity);
    store.set(entity);
    // TODO(sjmiles): appears that modification to Context store isn't triggering planner, so
    // force replanning here
    this._fire('replan');
  }
  async _requireFindShowStore(context) {
    const options = {
      schema: schemas.TVMazeFind
    };
    const store = this._requireStore(context, options);
    this._setState({findShowStore: store});
  }
  async _requireFindShowcaseArtistStore(context) {
    const options = {
      schema: schemas.ShowcaseArtistFind
    };
    const store = this._requireStore(context, options);
    this._setState({findShowcaseArtistStore: store});
  }
  async _requireShowcasePlayRecordStore(context) {
    const options = {
      schema: schemas.ShowcasePlayRecord
    };
    const store = this._requireStore(context, options);
    this._setState({playRecordStore: store});
  }
  _requireStore(context, options) {
    const schemaType = Arcs.Type.fromLiteral(options.schema);
    const typeOf = options.isCollection ? schemaType.collectionOf() : schemaType;
    const store = (context.findStoresByType(typeOf) || [])[0];
    //const store = await Stores.createContextStore(context, options);
    log(`${store ? 'found' : 'MISSING'} ${options.schema.data.names[0]}`);
    return store;
  }
  _updateMetaplans(metaplans, context, entity) {
    // find metaplans that use #piped stores
    const piped = metaplans.suggestions.filter(({plan}) => plan._handles.some(handle => {
      const tags = context.findStoreTags(context.findStoreById(handle._id));
      // TODO(sjmiles): return value of `findStoreTags` is sometimes a Set, sometimes an Array
      return Boolean(tags && (tags.has && tags.has('piped') || tags.includes('piped')));
    }));
    if (piped.length) {
      log('piped metaplans', piped);
      const demoPlan = {
        tv_show: 'TVMazeUberDemo',
        artist: 'ShowcaseArtistDemo',
        play_record: 'ShowcasePlayRecordDemo'
      }[entity.type];
      if (demoPlan) {
        const metaplan = piped.find(metaplan => metaplan.plan.name === demoPlan);
        log(`searching metaplans for [${demoPlan}] found`, metaplan);
        if (metaplan) {
          // reduce plans to descriptionText
          const suggestions = [metaplan].map(metaplan => metaplan.descriptionText);
          log('piped suggestions', suggestions);
          DeviceClient.foundSuggestions(JSON.stringify(suggestions));
        }
      }
    }
  }
  _receiveEntity(entityJSON) {
    log('receiveEntity:', entityJSON);
    const entity = JSON.parse(entityJSON);
    this._setState({entity});
  }
  _chooseSuggestion(suggestion) {
    const {metaplans} = this._props;
    if (metaplans && metaplans.suggestions) {
      const metaplan = metaplans.suggestions.find(suggestion => suggestion.descriptionText === suggestion);
      log('piped plan', metaplan);
      this._fire('suggestion', metaplan);
    }
  }
  _openLauncher() {
    this._fire('key', 'launcher');
  }
  _onArc(e, arc) {
    log('got background arc', arc);
    this._setState({arc});
    const {key} = this._state;
    // TODO(sjmiles): mark this arc as shared
    Firebase.db.child(`arcs/${key}/metadata`).update({/*description: 'Piped Data', */share: 2});
  }
}
customElements.define('device-client-pipe', DeviceClientPipe);

//ShellApi.receiveEntity('{"type": "artist", "name": "alice in chains"}')
