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

export const FbUserContext = class {
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
      arcs: {
        '*': {
          $key: (parent, key, datum) => ({
            $join: {
              path: `/arcs/${parent}`,
              schema: {
                $changed: field => this._onShareChanged(field),
                shim_handles: this._userShimHandlesSchema
              }
            }
          })
        }
      }
    };
  }
  get _userShimHandlesSchema() {
    return {
      '*': (parent, key, datum) => {
        switch (key) {
          case 'avatar':
            return this._avatarSchema;
          case 'friends':
            return this._friendSchema;
          default:
            return {};
        }
      }
    };
  }
  get _avatarSchema() {
    return {
      $changed: field => {
        this._onAvatarHandleChanged(field);
      }
    };
  }
  get _friendSchema() {
    return {
      data: {
        '*': {
          rawData: {
            id: (parent, key, value) => ({
              $join: {
                path: `/users/${value}`,
                schema: {
                  $changed: field => this._onFriendChanged(field),
                  arcs: this._friendsArcsSchema
                }
              }
            })
          }
        }
      }
    };
  }
  get _friendsArcsSchema() {
    return {
      '*': {
        $key: (parent, key, value) => ({
          $join: {
            path: `/arcs/${parent}`,
            schema: {
              $changed: field => this._onShareChanged(field),
              shim_handles: {
                '*': (parent, key, datum) => {
                  switch (key) {
                    case 'avatar':
                      return this._avatarSchema;
                    default:
                      return {};
                  }
                }
              }
            }
          }
        })
      }
    };
  }
  _onFriendChanged(field) {
    this._fire('friend-changed', field);
  }
  _onAvatarHandleChanged(field) {
    this._fire('avatar-changed', field);
  }
  _onShareChanged(field) {
    this._fire('share-changed', field);
  }
};
