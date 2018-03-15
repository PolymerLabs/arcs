// code
import Xen from '../../components/xen/xen.js';

// globals
const shellPath = window.shellPath;

const Main = Xen.html`
<style>
  :host {
    display: block;
    padding: 8px;
    background-color: white;
    user-select: none;
  }
  user-item {
    display: block;
    cursor: pointer;
    padding: 8px;
  }
  avatar {
    --size: 48px;
    display: inline-block;
    height: var(--size);
    width: var(--size);
    min-width: var(--size);
    border-radius: 100%;
    background: none center no-repeat;
    background-size: cover;
    vertical-align: middle;
    margin: 8px 0;
  }
  name {
    margin-left: 32px;
  }
  [selected] {
    background-color: whitesmoke;
    border-radius: 8px;
  }
</style>
<div>{{users}}</div>

`;

const User = Xen.Template.html`
  <user-item selected$="{{selected}}" on-click="_onSelect" key="{{key}}">
    <avatar style="{{style}}"></avatar> <name>{{name}}</name>
  </user-item>
`;

class UserPicker extends Xen.Base {
  static get observedAttributes() { return ['users']; }
  get template() {
    return Main;
  }
  _getInitialState() {
    const avatars = [];
    for (let i=0; i<27; i++) {
      avatars[i] = {
        url: `${shellPath}/assets/avatars/user (${i}).png`
      };
    }
    return {
      avatars,
      selected: 0
    };
  }
  _render({users}, {selected, avatars}) {
    const render = {
    };
    if (users) {
      render.users = {
        template: User,
        models: Object.values(users).map(this._renderUser.bind(this, selected))
      };
    }
    return render;
  }
  _renderUser(selected, user, i) {
    //const url = `${shellPath}/assets/avatars/user (${i%27}).png`;
    const url = user.avatar || `${shellPath}/assets/avatars/user (0).png`;
    return {
      key: user.id,
      name: user.name,
      style: `background-image: url("${url}");`,
      selected: user.id === selected
    };
  }
  _onSelect(e) {
    const selected = e.currentTarget.key;
    this._setState({selected});
    this._fire('selected', selected);
  }
}

UserPicker.log = Xen.logFactory('UserPicker', '#bb4d00');
customElements.define('user-picker', UserPicker);
