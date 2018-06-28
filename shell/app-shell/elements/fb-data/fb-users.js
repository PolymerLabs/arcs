/*
@license
Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

import {FbUsers} from './FbUsers.js';
import Xen from '../../../components/xen/xen.js';
//import ArcsUtils from '../../lib/arcs-utils.js';

const log = Xen.logFactory('fb-users', '#883997');

class FbUsersElement extends Xen.Base {
  _getInitialState() {
    return {
      fbusers: new FbUsers((type, detail) => this._onEvent(type, detail)),
      users: {}
    };
  }
  _update(props, state) {
    if (!state.field) {
      log('querying `users`');
      state.field = state.fbusers.queryUsers();
      state.field.activate();
    }
  }
  _onEvent(type, field) {
    const {users} = this._state;
    const userid = field.path.split('/')[2];
    if (field.dipsosed) {
      delete users[userid];
    } else {
      users[userid] = field.value;
      users[userid].id = userid;
    }
    //console.log(type, detail);
    this._debounce('users', () => {
      this._fire('users', users);
      //log(users);
    });
  }
}
customElements.define('fb-users', FbUsersElement);
