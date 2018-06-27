/*
@license
Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

import {FbUser} from './FbUser.js';
import Firebase from '../cloud-data/firebase.js';
import Xen from '../../../components/xen/xen.js';

const log = Xen.logFactory('fb-user', '#aa00ff');

class FbUserElement extends Xen.Base {
   static get observedAttributes() {
    return ['config', 'userid', 'arc'];
  }
  _getInitialState() {
    return {
      fbuser: new FbUser((type, detail) => this._onEvent(type, detail)),
      cache: Object.create(null)
    };
  }
  _update(props, state) {
    if (props.arc !== state.arc) {
      state.arc = props.arc;
      state.arcstore = null;
    }
    if (!state.arcstore && props.config && props.arc) {
      state.arcstore = this._createArcStore(props.config, props.arc);
      state.arcstore.addEventListener('store', e => {
        state.store = e.detail;
        state.store.on('change', (info) => this._onStoreChange(info), props.arc);
        const arcs = state.field.fields.arcs.fields;
        Object.values(arcs).forEach(field => this._arcChanged(field));
      });
    }
    if (props.userid !== state.userid) {
      log('querying `user`');
      state.userid = props.userid;
      state.field && state.field.dispose();
      state.field = state.fbuser.queryUser(props.userid);
      state.field.activate();
    }
  }
  get value() {
    return this._state.field.value;
  }
  _createArcStore(config, arc) {
    const store = document.createElement('arc-handle');
    const typesPath = `${config.root}/app-shell/artifacts`;
    store.options ={
      schemas: `${typesPath}/arc-types.manifest`,
      type: '[ArcMetadata]',
      name: 'ArcMetadata',
      tags: ['arcmetadata']
    };
    store.arc = arc;
    return store;
  }
  _onStoreChange(change) {
    //log('_onStoreChange: ', change);
    const {userid} = this._state;
    if (change.add) {
      change.add.forEach(entity => {
        const record = entity.rawData;
        const cache = this.value.arcs[record.key];
        let path, value;
        if (record.deleted) {
          // remove arc reference
          path = `users/${userid}/arcs/${record.key}`;
          value = null;
        }
        else if (record.starred !== cache.starred) {
          // update starred
          path = `users/${userid}/arcs/${record.key}/starred`;
          value = Boolean(record.starred);
        } else {
          return;
        }
        log(`writing to [${path}]: `, value);
        Firebase.db.child(path).set(value);
      });
    }
  }
  _debounce(key, func, delay) {
    this._state[key] = Xen.debounce(this._state[key], func, delay != null ? delay : 16);
  }
  _onEvent(type, field) {
    switch (type) {
      case 'info-changed':
        this._infoChanged(field);
        break;
      case 'arc-changed':
        this._arcChanged(field);
        break;
    }
  }
  _infoChanged(field) {
    const user = {
      id: this._state.userid,
      info: field.value || {name: 'Anonymous'}
    };
    this._fire('user', user);
  }
  _arcChanged(field) {
    //log('arc-changed', field.key);
    const store = this._state.store;
    if (store) {
      store.remove(field.key);
      if (!field.disposed) {
        store.store(this._arcFieldToEntity(field));
      }
    }
  }
  _arcFieldToEntity(field) {
    const href = `${location.origin}${location.pathname}?arc=${field.key}&user=${this._props.userid}`;
    const value = field.value;
    let metadata;
    try {
      metadata = value.$key.metadata;
    } catch (x) {
      // probably incomplete join, will come back through here when join is completed
      // TODO: require initialized joins before sending first change event
    }
    metadata = metadata || {};
    return {
      id: field.key,
      rawData: {
        key: field.key,
        href,
        description: metadata.description,
        color: metadata.color || 'gray',
        bg: metadata.bg,
        touched: value.touched,
        starred: value.starred,
        share: metadata.share
      }
    };
  }
}
customElements.define('fb-user', FbUserElement);
