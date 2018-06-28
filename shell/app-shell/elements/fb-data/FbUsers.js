import {Field} from './Field.js';

export const FbUsers = class {
  constructor(listener) {
    this._fire = (type, detail) => listener(type, detail);
  }
  queryUsers() {
    return new Field(null, '/users', 'users', this._usersSchema);
  }
  get _usersSchema() {
    return {
      '*': {
        info: {
          $changed: field => this._fire('info-changed', field)
        }
      }
    };
  }
};
