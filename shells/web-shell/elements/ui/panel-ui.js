/**
 * @license
 * Copyright 2020 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Xen} from '../../../lib/components/xen.js';
import IconStyle from '../../../lib/modalities/dom/components/icons.css.js';
import {WebConfig} from '../web-config.js';

// templates
const template = Xen.Template.html`
  <style>
    :host {
      flex: 1;
      display: flex;
      flex-direction: column;
      /* TODO(sjmiles): prevents over width, haven't root-caused why flex doesn't do this,
         flex-grow: 0; did nothing */
      max-width: 100%;
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
    [contents] {
      flex: 1;
      overflow-y: var(--content-overflow);
      overflow-x: hidden;
    }
    settings-panel {
      display: none;
      padding: 0 24px;
    }
    settings-panel[open] {
      display: block;
    }
    settings-panel pre {
      white-space: pre-wrap;
      margin: 0.5em 0;
    }
    settings-panel h3 {
      font-size: 1em;
      margin-block-start: 1em;
      margin-block-end: 0em;
    }
  </style>
  <div toolbars on-click="onToolbarsClick">
    <div main toolbar open$="{{mainToolbarOpen}}">
      <a href="{{launcherHref}}" title="Go to Launcher" on-click="onNoBubble"><icon>apps</icon></a>
      <input search placeholder="Search" value="{{search}}" on-focus="onSearchFocus" on-input="onSearchChange" on-blur="onSearchBlur" on-dblclick="onResetSearch">
      <icon hidden="{{hideMic}}" on-click="onListen">mic</icon>
      <icon hidden="{{hideClear}}" on-click="onClearSearch">highlight_off</icon>
      <icon on-click="onSettingsClick">settings</icon>
    </div>
    <div search toolbar open$="{{searchToolbarOpen}}">
      <icon on-click="onMainClick">arrow_back</icon>
    </div>
    <div settings toolbar open$="{{settingsToolbarOpen}}">
      <icon on-click="onMainClick">arrow_back</icon>
      <span style="flex: 1;">Settings</span>
      <avatar title="{{avatar_title}}" xen:style="{{avatar_style}}" on-click="onAvatarClick"></avatar>
    </div>
  </div>
  <div contents scrolltop="{{scrollTop:contentsScrollTop}}" on-click="onContentsClick">
    <div suggestions content open$="{{suggestionsContentOpen}}">
      <slot on-plan-choose="onChooseSuggestion"></slot>
    </div>
    <settings-panel settings content open$="{{settingsContentOpen}}" key="{{key}}" arc="{{arc}}" users="{{users}}" user="{{user}}" friends="{{friends}}" avatars="{{avatars}}" share="{{share}}" user_picker_open="{{userPickerOpen}}" on-user="onSelectUser" on-share="onShare" on-click="onSettingsPanelClick">
      <div unsafe-html="{{settings}}"></div>
    </settings-panel>
  </div>
`;

const log = Xen.logFactory('PanelUi', '#c6c0fc');

const searchDebounceMs = 300;

export class PanelUi extends Xen.Debug(Xen.Async, log) {
  static get observedAttributes() {
    return ['open', 'search'];
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
    const micVsClear = !props.search;
    return [state, {
      search: props.search || '',
      mainToolbarOpen: mainOpen,
      searchToolbarOpen: searchOpen,
      suggestionsContentOpen: mainOpen || searchOpen,
      settingsToolbarOpen: settingsOpen || userOpen,
      settingsContentOpen: settingsOpen,
      userContentOpen: userOpen,
      hideMic: !micVsClear,
      hideClear: micVsClear,
      settings: this.renderSettings()
    }];
  }
  renderSettings() {
    //return JSON.stringify(WebConfig.config, null, '  ');
    const users = WebConfig.config.userHistory.map(url => {
      const parts = url.split('/');
      const short = `${parts.slice(0, 3).join('/')}...${parts.slice(-1).join('/')}`;
      return short;
    });
    return Xen.html`
<h3>Version</h3>
<pre>${WebConfig.config.version}</pre>
<h3>Storage</h3>
<pre>${WebConfig.config.storage}</pre>
<h3>Planner Storage</h3>
<pre>${WebConfig.config.plannerStorage}</pre>
<!-- <h3>Recent Users</h3>
<select><option>${users.join('</option><option>')}</option></select> -->
    `;
  }
  commitSearch(search) {
    this.fire('search', search || '');
  }
  onMainClick(e) {
    this.state = {toolState: 'main'};
  }
  onSettingsClick(e) {
    this.state = {toolState: 'settings'};
  }
  onToolbarsClick(e) {
    e.stopPropagation();
    this.fire('open', true);
  }
  onContentsClick(e) {
    e.stopPropagation();
    this.fire('open', false);
  }
  onSettingsPanelClick(e) {
    e.stopPropagation();
  }
  onSearchChange(e) {
    const search = e.target.value;
    // don't re-plan until typing has stopped for this length of time
    this._debounce(`searchDebounce`, () => this.commitSearch(search), searchDebounceMs);
  }
  onClearSearch(e) {
    this.commitSearch('');
  }
  onResetSearch(e) {
    // Doubleclick on empty search box searches for '*'
    if (e.target.value === '') {
      this.commitSearch('*');
    }
  }
  onVoiceSearch(e, search) {
    this.commitSearch(search);
  }
  onNoBubble(e) {
    e.stopPropagation();
  }
}

customElements.define('panel-ui', PanelUi);
