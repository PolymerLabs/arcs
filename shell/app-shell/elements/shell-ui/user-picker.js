// code
import Xen from '../../../components/xen/xen.js';

// globals
/* global shellPath */

const html = Xen.Template.html;
const Main = html`
<style>
  :host {
    display: block;
    padding: 8px;
    box-sizing: border-box;
    user-select: none;
    background-color: white;
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

const User = html`
  <user-item selected$="{{selected}}" on-click="_onSelect" key="{{key}}" user="{{user}}">
    <avatar style="{{style}}"></avatar> <name>{{name}}</name>
  </user-item>
`;

const log = Xen.logFactory('UserPicker', '#bb4d00');

class UserPicker extends Xen.Base {
  static get observedAttributes() {
    return ['users', 'friends'];
  }
  get template() {
    return Main;
  }
  _getInitialState() {
    return {
      selected: 0
    };
  }
  _render({users, friends}, {selected}) {
    const render = {
      users: users && this._renderUsers(users, friends, selected)
    };
    return render;
  }
  _renderUsers(users, friends, selected) {
    return {
      template: User,
      models: Object.values(users).map((user) => this._renderUser(selected, user, friends))
    };
  }
  _renderUser(selected, user, friends) {
    let url = user.avatar;
    if (!url && friends) {
      url = friends[user.id] && friends[user.id].avatar;
    }
    url = url || `https://$shell/assets/avatars/user (0).png`;
    url = url.replace(`https://$shell`, window.shellPath).replace(`https://$cdn`, window.shellPath);
    return {
      user: user,
      key: user.id,
      name: user.name,
      style: `background-image: url("${url}");`,
      selected: user.id === selected
    };
  }
  _onSelect(e) {
    const {key, user} = e.currentTarget;
    this._setState({selected: key});
    this._fire('selected', user);
  }
}
customElements.define('user-picker', UserPicker);
