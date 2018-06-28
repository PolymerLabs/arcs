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
            return {
              $changed: field => this._onProfileHandleChanged(field)
            };
        }
      }
    };
  }
  get _avatarSchema() {
    return {
      $changed: field => {
        this._onProfileHandleChanged(field);
        this._onAvatarHandleChanged(field);
      }
    };
  }
  get _friendSchema() {
    return {
      $changed: field => this._onProfileHandleChanged(field),
      data: {
        '*': {
          rawData: {
            id: (parent, key, value) => ({
              $join: {
                path: `/users/${value}`,
                schema: {
                  arcs: this._friendsArcsSchema,
                  info: {
                    $changed: field => this._onFriendChanged(field)
                  }
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
              $changed: field => this._onShareChanged(field)
            }
          }
        })
      }
    };
  }
  _onFriendChanged(field) {
    this._fire('friend-changed', field);
  }
  _onProfileHandleChanged(field) {
    this._fire('profile-changed', field);
  }
  _onAvatarHandleChanged(field) {
    this._fire('avatar-changed', field);
  }
  _onShareChanged(field) {
    this._fire('share-changed', field);
  }
};
