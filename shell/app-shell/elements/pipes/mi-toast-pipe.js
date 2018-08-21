/*
@license
Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

import Xen from '../../../components/xen/xen.js';
// TODO(sjmiles): not actually dependent on `FB`: rename and relocate) this module
import {FbStore} from '../fb-data/FbStore.js';

// MiToast object supplied externally, otherwise a mock
const MiToast = window.MiToast || {
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
      ShellApi.pipe.receiveEntity(entity);
    } else {
      ShellApi.pendingEntity = entity;
    }
  },
  chooseSuggestion(suggestion) {
    if (ShellApi.pipe) {
      ShellApi.pipe.chooseSuggestion(suggestion);
    }
  }
};

const log = Xen.logFactory('MiToastPipe', '#a01a01');

class MiToastPipe extends Xen.Debug(Xen.Base, log) {
  static get observedAttributes() {
    return ['context', 'arc', 'metaplans', 'suggestions'];
  }
  receiveEntity(entityJSON) {
    log('receiveEntity:', entityJSON);
    const entity = JSON.parse(entityJSON);
    this._setState({entity});
  }
  _update({context, arc, metaplans}, state) {
    if (arc && !state.registered) {
      state.registered = true;
      ShellApi.registerPipe(this);
      log('registerPipe');
    }
    if (!state.store && context && state.entity && state.entity.query) {
      this._requireStore(context);
    }
    if (state.store && state.entity && state.entity.query) {
      state.store.set({
        id: 'piped-store',
        rawData: state.entity
      });
      // TODO(sjmiles): appears that modification to Context store isn't triggering planner, so
      // force replanning here
      document.querySelector('app-shell').shadowRoot.querySelector('arc-planner')._state.planificator._onDataChange();
    }
    if (!state.findStore && context && state.entity && state.entity.name) {
      this._requireFindStore(context);
    }
    if (state.findStore && state.entity && state.entity.name) {
      state.findStore.set({
        id: 'piped-store',
        rawData: state.entity
      });
      // TODO(sjmiles): appears that modification to Context store isn't triggering planner, so
      // force replanning here
      document.querySelector('app-shell').shadowRoot.querySelector('arc-planner')._state.planificator._onDataChange();
    }
    if (metaplans && context) {
      this._updateMetaplans(metaplans, context);
    }
  }
  async _requireStore(context) {
    const store = await FbStore.createContextStore(context, {
      schema: {
        tag: 'Entity',
        data: {
          names: ['TVMazeQuery'],
          fields: {
            'query': 'Text',
            'type': 'Text'
          }
        }
      },
      type: 'TVMazeQuery',
      name: 'TVMazeQuery',
      id: 'piped-show-query',
      tags: ['piped', 'nosync'],
      storageKey: 'in-memory'
    });
    this._setState({store});
  }
  async _requireFindStore(context) {
    const findStore = await FbStore.createContextStore(context, {
      schema: {
        tag: 'Entity',
        data: {
          names: ['TVMazeFind'],
          fields: {
            'name': 'Text',
            'type': 'Text'
          }
        }
      },
      type: 'TVMazeFind',
      name: 'TVMazeFind',
      id: 'piped-show-find',
      tags: ['piped', 'nosync'],
      storageKey: 'in-memory'
    });
    this._setState({findStore});
  }
  _updateMetaplans(metaplans, context) {
    if (metaplans.plans) {
      // find metaplans that use #piped stores
      const piped = metaplans.plans.filter(({plan}) => plan._handles.some(handle => {
        //log(handle._id);
        const tags = context.findStoreTags(context.findStoreById(handle._id));
        //log(tags);
        // TODO(sjmiles): tags is sometimes a Set, sometimes an Array
        return Boolean(tags && (tags.has && tags.has('piped') || tags.includes('piped')));
      }));
      if (piped.length) {
        // reduce plans to descriptionText
        const suggestions = piped.map(metaplan => metaplan.descriptionText);
        log('piped suggestions', suggestions);
        MiToast.foundSuggestions(suggestions);
      }
    }
  }
  chooseSuggestion(suggestion) {
    const {metaplans} = this._props;
    if (metaplans && metaplans.plans) {
      const metaplan = metaplans.plans.find(metaplan => metaplan.descriptionText === suggestion);
      log('piped plan', metaplan);
      this._fire('suggestion', metaplan);
    }
  }
}
customElements.define('mi-toast-pipe', MiToastPipe);
