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

// components
import '../../components/simple-tabs.js';
import '../../components/arc-tools/handle-explorer.js';
import '../../components/arc-tools/xen-explorer.js';

// libs
import Xen from '../../components/xen/xen.js';
import ArcsUtils from '../lib/arcs-utils.js';

// strings
import AppIcon from '../icon.svg.js';
import IconStyle from '../../components/icons.css.js';

// globals
/* global shellPath */

// templates
const html = Xen.html;
const template = html`
  <style>
    ${IconStyle}
    :host {
      --bar-max-width: 400px;
      --bar-max-height: 50vh;
      --bar-hint-height: 33vh;
      --bar-over-height: 56px;
      --bar-peek-height: 16px;
      --bar-touch-height: 32px;
      --bar-space-height: 48px;
    }
    :host {
      display: block;
    }
    a {
      color: currentColor;
    }
    [scrim] {
      position: fixed;
      top: 0;
      right: 0;
      left: 0;
      height: 100vh;
      opacity: 0;
      background-color: white;
      z-index: -1;
      pointer-events: none;
      transition: opacity 200ms ease-in;
    }
    [scrim][open] {
      z-index: 9000;
      pointer-events: auto;
      opacity: 0.8;
    }
    [barSpacer] {
      height: var(--bar-space-height);
    }
    [touchbar] {
      margin-top: calc(var(--bar-touch-height) * -1);
      height: var(--bar-touch-height);
      background-color: transparent;
    }
    [bar] {
      display: flex;
      flex-direction: column;
      position: fixed;
      z-index: 10000;
      right: 0;
      bottom: 0;
      left: 0;
      margin: 0 auto;
      box-sizing: border-box;
      height: var(--bar-max-height);
      width: 90vw;
      max-width: var(--bar-max-width);
      max-height: var(--bar-hint-height);
      background-color: white;
      box-shadow: 0px 0px 32px 3px rgba(0,0,0,0.13);
      transition: transform 200ms ease-out;
    }
    [bar] > * {
      flex-shrink: 0;
    }
    [bar][state="peek"] {
      transform: translate3d(0, calc(100% - var(--bar-peek-height)), 0);
    }
    [bar][state="hint"] {
      transform: translate3d(0, 0, 0);
    }
    [bar][state="over"] {
      transform: translate3d(0, calc(100% - var(--bar-over-height)), 0);
    }
    [bar][state="open"] {
      max-height: var(--bar-max-height);
      transform: translate3d(0, 0, 0);
    }
    [toolbars] {
      display: inline-block;
      white-space: nowrap;
      height: 57px;
      width: 100%;
      overflow: hidden;
      box-sizing: border-box;
      border-bottom: 1px solid rgba(0,0,0,0.05);
    }
    [toolbar] {
      display: inline-flex;
      align-items: center;
      height: 56px;
      width: 100%;
      transition: transform 100ms ease-in-out;
    }
    [toolbar] > *:not(span):not(input) {
      margin: 16px;
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
    /* TODO(sjmiles): where are these extra px coming from? */
    [search][toolbar][open] {
      transform: translate3d(calc(-100% - 4px), 0, 0);
    }
    [search][toolbar] input {
      flex: 1;
      outline: none;
      font-size: 18px;
      border: none;
      line-height: 24px;
    }
    [settings][toolbar][open] {
      transform: translate3d(calc(-200% - 7px), 0, 0);
    }
    [contents] {
      flex: 1;
      display: inline-block;
      white-space: nowrap;
      width: 100%;
      overflow: hidden;
    }
    [bar][state="open"] [contents] {
      overflow-y: auto;
    }
    [content] {
      display: inline-block;
      width: 100%;
      vertical-align: top;
      transition: transform 100ms ease-in-out;
    }
    [content]:not([open]) {
      height: 0px;
      overflow: hidden;
    }
    [suggestions][content]:not([open]) {
      transform: translate3d(-100%, 0, 0);
    }
    [settings][content][open] {
      transform: translate3d(calc(-100% - 3px), 0, 0);
    }
    [modal] {
      padding: 32px;
      border: 1px solid orange;
      z-index: 0;
    }
    [modal]:hover {
      position: relative;
      z-index: 0;
    }
    ::slotted([slotid=modal]) {
      position: fixed;
      top: 0;
      bottom: 0;
      max-width: var(--max-width);
      width: 100vw;
      margin: 0 auto;
      padding-bottom: var(--bar-space-width);
      box-sizing: border-box;
      pointer-events: none;
      color: black;
    }
    ::slotted([slotid=suggestions]) {
      display: flex;
      flex-direction: column;
      padding: 6px 10px 10px 10px;
    }
    [tools] {
      position: fixed;
      right: 0;
      width: 80vw;
      top: 0;
      bottom: 0;
      box-shadow: 0px 0px 32px 3px rgba(0,0,0,0.13);
      transform: translate3d(120%, 0, 0);
      transition: transform 200ms ease-in-out;
      overflow: auto;
      background-color: white;
    }
    [tools][open] {
      z-index: 10000;
      transform: translate3d(0,0,0);
    }
    avatar {
      --avatar-size: 24px;
      --large-avatar-size: 40px;
      display: inline-block;
      height: var(--avatar-size);
      width: var(--avatar-size);
      min-width: var(--avatar-size);
      border-radius: 100%;
      border: 1px solid whitesmoke;
      background: gray center no-repeat;
      background-size: cover;
    }
  </style>
  <!-- -->
  <div scrim open$="{{scrimOpen}}" on-click="_onScrimClick"></div>
  <!-- -->
  <slot name="modal"></slot>
  <slot></slot>
  <!-- adds space at the bottom of the static flow so no actual content is ever covered by the app-bar -->
  <div barSpacer></div>
  <!-- -->
  <div bar state$="{{barState}}" open$="{{barOpen}}" over$="{{barOver}}" on-mouseenter="_onBarEnter" on-mouseleave="_onBarLeave">
    <div touchbar on-click="_onTouchbarClick"></div>
    <div toolbars on-click="_onBarClick">
      <div main toolbar open$="{{mainToolbarOpen}}">
        <a href="{{launcherHref}}" title="Go to Launcher">${AppIcon}</a>
        <span title="{{title}}">{{title}}</span>
        <!-- <icon on-click="_onExperimentClick">update</icon> -->
        <icon on-click="_onSearchClick">search</icon>
        <icon on-click="_onSettingsClick">settings</icon>
      </div>
      <div search toolbar open$="{{searchToolbarOpen}}">
        <icon on-click="_onMainClick">arrow_back</icon>
        <input placeholder="Search" value="{{searchText}}" on-keypress="_onKeypress" on-input="_onSearchChange" on-blur="_onSearchCommit">
        <icon>search</icon>
      </div>
      <div settings toolbar open$="{{settingsToolbarOpen}}">
        <icon on-click="_onMainClick">arrow_back</icon>
        <span style="flex: 1;"></span>
        <avatar title="{{avatar_title}}" style="{{avatar_style}}" on-click="_onAvatarClick"></avatar>
      </div>
    </div>
    <div contents>
      <div suggestions content open$="{{suggestionsContentOpen}}">
        <slot name="suggestions" slot="suggestions" on-plan-choose="_onChooseSuggestion"></slot>
      </div>
      <settings-panel settings content open$="{{settingsContentOpen}}" users="{{users}}" user="{{user}}" user_picker_open="{{userPickerOpen}}" friends="{{users}}" on-user="_onSelectUser"></settings-panel>
    </div>
  </div>
  <!-- -->
  <icon style="position: fixed; right: 0px; bottom: 0px;" on-click="_onToolsClick">assessment</icon>
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
  static get observedAttributes() { return ['showhint', 'arc', 'title', 'users']; }
  get template() {
    return template;
  }
  _getInitialState() {
    return {
      barState: 'peek',
      toolState: 'main',
      // TODO(sjmiles): include manifest or other directives?
      launcherHref: `${location.origin}${location.pathname}`,
      toolsOpen: false
    };
  }
  _update({}, {}, oldProps, oldState) {
  }
  _render(props, state) {
    if (state.barState === 'peek') {
      state.toolState = 'main';
    }
    const {toolState, barState, toolsOpen} = state;
    const barOpen = barState === 'open';
    const mainOpen = toolState === 'main';
    const searchOpen = toolState === 'search';
    const settingsOpen = toolState === 'settings';
    const userOpen = toolState === 'user';
    const renderModel = {
      scrimOpen: barOpen || toolsOpen,
      mainToolbarOpen: mainOpen,
      searchToolbarOpen: searchOpen,
      suggestionsContentOpen: mainOpen || searchOpen,
      settingsToolbarOpen: settingsOpen || userOpen,
      settingsContentOpen: settingsOpen,
      userContentOpen: userOpen
    };
    return [props, state, renderModel];
  }
  _didRender(props, state, oldProps, oldState) {
    if (state.toolState === 'search' && oldState.toolState !== 'search') {
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
      this._setState({barState: 'peek'});
    }
  }
  _onTouchbarClick() {
    if (this._state.barState !== 'over') {
      this._setState({barState: 'open'});
    }
  }
  _onBarClick() {
    if (this._state.barState !== 'open') {
      this._setState({barState: 'open'});
    }
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
          this._setState({barState: 'peek'});
          break;
      }
    }
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
    this._fire('suggestion', suggestion);
    this._setState({barState: 'peek'});
  }
  _onSelectUser(e, user) {
    this._fire('select-user', user);
    this._setState({userPickerOpen: false});
  }
  _onExperimentClick(e) {
    e.stopPropagation();
    this._fire('experiment');
  }
  _onToolsClick() {
    this._setState({toolsOpen: !this._state.toolsOpen});
  }
  _onAvatarClick() {
    this._setState({userPickerOpen: !this._state.userPickerOpen});
  }
  _onSearchChange(e) {
    // TODO(sjmiles): backend search is a bit slow to do while typing, perhaps we use simple-mode
    // text search to provide immediate results?
    const search = e.target.value;
    // throttle re-planning until typing has stopped
    const delay = 500;
    const commit = () => this._commitSearch(search);
    this._searchDebounce = ArcsUtils.debounce(this._searchDebounce, commit, delay);
  }
  _commitSearch(search) {
    search = search || '';
    // TODO(sjmiles): removed this check so speech-input can update the search box, is it harmful?
    //if (this._state.search !== search) {
      //this._setState({search});
      this._fire('search', search);
      //this._fire('open', true);
    //}
  }
}

customElements.define('shell-ui', ShellUi);
