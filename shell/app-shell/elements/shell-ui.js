/*
@license
Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

// elements
import './shell-ui/suggestion-element.js';
import './shell-ui/settings-panel.js';
import './shell-ui/user-picker.js';
import './shell-ui/voice-driver.js';

// components
import '../../components/simple-tabs.js';
import '../../components/arc-tools/handle-explorer.js';
import '../../components/xen-tools/xen-explorer.js';

// libs
import Xen from '../../components/xen/xen.js';
import ArcsUtils from '../lib/arcs-utils.js';

// strings
import AppIcon from '../../apps/common/icon.svg.js';
import {StyleSheet} from './shell-ui.css.js';

// templates
const html = Xen.html;
const template = html`
  ${StyleSheet}
  <!-- -->
  <div scrim open$="{{scrimOpen}}" on-click="_onScrimClick"></div>
  <!-- -->
  <slot name="modal"></slot>
  <slot></slot>
  <!-- -->
  <voice-driver on-search="_onVoiceSearch"></voice-driver>
  <!-- adds space at the bottom of the static flow so no actual content is ever covered by the app-bar -->
  <div barSpacer></div>
  <!-- -->
  <div bar glowing$="{{glows}}" glowable state$="{{barState}}" open$="{{barOpen}}" over$="{{barOver}}" on-mouseenter="_onBarEnter" on-mouseleave="_onBarLeave">
    <div touchbar on-click="_onTouchbarClick"></div>
    <div toolbars on-click="_onBarClick">
      <div main toolbar open$="{{mainToolbarOpen}}">
        <a href="{{launcherHref}}" title="Go to Launcher"><icon>apps</icon></a>
        <!--
        <div id="openSearch" style="flex:1; flex-direction:row; justify-content: center; display: flex; align-items: center; cursor: pointer;" on-click="_onSearchClick">
          <icon>search</icon>
          <div style="margin-left:8px;">Search</div>
        </div>
        -->
        <!-- <icon id="searchButton" on-click="_onResetSearch">search</icon> -->
        <input search placeholder="Search" value="{{search}}" on-focus="_onSearchFocus" on-input="_onSearchChange" on-blur="_onSearchBlur" on-dblclick="_onResetSearch">
        <icon hidden="{{hideMic}}" on-click="_onListen">mic</icon>
        <icon hidden="{{hideClear}}" on-click="_onClearSearch">highlight_off</icon>
        <!-- <span title="{{title}}">{{title}}</span>
        <icon on-click="_onSearchClick">search</icon> -->
        <icon on-click="_onSettingsClick">settings</icon>
      </div>
      <div search toolbar open$="{{searchToolbarOpen}}">
        <icon on-click="_onMainClick">arrow_back</icon>
        <!-- <icon id="searchButton" on-click="_onResetSearch">search</icon>
        <input placeholder="Search" value="{{search}}" on-input="_onSearchChange" on-blur="_onSearchBlur">
        <icon hidden="{{hideMic}}" on-click="_onListen">mic</icon>
        <icon hidden="{{hideClear}}" on-click="_onClearSearch">highlight_off</icon> -->
      </div>
      <div settings toolbar open$="{{settingsToolbarOpen}}">
        <icon on-click="_onMainClick">arrow_back</icon>
        <span style="flex: 1;">Settings</span>
        <avatar title="{{avatar_title}}" style="{{avatar_style}}" on-click="_onAvatarClick"></avatar>
      </div>
    </div>
    <div contents scrolltop="{{scrollTop:contentsScrollTop}}">
      <div suggestions content open$="{{suggestionsContentOpen}}">
        <slot name="suggestions" slot="suggestions" on-plan-choose="_onChooseSuggestion"></slot>
      </div>
      <settings-panel settings content open$="{{settingsContentOpen}}" key="{{key}}" arc="{{arc}}" users="{{users}}" user="{{user}}" profile="{{profile}}" share="{{share}}" user_picker_open="{{userPickerOpen}}" on-user="_onSelectUser" on-share="_onShare"></settings-panel>
    </div>
  </div>
  <!-- -->
  <icon style="position: fixed; right: 0px; bottom: 0px; z-index: 10000;" on-click="_onToolsClick">assessment</icon>
  <div tools open$="{{toolsOpen}}">
    <simple-tabs>
      <div tab="Handle Explorer">
        <handle-explorer arc="{{arc}}"></handle-explorer>
      </div>
      <div tab="Xen Explorer">
        <xen-explorer></xen-explorer>
      </div>
      <!-- <div tab="Manifests">
        <manifest-data manifests="{{manifests}}" exclusions="{{exclusions}}" on-exclusions="_onData"></manifest-data>
      </div> -->
    </simple-tabs>
  </div>
`;

const log = Xen.logFactory('ShellUi', '#ac6066');

class ShellUi extends Xen.Debug(Xen.Base, log) {
  static get observedAttributes() {
    return ['users', 'user', 'profile', 'key', 'arc', 'title', 'share', 'search', 'glows', 'showhint'];
  }
  get template() {
    return template;
  }
  _getInitialState() {
    return {
      intent: 'start',
      barState: 'over',
      toolState: 'main',
      // TODO(sjmiles): include manifest or other directives?
      launcherHref: `${location.origin}${location.pathname}`,
      toolsOpen: false
    };
  }
  _render(props, state, oldProps, oldState) {
    if (props.arc && props.arc !== oldProps.arc) {
      state.intent = 'start';
    }
    const {intent, toolState, barState, toolsOpen} = state;
    // `start` intent means no minimization
    if (intent === 'start') {
      if (state.barState !== 'open') {
        state.barState = props.showhint ? 'hint' : 'over';
      }
    }
    // `auto` intent means minimziation or hint is a calculation
    if (intent === 'auto') {
      if (barState === 'hint' && !props.showhint) {
        state.barState = 'peek';
      }
      else if (barState === 'peek' && props.showhint && !oldProps.showhint) {
        state.barState = 'hint';
      }
    }
    if (state.barState === 'peek') {
      state.toolState = 'main';
    }
    const barOpen = barState === 'open';
    const mainOpen = toolState === 'main';
    const searchOpen = toolState === 'search';
    const settingsOpen = toolState === 'settings';
    const userOpen = toolState === 'user';
    const micVsClear = !props.search;
    const renderModel = {
      scrimOpen: barOpen || toolsOpen,
      mainToolbarOpen: mainOpen,
      searchToolbarOpen: searchOpen,
      suggestionsContentOpen: mainOpen || searchOpen,
      settingsToolbarOpen: settingsOpen || userOpen,
      settingsContentOpen: settingsOpen,
      userContentOpen: userOpen,
      glows: Boolean(props.glows),
      hideMic: !micVsClear,
      hideClear: micVsClear
    };
    if (state.userPickerOpen && state.userPickerOpen !== oldState.userPickerOpen) {
      renderModel.contentsScrollTop = 0;
    }
    const {user, profile, arc} = props;
    if (user && user.info && arc) {
      renderModel.avatar_title = user.info.name;
      const avatar = profile && profile.avatar && profile.avatar.url || '';
      // TODO(sjmiles): bad way to surface the resolver
      const url = arc._loader._resolve(avatar);
      const avatar_style = avatar ? `background-image: url("${url}");` : '';
      renderModel.avatar_style = avatar_style;
    }
    return [props, state, renderModel];
  }
  _didRender(props, {toolState}, oldProps, oldState) {
    if (toolState === 'search' && oldState.toolState !== 'search') {
      const input = this.host.querySelector('input');
      // TODO(sjmiles): without timeout, rendering gets destroyed (Blink bug?)
      setTimeout(() => {
        input.focus();
        input.select();
      }, 300);
    }
  }
  _onScrimClick() {
    if (this._state.toolsOpen) {
      this._setState({toolsOpen: false});
    } else {
      //this._fire('showhint', false);
      this._setState({barState: 'peek', intent: 'auto'});
    }
  }
  _onTouchbarClick() {
    if (this._state.barState !== 'over') {
      this._setState({barState: 'open'});
    }
  }
  _onBarClick(e) {
    const wasAnchorClick = e.composedPath().find(n => n.localName === 'a');
    this._setState({barState: wasAnchorClick ? 'peek' : 'open'});
  }
  _onBarEnter(e) {
    if (this._state.barState === 'peek') {
      let barState = 'over';
      if (this._props.showhint && this._state.toolState === 'main') {
        barState = 'hint';
      }
      this._setState({barState});
    }
  }
  _onBarLeave(e) {
    if ((window.innerHeight - e.clientY) > 10) {
      switch (this._state.barState) {
        case 'over':
        case 'hint':
          this._collapseBar();
          break;
      }
    }
  }
  _collapseBar() {
    let barState = 'peek';
    if (this._props.showhint) {
      barState = 'hint';
    }
    this._setState({barState, intent: 'auto'});
  }
  _onSearchClick(e) {
    e.stopPropagation();
    this._setState({toolState: 'search', barState: 'open'});
  }
  _onMainClick(e) {
    e.stopPropagation();
    let {toolState} = this._state;
    switch (toolState) {
      default:
        toolState = 'main';
        break;
    }
    this._setState({toolState, barState: 'open'});
  }
  _onSettingsClick(e) {
    e.stopPropagation();
    this._setState({toolState: 'settings', barState: 'open'});
  }
  _onChooseSuggestion(e, suggestion) {
    e.stopPropagation();
    this._setState({barState: 'peek'});
    // TODO(sjmiles): wait for animation to complete to reduce jank
    setTimeout(() => this._fire('suggestion', suggestion), 300);
  }
  _onSelectUser(e, user) {
    this._fire('select-user', user.id);
    this._setState({userPickerOpen: false});
  }
  _onShare(e, share) {
    this._fire('share', share);
  }
  _onToolsClick() {
    this._setState({toolsOpen: !this._state.toolsOpen});
  }
  _onAvatarClick() {
    this._setState({userPickerOpen: !this._state.userPickerOpen});
  }
  _onSearchFocus(e) {
    this._setState({searchFocus: true});
  }
  _onSearchBlur(e) {
    this._setState({searchFocus: false});
  }
  _onSearchChange(e) {
    const search = e.target.value;
    // don't re-plan until typing has stopped for this length of time
    const delay = 500;
    const commit = () => this._commitSearch(search);
    this._searchDebounce = ArcsUtils.debounce(this._searchDebounce, commit, delay);
  }
  _onClearSearch(e) {
    this._commitSearch('');
  }
  _onResetSearch(e) {
    // Doubleclick on empty search box searches for '*'
    if (e.target.value === '') {
      this._commitSearch('*');
    }
  }
  _onVoiceSearch(e, search) {
    this._fire('search', search || '');
  }
  _commitSearch(search) {
    this._fire('search', search || '');
  }
}

customElements.define('shell-ui', ShellUi);
