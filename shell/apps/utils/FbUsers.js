import {DbField} from './FbGraph.js';
import Xen from '../../components/xen/xen.js';

export const FbUsers = class extends Xen.Base {
  _update(props, state) {
    if (!state.users) {
      state.users = new DbField(null, '/users', 'users', this._usersSchema);
      this._fire('field', state.users);
      state.users.activate();
    }
  }
  get _usersSchema() {
    const $changed = (sender, event) => this._userFieldChanged(sender, event);
    return {
      '*': {
        $changed
      }
    };
  }
  _userFieldChanged(sender, {type, detail}) {
    switch (type) {
      //case 'added':
      case 'changed':
      //case 'initial':
        this._changeUser(sender);
        break;
      case 'removed':
        //removeUser(sender, detail);
        break;
    }
  }
  _changeUser(field) {
    this._removeUser(field.key);
    this._fire('changed', field);
  }
  _removeUser(field) {
    this._fire('removed', field);
  }
};

customElements.define('fb-users', FbUsers);
