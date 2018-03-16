// code
import Xen from '../../components/xen/xen.js';
import Const from '../constants.js';
// elements
// strings
import icons from '../icons.css.js';
// globals
/* global shellPath */

const html = Xen.Template.html;

const template = html`

<style>
  :host {
    display: block;
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
    user-select: none;
    --avatar-size: 24px;
    --large-avatar-size: 40px;
  }
  :host([open]) {
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
<section bar on-click="_onToolsClick">
  <span>Toggle tools panel</span>
  <icon>business_center</icon>
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
<section friends>{{friends}}</section>
`;

const userTemplate = html`
  <user-item selected$="{{selected}}" on-click="_onSelect" key="{{key}}">
    <avatar style="{{style}}"></avatar> <name>{{name}}</name>
  </user-item>
`;

class MenuPanel extends Xen.Base {
  get template() {
    return template;
  }
  static get observedAttributes() {
    return ['arc', 'open', 'friends', 'avatars', 'avatar_title', 'avatar_style', 'share'];
  }
  _render({arc, open, avatar_title, avatar_style, friends, avatars, share}, state, oldProps) {
    const {selected, isProfile, isShared, isOpen, shouldOpen} = state;
    //`shouldOpen` exists to allow parent to update before we try to transition
    state.isOpen = state.shouldOpen;
    if (open && !isOpen) {
      state.shouldOpen = true;
      setTimeout(() => this._invalidate(), 80);
    }
    if (!open) {
      state.shouldOpen = state.isOpen = false;
    }
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
        template: userTemplate,
        models: friends.map((friend, i) => this._renderUser(arc, selected, friend.rawData, avatars, i))
      };
    }
    if (oldProps.share !== share) {
      this._setState(this._shareStateToFlags(share));
    }
    return render;
  }
  _didRender({}, {isOpen}) {
    Xen.setBoolAttribute(this, 'open', isOpen);
  }
  _shareStateToFlags(share) {
    return {
      isShared: (share == Const.SHARE.friends),
      isProfile: (share == Const.SHARE.friends) || (share === Const.SHARE.self)
    };
  }
  _shareFlagsToShareState(isProfile, isShared) {
    return isShared ? Const.SHARE.friends : isProfile ? Const.SHARE.self : Const.SHARE.private;
  }
  _renderUser(arc, selected, user, avatars, i) {
    let avatar = user.avatar;
    if (arc && !avatar && avatars) {
      avatar = (avatars.find(a => a.owner === user.id) || Object).url;
      if (avatar) {
        avatar = arc._loader._resolve(avatar);
      }
    }
    if (!avatar) {
      avatar = `${shellPath}/assets/avatars/user (0).png`;
    }
    return {
      key: user.id,
      name: user.name,
      style: `background-image: url("${avatar}");`,
      selected: user.id === selected
    };
  }
  _close(afterEvent) {
    this.removeAttribute('open');
    // allow close transition to complete before informing owner
    setTimeout(() => {
      this._fire('close');
      if (afterEvent) {
        this._fire(afterEvent);
      }
      if ('share' in this._state) {
        // TODO(sjmiles): delay notification to allow DOM changes to settle before triggering heavy-lifting?
        //   this problem shouldn't be handled here...
        setTimeout(() => this._fire('share', this._state.share), 100);
      }
    }, 220);
  }
  _onClose() {
    this._close();
  }
  _onSelectUser() {
    this._close('user');
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
  }
}

const log = Xen.logFactory('MenuPanel', '#bb4d00');
customElements.define('menu-panel', MenuPanel);
