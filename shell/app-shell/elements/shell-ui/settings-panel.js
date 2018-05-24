import Xen from '../../../components/xen/xen.js';
import Const from '../../constants.js';
import IconStyle from '../../../components/icons.css.js';
import {arcToRecipe} from './generalizer.js';

const html = Xen.Template.html;
const template = html`

<style>
  ${IconStyle}
  :host {
    display: block;
    box-sizing: border-box;
    user-select: none;
  }
  section {
    display: block;
    box-sizing: border-box;
    border-bottom: 1px solid rgba(0, 0, 0, 0.1);
    padding: 0 16px;
    cursor: pointer;
  }
  section[bar] {
    height: 56px;
    display: flex;
    align-items: center;
  }
  section[bar][disabled] {
    opacity: 0.4;
    pointer-events: none;
  }
  section span {
    flex: 1
  }
  section[friends] {
    padding: 16px;
  }
  avatar {
    display: inline-block;
    height: var(--avatar-size);
    width: var(--avatar-size);
    min-width: var(--avatar-size);
    border-radius: 100%;
    border: 1px solid whitesmoke;
    background: gray center no-repeat;
    background-size: cover;
  }
  user-item {
    display: flex;
    align-items: center;
    cursor: pointer;
    padding: 8px 0;
  }
  user-item avatar {
    height: var(--large-avatar-size);
    width: var(--large-avatar-size);
    min-width: var(--large-avatar-size);
    margin-right: 16px;
  }
  user-item a {
    display: flex;
    align-items: center;
    text-decoration: none;
    color: inherit;
  }
  [user] {
    max-height: 0;
    overflow: hidden;
    transition: max-height 300ms ease-in-out;
  }
  [user][open] {
    max-height: initial;
  }
</style>

<section user open$="{{user_picker_open}}">
  <user-picker users="{{users}}" on-selected="_onSelectUser"></user-picker>
</section>
<section bar disabled>
  <span>Star this arc</span>
  <icon>star_border</icon>
</section>
<section bar disabled on-click="_onCastClick">
  <span>Cast this arc</span>
  <icon>cast</icon>
</section>
<section bar disabled$="{{nopersist}}" on-click="_onProfileClick" style="{{profileStyle}}">
  <span>Use for suggestions</span>
  <icon>{{profileIcon}}</icon>
</section>
<section bar disabled$="{{nopersist}}" on-click="_onShareClick" style="{{shareStyle}}">
  <span>Use for friends' suggestions</span>
  <icon>{{shareIcon}}</icon>
</section>
<section bar on-click="_onExperimentClick">
  <span>Convert Arc to Recipe</span>
  <icon>transform</icon>
</section>
<section friends>
  <span>Friends</span><br>
  <div style="padding-top: 8px;">{{friends}}</div>
</section>
`;

const userTemplate = html`
  <user-item selected$="{{selected}}" on-click="_onSelect" key="{{key}}">
    <a href="{{href}}" target="_blank"><avatar style="{{style}}"></avatar> <name>{{name}}</name></a>
  </user-item>
`;

const log = Xen.logFactory('SettingsPanel', '#bb4d00');

class SettingsPanel extends Xen.Debug(Xen.Base, log) {
  static get observedAttributes() {
    return ['key', 'arc', 'users', 'user', 'profile', 'share', 'user_picker_open'];
  }
  get template() {
    return template;
  }
  _willReceiveProps({user_picker_open, share}, state, oldProps) {
    if (oldProps.share !== share) {
      this._setState(this._shareStateToFlags(share));
    }
  }
  _render(props, state, oldProps) {
    const {key, users, user, profile, avatars} = props;
    const {selected, isProfile, isShared} = state;
    const render = {
      name: user && user.name,
      profileIcon: isProfile ? 'check' : 'check_box_outline_blank',
      profileStyle: isProfile ? 'color: #1A73E8' : '',
      shareIcon: isShared ? 'check' : 'check_box_outline_blank',
      shareStyle: isShared ? 'color: #1A73E8' : '',
      nopersist: Boolean(Const.SHELLKEYS[key])
    };
    if (profile && profile.friends) {
      render.friends = this._renderUsers(selected, profile.friends, users);
    }
    return [props, render];
  }
  _renderUsers(selected, friends, users) {
    const models = [];
    friends.forEach((friend, i) => {
      const user = users[friend.id];
      if (user) {
        models.push(this._renderUser(selected, user, i));
      }
    });
    return {
      template: userTemplate,
      models
    };
  }
  _renderUser(selected, user, i) {
    const url = new URL(document.location.href);
    url.searchParams.set('user', user.id);
    let avatar = user.info && user.info.avatar;
    if (!avatar) {
      avatar = ``; //`${this._props.config.root}/assets/avatars/user (0).png`;
    }
    return {
      key: user.id,
      name: user.info && user.info.name || '',
      style: `background-image: url("${avatar}");`,
      selected: user.id === selected,
      href: url.href
    };
  }
  _onSelectUser(e, user) {
    this._fire('user', user);
  }
  _onCastClick() {
    this._fire('cast');
  }
  _onToolsClick() {
    this._fire('tools');
  }
  _onProfileClick() {
    let {isProfile, isShared} = this._state;
    isProfile = !isProfile;
    isShared = isProfile ? isShared : false;
    this._changeSharing(isProfile, isShared);
  }
  _onShareClick() {
    let {isProfile, isShared} = this._state;
    isShared = !isShared;
    isProfile = isShared ? true : isProfile;
    this._changeSharing(isProfile, isShared);
  }
  _changeSharing(isProfile, isShared) {
    const share = this._shareFlagsToShareState(isProfile, isShared);
    this._setState({isProfile, isShared, share});
    this._fire('share', share);
  }
  _shareStateToFlags(share) {
    return {
      isProfile: (share == Const.SHARE.friends) || (share === Const.SHARE.self),
      isShared: (share == Const.SHARE.friends)
    };
  }
  _shareFlagsToShareState(isProfile, isShared) {
    return isShared ? Const.SHARE.friends : isProfile ? Const.SHARE.self : Const.SHARE.private;
  }
  async _onExperimentClick() {
    const {arc} = this._props;
    if (arc) {
      arcToRecipe(await arc.serialize());
    }
  }
}
customElements.define('settings-panel', SettingsPanel);
