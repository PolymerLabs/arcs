/*
@license
Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

import {Field} from './Field.js';

export const FbUser = class {
  constructor(listener) {
    this._fire = (type, detail) => listener(type, detail);
  }
  queryUser(userid) {
    let field = null;
    if (userid) {
      field = new Field(null, `/users/${userid}`, userid, this._userSchema);
    }
    return field;
  }
  get _userSchema() {
    return {
      info: {
        $changed: field => this._fire('info-changed', field)
      },
      arcs: {
        '*': {
          $changed: field => this._onArcChanged(field),
          $key: (parent, key, datum) => ({
            $join: {
              path: `/arcs/${parent}`
            }
          })
        }
      }
    };
  }
  _onArcChanged(field) {
    this._fire('arc-changed', field);
  }
};
