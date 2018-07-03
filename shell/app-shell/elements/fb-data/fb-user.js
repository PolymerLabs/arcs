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
import {FbStore} from './FbStore.js';
import Firebase from '../cloud-data/firebase.js';
import Const from '../../constants.js';
import Xen from '../../../components/xen/xen.js';

const log = Xen.logFactory('fb-user', '#aa00ff');

class FbUserElement extends Xen.Base {
   static get observedAttributes() {
    return ['config', 'userid', 'key', 'arc'];
  }
  _getInitialState() {
    return {
      fbuser: new FbUser((type, detail) => this._onEvent(type, detail))
    };
  }
  async _update(props, state) {
    if (props.arc !== state.arc) {
      state.arc = props.arc;
      state.arcstore = null;
      state.arcstoreinit = false;
      // TODO(sjmiles): arcstore.on('change') handler should be unlinked, but there is no `off`
      // presumably the arc that owns store has been disposed, taking the store with it
    }
    if (props.userid !== state.userid) {
      state.userid = props.userid;
      this._queryUser(props, state);
    }
    if (!state.arcstoreinit && props.config && props.arc) {
      state.arcstoreinit = true;
      this._initStore(props, state);
    }
    if (props.userid && props.key && !Const.SHELLKEYS[props.key] && props.key !== state.key) {
      state.key = props.key;
      this._touchArc(props.userid, props.key);
    }
  }
  get value() {
    return this._state.field.value;
  }
  _touchArc(userid, key) {
    const path = `users/${userid}/arcs/${key}/touched`;
    log(`writing to [${path}]`);
    Firebase.db.child(path).set(Firebase.firebase.database.ServerValue.TIMESTAMP);
   }
  _queryUser({userid}, state) {
    log('querying `user`');
    if (state.field) {
      state.field.dispose();
    }
    state.field = state.fbuser.queryUser(userid);
    state.field.activate();
  }
  async _initStore({config, arc}, state) {
    state.arcstore = await this._createArcStore(config, arc);
    state.arcstore.on('change', change => this._onStoreChange(change), arc);
    const arcs = state.field.fields.arcs;
    if (arcs) {
      Object.values(arcs.fields).forEach(field => this._arcChanged(field));
    }
  }
  async _createArcStore(config, arc) {
    const options = {
      schema: {
        tag: 'Entity',
        data: {
          names: ['ArcMetadata'],
          fields: {
            'description': 'Text',
            'icon': 'Text',
            'key': 'Text',
            'href': 'Text',
            'bg': 'Text',
            'color': 'Text',
            'profile': 'Text',
            'blurb': 'Text',
            'share': 'Number',
            'touched': 'Number',
            'deleted': 'Boolean',
            'starred': 'Boolean',
            'externalManifest': 'URL'
          }
        }
      },
      type: '[ArcMetadata]',
      name: 'ArcMetadata',
      tags: ['arcmetadata', 'nosync']
    };
    return FbStore.createContextStore(arc, options);
  }
  _onStoreChange(change) {
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
    const {arcstore} = this._state;
    if (arcstore) {
      arcstore.remove(field.key);
      if (!field.disposed) {
        arcstore.store(this._arcFieldToEntity(field));
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
