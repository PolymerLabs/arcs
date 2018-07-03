import {Field} from '../Field.js';

export const FbUsers = class {
  constructor(listener) {
    this._fire = (type, detail) => listener(type, detail);
  }
  queryUsers() {
    const field = new Field(null, '/users', 'users', this._usersSchema);
    this._fire('field', field);
    field.activate();
    return field;
  }
  get _usersSchema() {
    return {
      '*': {
        $changed: field => this._fire('user-changed', field)
      }
    };
  }
};
