/*
@license
Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/
import {Xen} from '../../../lib/xen.js';
import IconStyle from '../../../components/icons.css.js';

// templates
const template = Xen.Template.html`
  <style>
    :host {
      display: block;
    }
    ${IconStyle}
    a {
      color: currentColor;
      text-decoration: none;
    }
    [toolbars] {
      display: inline-block;
      white-space: nowrap;
      height: 57px;
      width: 100%;
      overflow: hidden;
      box-sizing: border-box;
      border-bottom: 1px solid rgba(0,0,0,0.05);
      background-color: white;
    }
    [toolbar] {
      display: inline-flex;
      align-items: center;
      height: 56px;
      width: 100%;
      padding-left: 6px;
      padding-right: 6px;
      box-sizing: border-box;
    }
    [toolbar] > *:not(span):not(input) {
      margin: 16px 10px;
      height: 24px;
    }
    [toolbar] > span {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    [main][toolbar]:not([open]) {
      transform: translate3d(-100%, 0, 0);
    }
    [main][toolbar][title] {
      text-indent: 4px;
    }
    /* TODO(sjmiles): where are these extra px coming from? */
    [search][toolbar][open] {
      transform: translate3d(calc(-100% - 4px), 0, 0);
    }
    [toolbar] input {
      flex: 1;
      width: 0;
      outline: none;
      font-family: "Google Sans", sans-serif;
      font-size: 18px;
      border: none;
      /*line-height: 24px;*/
    }
    [settings][toolbar][open] {
      transform: translate3d(calc(-200% - 7px), 0, 0);
    }
  </style>
  <div toolbars on-click="onToolbarsClick">
    <div main toolbar open$="{{mainToolbarOpen}}">
      <a href="{{launcherHref}}" title="Go to Launcher"><icon>apps</icon></a>
      <input search placeholder="Search" value="{{search}}" on-focus="_onSearchFocus" on-input="_onSearchChange" on-blur="_onSearchBlur" on-dblclick="_onResetSearch">
      <icon hidden="{{hideMic}}" on-click="_onListen">mic</icon>
      <icon hidden="{{hideClear}}" on-click="_onClearSearch">highlight_off</icon>
      <icon on-click="_onSettingsClick">settings</icon>
    </div>
    <div search toolbar open$="{{searchToolbarOpen}}">
      <icon on-click="_onMainClick">arrow_back</icon>
    </div>
    <div settings toolbar open$="{{settingsToolbarOpen}}">
      <icon on-click="_onMainClick">arrow_back</icon>
      <span style="flex: 1;">Settings</span>
      <avatar title="{{avatar_title}}" xen:style="{{avatar_style}}" on-click="_onAvatarClick"></avatar>
    </div>
  </div>
  <div contents scrolltop="{{scrollTop:contentsScrollTop}}" on-click="onContentsClick">
    <div suggestions content open$="{{suggestionsContentOpen}}">
      <slot on-plan-choose="_onChooseSuggestion"></slot>
    </div>
    <settings-panel settings content open$="{{settingsContentOpen}}" key="{{key}}" arc="{{arc}}" users="{{users}}" user="{{user}}" friends="{{friends}}" avatars="{{avatars}}" share="{{share}}" user_picker_open="{{userPickerOpen}}" on-user="_onSelectUser" on-share="_onShare"></settings-panel>
  </div>
`;

const log = Xen.logFactory('PanelUi', '#c6c0fc');

export class PanelUi extends Xen.Debug(Xen.Async, log) {
  static get observedAttributes() {
    return ['open'];
  }
  get template() {
    return template;
  }
  _getInitialState() {
    return {
      toolState: 'main',
      // TODO(sjmiles): include manifest or other directives?
      launcherHref: `${location.origin}${location.pathname}`
    };
  }
  render(props, state) {
    const {toolState} = state;
    const mainOpen = toolState === 'main';
    const searchOpen = toolState === 'search';
    const settingsOpen = toolState === 'settings';
    const userOpen = toolState === 'user';
    const micVsClear = !state.search; //!props.search;
    return [state, {
      mainToolbarOpen: mainOpen,
      searchToolbarOpen: searchOpen,
      suggestionsContentOpen: mainOpen || searchOpen,
      settingsToolbarOpen: settingsOpen || userOpen,
      settingsContentOpen: settingsOpen,
      userContentOpen: userOpen,
      hideMic: !micVsClear,
      hideClear: micVsClear
    }];
  }
  onToolbarsClick(e) {
    e.stopPropagation();
    this.fire('open', true);
  }
  onContentsClick(e) {
    e.stopPropagation();
    this.fire('open', false);
  }
  _onSearchChange(e) {
    const search = e.target.value;
    // internal search property
    this.state = {search};
    // don't re-plan until typing has stopped for this length of time
    this._debounce(`searchDebounce`, () => this._commitSearch(search), 300);
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
    this._commitSearch(search);
  }
  _commitSearch(search) {
    this.state = {search};
    //this._fire('search', search || '');
  }
}

customElements.define('panel-ui', PanelUi);
