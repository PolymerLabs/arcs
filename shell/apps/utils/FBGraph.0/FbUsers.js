import {DbField} from './FbField.js';
import Xen from '../../../components/xen/xen.js';

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
  _userFieldChanged(field, {type}) {
    switch (type) {
      case 'changed':
      case 'removed':
        this._fire(type, field);
        break;
      default:
        console.warn('got unexpected event type', type);
        break;
    }
  }
};

customElements.define('fb-users', FbUsers);
