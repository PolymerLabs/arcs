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
