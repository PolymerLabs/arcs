/*
@license
Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

import Xen from '../../../../modalities/dom/components/xen/xen.js';
import Firebase from '../../../lib/firebase.js';
import Const from '../../../lib/constants.js';
import {FbUser} from './FbUser.js';
import {FbStore} from './FbStore.js';

import {schemas} from '../sharing/schemas.js';

const log = Xen.logFactory('fb-user', '#aa00ff');

class FbUserElement extends Xen.Debug(Xen.Base, log) {
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
  async _queryUser({userid}, state) {
    if (await this._verifyUser(userid)) {
      log('querying `user`');
      if (state.field) {
        state.field.dispose();
      }
      state.field = state.fbuser.queryUser(userid);
      state.field.activate();
    }
  }
  async _verifyUser(userid) {
    // TODO(sjmiles): user assignation is intentionally simplified right now, to avoid
    // any appearance of being secure. A side-effect is that it's easy to end up in a
    // no-user or bad-user state. This code forces an unknown user to be one of the
    // original test users ('Barney' as of this note) by hardcoding the id.
    const snap = await Firebase.db.child(`users/${userid}`).once('value');
    if (snap.val() === null) {
      this._fire('userid', '-L8ZV0oJ3btRhU9wj7Le');
      return false;
    }
    return true;
  }
  async _initStore({arc}, state) {
    state.arcstore = await this._createArcStore(arc);
    state.arcstore.on('change', change => this._onStoreChange(change), arc);
    const arcs = state.field.fields.arcs;
    if (arcs) {
      Object.values(arcs.fields).forEach(field => this._arcChanged(field));
    }
  }
  async _createArcStore(arc) {
    const options = {
      schema: schemas.ArcMetadata,
      name: 'SYSTEM_arcs',
      id: 'SYSTEM_arcs',
      type: '[ArcMetadata]',
      tags: ['arcmetadata', 'nosync'],
      storageKey: 'volatile'
    };
    return FbStore.createContextStore(arc, options);
  }
  _onStoreChange(change) {
    const {userid} = this._state;
    if (change.add) {
      change.add.forEach(({effective, value: entity}) => {
        if (effective) {
          const record = entity.rawData;
          const cache = this.value.arcs[record.key];
          let path;
          let value;
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
            // not our business
            return;
          }
          log(`writing to [${path}]: `, value);
          Firebase.db.child(path).set(value);
        }
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
    // TODO(sjmiles): buy some time for the fb-context to construct itself
    // ... this is a hack and should be replaced by fb-context init mechanism
    // IFF we really need such a signal
    setTimeout(() => {
      this._fire('user', user);
    }, 1000);
}
  _arcChanged(field) {
    const {arcstore, arc} = this._state;
    if (arcstore) {
      arcstore.remove(field.key);
      if (!field.disposed) {
        arcstore.store(this._arcFieldToEntity(field), [arc.generateID('key')]);
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
