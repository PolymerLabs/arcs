// code
import Xen from '../../components/xen/xen.js';
// elements
// strings
import icons from '../icons.css.js';

const template = Xen.html`

<style>
  :host {
    /*display: none;*/
    transform: translate3d(100%, 0, 0);
    transition: transform 200ms ease-out;
    position: absolute;
    box-sizing: border-box;
    overflow: hidden;
    top: 0;
    width: calc(var(--max-width) - 56px);
    height: 100%;
    border: 1px solid silver;
    box-shadow: 0px 0px 6px 2px rgba(0,0,0,0.2);
    background-color: whitesmoke;
    margin-left: 56px;
    font-family: 'Google Sans';
    font-size: 16px;
    --avatar-size: 24px;
    --large-avatar-size: 40px;
  }
  :host([open]) {
    /*display: block;*/
    transform: translate3d(0, 0, 0);
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
  section span {
    flex: 1
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
    padding: 8px;
  }
  user-item avatar {
    height: var(--large-avatar-size);
    width: var(--large-avatar-size);
    min-width: var(--large-avatar-size);
    margin-right: 16px;
  }
  ${icons}
</style>

<section bar>
  <avatar title="{{avatar_title}}" style="{{avatar_style}}" on-click="_onSelectUser"></avatar>
  <span></span>
  <icon on-click="_onClose">chevron_right</icon>
</section>
<section bar>
  <span>Star this arc</span>
  <icon>star_border</icon>
</section>
<section bar on-click="_onCastClick">
  <span>Cast this arc</span>
  <icon>cast</icon>
</section>
<section bar on-click="_onProfileClick" style="{{profileStyle}}">
  <span>Use for suggestions</span>
  <icon>{{profileIcon}}</icon>
</section>
<section bar on-click="_onShareClick" style="{{shareStyle}}">
  <span>Use for friends' suggestions</span>
  <icon>{{shareIcon}}</icon>
</section>
<section>
  <div>{{friends}}</div>
</section>
`;

const User = Xen.Template.html`
  <user-item selected$="{{selected}}" on-click="_onSelect" key="{{key}}">
    <avatar style="{{style}}"></avatar> <name>{{name}}</name>
  </user-item>
`;

class MenuPanel extends Xen.Base {
  get template() {
    return template;
  }
  static get observedAttributes() {
    return ['friends', 'avatar_title', 'avatar_style'];
  }
  _render({avatar_title, avatar_style, friends}, {selected, isProfile, isShared}) {
    const render = {
      avatar_title,
      avatar_style,
      profileIcon: isProfile ? 'check' : 'check_box_outline_blank',
      profileStyle: isProfile ? 'color: #1A73E8' : '',
      shareIcon: isShared ? 'check' : 'check_box_outline_blank',
      shareStyle: isShared ? 'color: #1A73E8' : ''
    };
    if (friends) {
      render.friends = {
        template: User,
        models: friends.map((friend, i) => this._renderUser(selected, friend.rawData, i))
      };
    }
    return render;
  }
  _renderUser(selected, user, i) {
    const url = user.avatar || `${shellPath}/assets/avatars/user (0).png`;
    return {
      key: user.id,
      name: user.name,
      style: `background-image: url("${url}");`,
      selected: user.id === selected
    };
  }
  _close() {
    this.removeAttribute('open');
    setTimeout(() => this._fire('close'), 300);
    //this._fire('close');
  }
  _onClose() {
    this._close();
  }
  _onProfileClick() {
    let {isProfile, isShared} = this._state;
    isProfile = !isProfile;
    this._setState({
      isProfile: isProfile,
      isShared: isShared && isProfile
    });
  }
  _onShareClick() {
    let {isShared} = this._state;
    isShared = !isShared;
    this._setState({
      isProfile: isShared,
      isShared: isShared
    });
  }
  _onSelectUser() {
    this._close();
    this._fire('user');
  }
  _onCastClick() {
    this._close();
    this._fire('cast');
  }
}

const log = Xen.logFactory('MenuPanel', '#bb4d00');
customElements.define('menu-panel', MenuPanel);