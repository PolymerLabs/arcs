import {FbUsers} from '../classes/FbUsers.js';
import Xen from '../../../../components/xen/xen.js';

export const FbUsersElement = class extends Xen.Base {
  _getInitialState() {
    return {
      fbusers: new FbUsers((type, detail) => this._fire(type, detail))
    };
  }
  _update(props, state) {
    if (!state.field) {
      state.field = state.fbusers.queryUsers();
    }
  }
  get value() {
    return this._state.field.value;
  }
};

customElements.define('fb-users', FbUsersElement);
