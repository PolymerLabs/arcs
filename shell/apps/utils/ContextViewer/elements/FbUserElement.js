import {FbUser} from '../classes/FbUser.js';
import Xen from '../../../../modalities/dom/components/xen/xen.js';

export const FbUserElement = class extends Xen.Base {
  static get observedAttributes() {
    return ['userid'];
  }
  _getInitialState() {
    return {
      fbuser: new FbUser((type, detail) => this._fire(type, detail))
    };
  }
  get value() {
    return this._state.field.value;
  }
  _update(props, state) {
    if (props.userid !== state.userid) {
      state.userid = props.userid;
      state.field && state.field.dispose();
      state.field = state.fbuser.queryUser(props.userid);
    }
  }
};

customElements.define('fb-user', FbUserElement);
