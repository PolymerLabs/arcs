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
const MiToast = window.MiToast || {entityArcAvailable() {}};

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
  }
};

const log = Xen.logFactory('MiToastPipe', '#a01a01');

class MiToastPipe extends Xen.Debug(Xen.Base, log) {
  static get observedAttributes() {
    return ['arc'];
  }
  receiveEntity(entity) {
    log('receiveEntity:', entity);
    this._setState({entity});
  }
  _update({arc}, state) {
    if (arc && !state.registered) {
      state.registered = true;
      ShellApi.registerPipe(this);
      log('registerPipe');
    }
    if (arc && !state.store) {
      this._requireStore(arc);
    }
    if (state.store && state.entity) {
      state.store.set({
        id: 'piped-store',
        rawData: {
          name: state.entity
        }
      });
    }
  }
  async _requireStore(context) {
    const store = await FbStore.createContextStore(context, {
      schema: {
        tag: 'Entity',
        data: {
          names: ['TVShowName'],
          fields: {
            'name': 'Text'
          }
        }
      },
      type: 'TVShowName',
      name: 'TVShowName',
      tags: ['#piped', '#nosync'],
      storageKey: 'in-memory'
    });
    this._setState({store});
  }
}
customElements.define('mi-toast-pipe', MiToastPipe);
