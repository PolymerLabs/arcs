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
import {Type} from '../../../env/arcs.js';
import {schemas} from './schemas.js';

/*
  Examples:

  ShellApi.receiveEntity(`{"type": "search", "query": "restaurants"}`)
  ShellApi.receiveEntity(`{"type": "tv_show", "name": "bodyguard"}`)
  ShellApi.receiveEntity(`{"type": "artist", "name": "stone sour"}`)
  ShellApi.receiveEntity(`{"type": "playRecord", ?}`)

  ShellApi.receiveSuperEntity(`{"id": "test", "type": "tv_show", "name": "bodyguard"}`)
*/

// TODO(sjmiles): blunt
const demoPlans = {
  tv_show: 'TVMazeDemo',
  artist: 'ShowcaseArtistDemo',
  play_record: 'ShowcasePlayRecordDemo'
};

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
  receiveSuperEntity(entity) {
    //console.log('ShellApi::receiveEntity:', entity);
    if (ShellApi.pipe) {
      ShellApi.pipe._receiveSuperEntity(entity);
    } else {
      ShellApi.pendingSuperEntity = entity;
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
  <web-arc id="pipes" env="{{env}}" storage="{{storage}}" config="{{config}}" manifest="{{manifest}}" context="{{context}}" on-arc="onArc"></web-arc>
`;

const log = Xen.logFactory('DeviceClientPipe', '#a01a01');

class DeviceClientPipe extends Xen.Debug(Xen.Async, log) {
  static get observedAttributes() {
    return ['env', 'context', 'userid', 'storage', 'metaplans', 'suggestions'];
  }
  get template() {
    return template;
  }
  _update({userid, context, metaplans, suggestions}, state) {
    if (userid && !state.config) {
      state.config = {
        id: `${userid}-pipes`,
        manifest: `import 'https://$particles/Pipes/Pipes.recipes'`
      };
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
    if (state.entity && state.arc && state.entity.type !== 'search') {
      if (!state.stores) {
        state.stores = true;
        this._requireFindShowStore(state.arc);
        //this._requireFindShowcaseArtistStore(state.arc);
        //this._requireShowcasePlayRecordStore(state.arc);
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
    this.fire('search', entity.query);
  }
  _updateEntity(entity, state) {
    const store = this._getEntityStore(entity);
    if (store) {
      state.entity = entity;
      this._setPipedEntity(store, entity);
    }
  }
  _getEntityStore(entity) {
    const stores = {
      tv_show: this.state.findShowStore,
      artist: this.state.findShowcaseArtistStore,
      play_record: this.state.playRecordStore
    };
    const store = stores[entity.type];
    return store;
  }
  _setPipedEntity(store, rawData) {
    //const id = store.generateID();
    const id = `${Date.now()}-${Math.floor(Math.random()*1e6)}`;
    const entity = {id, rawData};
    log('storing piped entity', entity);
    store.set(entity);
    // TODO(sjmiles): appears that modification to Context store isn't triggering planner, so
    // force replanning here
    //this._fire('replan');
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
    const schemaType = Type.fromLiteral(options.schema);
    const typeOf = options.isCollection ? schemaType.collectionOf() : schemaType;
    const store = (context.findStoresByType(typeOf) || [])[0];
    //const store = await Stores.createContextStore(context, options);
    log(`${store ? 'found' : 'MISSING'} ${options.schema.data.names[0]}`);
    return store;
  }
  _updateMetaplans(metaplans, context, entity) {
    // find metaplans that use #piped stores
    const piped = metaplans.suggestions.filter(({plan}) => plan._handles.some(handle => {
      if (handle._id) {
        // locate store for this handle
        const store = context.findStoreById(handle._id);
        // get the tags for the store
        const tags = context.findStoreTags(store);
        tags && console.log('tags for store: ', handle._id, tags);
        // TODO(sjmiles): return value of `findStoreTags` is sometimes a Set, sometimes an Array
        return Boolean(tags && (tags.has && tags.has('piped') || tags.includes('piped')));
      }
    }));
    //
    if (piped.length) {
      log('piped metaplans', piped);
      const demoPlan = demoPlans[entity.type];
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
  _receiveSuperEntity(entityJSON) {
    log('receiveSuperEntity:', entityJSON);
    const entity = JSON.parse(entityJSON);
    const id = entity.id;
    //
    const manifest = `
import 'https://$particles/Pipes/TVMazePipe.recipes'

resource FindShowResource
  start
  [{"name": "${entity.name}"}]

store FindShow of TVMazeFind 'findShow' in FindShowResource

recipe CustomPipe
  use 'findShow' as findShow
  create #piped #tv_show as show
  TVMazeFindShow
    find = findShow
    show = show
    `;
    //
    const webArc = this._dom.root.appendChild(document.createElement('web-arc'));
    webArc.id = id;
    webArc.env = this.props.env;
    webArc.storage = this.props.storage;
    webArc.context = this.props.context;
    webArc.config = {id, manifest};
    console.log(webArc);
  }
  _chooseSuggestion(suggestion) {
    // const {metaplans} = this._props;
    // if (metaplans && metaplans.plans) {
    //   const metaplan = metaplans.plans.find(metaplan => metaplan.descriptionText === suggestion);
    //   log('piped plan', metaplan);
    //   this._fire('suggestion', metaplan);
    // }
  }
  _openLauncher() {
    // this._fire('key', 'launcher');
  }
  onArc(e, arc) {
    this.state = {arc};
    this.fire('arc', arc);
  }
}
customElements.define('device-client-pipe', DeviceClientPipe);

//ShellApi.receiveEntity('{"type": "artist", "name": "alice in chains"}')
