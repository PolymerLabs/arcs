// code libs
import ArcsUtils from '../lib/arcs-utils.js';
import Xen from '../../components/xen/xen.js';
import Const from '../constants.js';

// elements
import './user-picker.js';
import './menu-panel.js';
import './arc-footer.js';

// components
import '../../components/toggle-button.js';
import '../../components/simple-tabs.js';
import '../../components/arc-tools/handle-explorer.js';
import '../../components/arc-tools/local-data.js';
import '../../components/arc-tools/xen-explorer.js';
import '../../components/arc-tools/manifest-data.js';
import '../../components/mic-input.js';

// strings
import Css from './shell-ui.css.js';
import AppIcon from './icon.svg.js';

// globals
/* global shellPath */

// templates
const Main = Xen.html`

<mic-input on-start="_onMicStart" on-end="_onMicEnd"></mic-input>

<app-modal shown$="{{modalShown}}" on-click="_onScrimClick">

  <app-dialog open$="{{userPickerOpen}}">
    <user-picker users="{{users}}" on-selected="_onSelectedUser" on-new-user="_onNewUser"></user-picker>
  </app-dialog>

  <menu-panel
    open="{{menuOpen}}"
    arc="{{arc}}"
    avatar_title="{{avatarTitle}}"
    avatar_style="{{avatarStyle}}"
    friends="{{friends}}"
    avatars="{{avatars}}"
    share="{{share}}"
    on-close="_onMenuClose"
    on-user="_onSelectUser"
    on-cast="_onMenuCast"
    on-tools="_onToolsClick"
    on-share="_onShare"
  ></menu-panel>

</app-modal>

<app-main launcher$="{{launcher}}" style="{{shellStyle}}">
  <!-- toolbar is here only to reserve space in the static flow (see also: footer) -->
  <toolbar>
    <!-- app-toolbar is position-fixed -->
    <app-toolbar style="{{shellStyle}}">
      <a trigger="launcher" href="{{launcherUrl}}" title="Go to Launcher">${AppIcon}</a>
      <arc-title id="arc-title" style="{{titleStatic}}" on-click="_onStartEditingTitle" unsafe-html="{{description}}"></arc-title>
      <toolbar-buttons>
        <icon hidden$="{{micHidden}}">mic</icon>
        <icon on-click="_onMenuClick">more_vert</icon>
      </toolbar-buttons>
    </app-toolbar>
  </toolbar>

  <slot></slot>

  <!-- footer is here only to reserve space in the static flow (see also: toolbar) -->
  <footer>
    <!-- arc-footer is position-fixed -->
    <arc-footer dots="{{dots}}" open="{{open}}" search="{{search}}" on-suggest="_onSuggest" on-search="_onSearch" on-open="_onOpen">
      <slot name="suggestions"></slot>
    </arc-footer>
  </footer>
</app-main>

<app-tools>
  <simple-tabs>
    <div tab="Handle Explorer">
      <handle-explorer arc="{{arc}}"></handle-explorer>
    </div>
    <div tab="Xen Explorer">
      <xen-explorer></xen-explorer>
    </div>
    <div tab="Manifests">
      <!-- <local-data manifest="{{manifest}}" on-update-manifest="_onUpdateManifest" on-promote-manifest="_onPromoteManifest"></local-data> -->
      <manifest-data manifests="{{manifests}}" exclusions="{{exclusions}}" on-exclusions="_onData"></manifest-data>
    </div>
  </simple-tabs>
</app-tools>

`;

const log = Xen.logFactory('ShellUi', '#294740');

class ShellUi extends Xen.Debug(Xen.Base, log) {
  static get observedAttributes() {
    return ['config', 'manifests', 'exclusions', 'users', 'user', 'friends', 'avatars',
        'key', 'arc', 'description', 'share', 'theme', 'open', 'requestnewuser'];
  }
  get css() {
    return Css;
  }
  get main() {
    return Main;
  }
  get template() {
    return `
      ${this.css}
      ${this.main}
    `;
  }
  _getInitialState() {
    return {
      shellPath,
      userPickerOpen: false,
      sharePickerOpen: false,
      launcherUrl: `${location.origin}${location.pathname}`,
      micHidden: true
    };
  }
  _update(props, state, lastProps, lastState) {
    const {config, key, user, description, requestnewuser} = props;
    const {plan, plans, search} = state;
    if (config && config !== lastProps.config) {
      this._consumeConfig(config, state);
    }
    if (config) {
      localStorage.setItem(Const.LOCALSTORAGE.tools, state.toolsVisible ? 'open' : 'closed');
    }
    if (user) {
      localStorage.setItem(Const.LOCALSTORAGE.user, user.id);
      ArcsUtils.setUrlParam('user', user.id);
      state.selectedUser = user.id;
    }
    if (key) {
      ArcsUtils.setUrlParam('arc', key);
    }
    if (requestnewuser && requestnewuser!=lastProps.requestnewuser) {
      this._setState({userPickerOpen: true});
    }
    this._fire('exclusions', state.exclusions);
  }
  _consumeConfig(config) {
    this._setState({
      toolsVisible: config.arcsToolsVisible
    });
  }
  _render(props, state) {
    const {config, user, key, theme} = props;
    const avatarUrl = user && user.avatar ? user.avatar : `${shellPath}/assets/avatars/user (0).png`;
    const render = {
      avatarStyle: `background: url('${avatarUrl}') center no-repeat; background-size: cover;`,
      avatarTitle: user && user.name || '',
      modalShown: Boolean(state.userPickerOpen || state.sharePickerOpen || state.menuOpen),
      shellStyle: {
        backgroundColor: theme && theme.mainBackground,
        color: theme && theme.mainColor
      }
    };
    return [props, state, render];
  }
  _didRender(props, {toolsVisible}) {
    Xen.Template.setBoolAttribute(this, 'expanded', Boolean(toolsVisible));
  }
  _onData(e, data) {
    if (this._setState({[e.type]: data})) {
      log(data);
    }
  }
  _onOpen(e, open) {
    this._fire('open', open);
  }
  _onToolsClick() {
    const {toolsVisible} = this._state;
    this._setState({toolsVisible: !toolsVisible, menuOpen: false});
  }
  _onSelectUser() {
    this._setState({userPickerOpen: true});
  }
  _onSelectedUser(e, selectedUser) {
    this._fire('select-user', selectedUser);
    this._setState({userPickerOpen: false});
  }
  _onNewUser(e, newUser) {
    this._setState({userPickerOpen: false});
    this._fire('new-user', newUser);
  }
  // TODO(sjmiles): need to collapse (at least some) logic into update to handle arc correctly
  _onSearch(e, {search}) {
    this._setState({search});
    this._fire('search', search);
  }
  _onMenuClick(e) {
    this._setState({menuOpen: true});
  }
  _onMenuClose() {
    this._setState({menuOpen: false});
  }
  _onScrimClick(e) {
    if (e.target === e.currentTarget) {
      this._setState({
        userPickerOpen: false,
        sharePickerOpen: false,
        menuOpen: false
      });
    }
  }
  _onSuggest(e, suggest) {
    this._fire('step', suggest);
  }
  _onShare(e, share) {
    this._fire('share', share);
  }
  _onMicStart() {
    this._setState({micHidden: false});
  }
  _onMicEnd(e, finalTranscript) {
    const lettersOnly = s => s.toLowerCase().replace(/[^A-Za-z0-9 ]/g, '');
    this._setState({micHidden: true});
    finalTranscript = lettersOnly(finalTranscript);
    if (!finalTranscript) {
      return;
    }
    log(`voice trigger: [${finalTranscript}]`);
    // see if `node` is a better match for `search` than `match`
    const findMatch = (node, trigger, search, match) => {
      //log(`node "${node.localName}" has trigger "${trigger}"`);
      if (trigger.includes(search)) {
        const diff = trigger.length - search.length;
        if (!match || match.diff > diff) {
          log(`matched "${trigger}"`);
          match = {diff, node};
        }
      }
      return match;
    };
    // find all nodes with `trigger` attribute
    let nodes = document.querySelectorAll('[trigger]');
    nodes = Array.from(nodes).concat(Array.from(this.host.querySelectorAll('[trigger]')));
    // find the node that contains `finalTranscript` with the least number of non-matching characters
    let match;
    for (const node of nodes) {
      const trigger = lettersOnly(node.getAttribute('trigger'));
      match = findMatch(node, trigger, finalTranscript, match);
    }
    // if we matched, value is the transcript
    if (match) {
      match.value = finalTranscript;
    }
    // if not, look for a prefix-match
    else {
      for (const node of nodes) {
        const trigger = lettersOnly(node.getAttribute('trigger'));
        if (finalTranscript.startsWith(trigger)) {
          match = {
            node,
            value: finalTranscript.slice(trigger.length).trim(),
          };
          log(`matched prefix "${trigger}"`);
          break;
        }
      }
    }
    // if there is a matching node, install value and click it
    if (match) {
      match.node.value = match.value;
      match.node.click();
      return;
    }
    // find a suggestion matching finalTranscript?
    const suggestions = document.querySelectorAll('suggestion-element');
    match = null;
    for (const suggestion of suggestions) {
      const trigger = suggestion.textContent.toLowerCase();
      match = findMatch(suggestion, trigger, finalTranscript, match);
    }
    // if there is a matching suggestion, click it
    if (match) {
      log(`voice: matched suggestion "${match.node.textContent}"`);
      match.node.click();
      return;
    }
    // if all else fails, use finalTranscript as suggestions search
    this._setState({search: finalTranscript});
  }
}

customElements.define('shell-ui', ShellUi);
