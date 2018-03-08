// code libs
import ArcsUtils from '../lib/arcs-utils.js';
import Xen from '../../components/xen/xen.js';

// elements
import './arc-config.js';
import './arc-cloud.js';
import './shell-handles.js';
import './user-picker.js';
import './share-picker.js';
import './menu-panel.js';
import './arc-host.js';
import './arc-footer.js';

// components
import '../../components/toggle-button.js';
import '../../components/simple-tabs.js';
import '../../components/corellia-xen/cx-input.js';
import '../../components/good-map.js';
import '../../components/video-controller.js';

// tools
import '../../components/arc-tools/handle-explorer.js';
import '../../components/arc-tools/local-data.js';
import '../../components/arc-tools/xen-explorer.js';
import '../../components/arc-tools/manifest-data.js';
import '../../components/arc-tools/shell-particles.js';

// strings
import Css from './shell-ui.css.js';
import AppIcon from './icon.svg.js';

// globals
/* global shellPath */

// templates
const Main = Xen.html`

<arc-config rootpath="{{shellPath}}" on-config="_onData"></arc-config>
<arc-cloud
  config="{{config}}"
  userid="{{selectedUser}}"
  manifests="{{persistedManifests}}"
  arc="{{arc}}"
  key="{{key}}"
  metadata="{{metadata}}"
  plans="{{plans}}"
  plan="{{plan}}"
  on-users="_onData"
  on-manifests="_onData"
  on-exclusions="_onData"
  on-user="_onData"
  on-friends="_onData"
  on-avatars="_onData"
  on-key="_onData"
  on-metadata="_onData"
  on-step="_onData"
></arc-cloud>

<shell-handles users="{{users}}" user="{{user}}" arc="{{arc}}" visited="{{visited}}" on-theme="_onData"></shell-handles>

<app-modal shown$="{{modalShown}}" on-click="_onScrimClick">

  <app-dialog open$="{{userPickerOpen}}">
    <user-picker users="{{users}}" on-selected="_onSelectedUser"></user-picker>
  </app-dialog>

  <app-dialog open$="{{sharePickerOpen}}">
    <share-picker share="{{share}}" on-share="_onShare"></share-picker>
  </app-dialog>

  <menu-panel
    arc="{{arc}}"
    open="{{menuOpen}}"
    avatar_title="{{avatarTitle}}"
    avatar_style="{{avatarStyle}}"
    friends="{{friends}}"
    avatars="{{avatars}}"
    on-close="_onMenuClose"
    on-user="_onSelectUser"
    on-cast="_onMenuCast"></menu-panel>

</app-modal>
<app-main launcher$="{{launcher}}" style="{{shellStyle}}">

  <!-- toolbar is here only to reserve space in the static flow (see also: footer) -->
  <toolbar>
    <!-- app-toolbar is position-fixed -->
    <app-toolbar style="{{shellStyle}}">
      <span title="Arcs" on-click="_onNavClick" style="cursor: pointer;">${AppIcon}</span>
      <!--<img title="Arcs" on-click="_onNavClick" src="../logo_24x24.svg" style="cursor: pointer;">-->
      <arc-title style="{{titleStatic}}" on-click="_onStartEditingTitle" unsafe-html="{{description}}"></arc-title>
      <toolbar-buttons>
        <icon on-click="_onMenuClick">more_vert</icon>
      </toolbar-buttons>
      <!--
      <avatar title="{{avatarTitle}}" style="{{avatarStyle}}" on-click="_onSelectUser"></avatar>
      <toolbar-buttons>
        <toggle-button title="{{shareStateTitle}}" state="{{share}}" icons="lock person people" on-click="_onChooseShare"></toggle-button>
        <toggle-button title="Cast" on-state="_onCastState" icons="cast cast_connected"></toggle-button>
        <a href="{{launcherUrl}}"><icon>apps</icon></a>
        <icon on-click="_onMenuClick">menu</icon>
      </toolbar-buttons>
      -->
    </app-toolbar>
  </toolbar>

  <arc-host
    config="{{hostConfig}}"
    manifests="{{manifests}}"
    exclusions="{{exclusions}}"
    plans="{{plans}}"
    plan="{{step}}"
    suggestions="{{suggestions}}"
    on-arc="_onData"
    on-plans="_onData"
    on-plan="_onPlan"
  >
    <slot></slot>
  </arc-host>

  <footer>
    <!-- arc-footer is position-fixed -->
    <arc-footer dots="{{dots}}" on-suggest="_onSuggest" on-search="_onSearch">
      <slot name="suggestions"></slot>
    </arc-footer>
  </footer>

</app-main>
<app-tools>

  <shell-particles arc="{{arc}}"></shell-particles>
  <simple-tabs>
    <div tab="Handle Explorer">
      <handle-explorer arc="{{arc}}"></handle-explorer>
    </div>
    <div tab="Xen Explorer">
      <xen-explorer></xen-explorer>
    </div>
    <div tab="Manifests">
      <local-data manifest="{{manifest}}" on-update-manifest="_onUpdateManifest" on-promote-manifest="_onPromoteManifest"></local-data>
      <manifest-data manifests="{{manifests}}" exclusions="{{exclusions}}" on-exclusions="_onExclusions"></manifest-data>
    </div>
  </simple-tabs>

</app-tools>

`;

class ShellUi extends Xen.Base {
  static get observedAttributes() { return []; }
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
      share: 0,
      userPickerOpen: false,
      sharePickerOpen: false
    };
  }
  _update(props, state, lastProps, lastState) {
    // TODO(sjmiles): only for console debugging
    window.arc = state.arc;
    const {config, user, key, plans, search} = state;
    if (config && config !== lastState.config) {
      this._consumeConfig(config);
    }
    if (user) {
      state.selectedUser = user.id;
      ArcsUtils.setUrlParam('user', user.id);
    }
    if (key) {
      ArcsUtils.setUrlParam('arc', key);
    }
    if (plans && (plans !== lastState.plans || search !== lastState.search)) {
      this._consumePlans(state.plans, state.search);
    }
    super._update(props, state);
  }
  _consumeConfig(config) {
    let configkey = config.key || '';
    if (!config.key) {
      config.key = 'launcher';
    }
    if (config.key === 'launcher') {
      config.soloPath = 'artifacts/launcher.manifest';
      config.launcher = true;
      configkey = '';
    }
    if (config.key === 'profile') {
      config.soloPath = 'artifacts/profile.manifest';
      config.profiler = true;
      configkey = '*';
    }
    let user = null;
    let selectedUser = config.user;
    if (selectedUser === 'new') {
      selectedUser = null;
      user = this._newUserPrompt();
      ShellUi.log('new user', user);
    }
    this._setState({
      selectedUser,
      configkey,
      user,
      //toolsVisible: config.arcsToolsVisible
    });
  }
  _consumePlans(plans, search) {
    let suggestions = plans;
    // If there is a search, plans are already filtered
    if (!search) {
      // Otherwise only show plans that don't populate a root.
      // TODO(seefeld): Don't hardcode `root`
      suggestions = plans.filter(
        // TODO(sjmiles|mmandlis): name.includes catches all variants of `root` (e.g. `toproot`), the tags
        // test only catches `#root` specifically
        ({plan}) => plan.slots && !plan.slots.find(s => s.name.includes('root') || s.tags.includes('#root'))
      );
    }
    this._setIfDirty({suggestions});
  }
  _render({}, {
    config,
    user,
    users,
    friends,
    avatars,
    selectedUser,
    userPickerOpen,
    sharePickerOpen,
    menuOpen,
    configkey,
    manifests,
    exclusions,
    key,
    arc,
    metadata,
    share,
    suggestions,
    plans,
    plan,
    step,
    theme
  }) {
    //ShellUi.log(this._state);
    const shellStyle = {
      backgroundColor: theme && theme.mainBackground,
      color: theme && theme.mainColor
    };
    const avatarUrl = user && user.avatar ? user.avatar : `${shellPath}/assets/avatars/user (0).png`;
    const avatarStyle = `background: url('${avatarUrl}') center no-repeat; background-size: cover;`;
    const render = {
      shellPath,
      avatarStyle,
      avatarTitle: user && user.name || '',
      users,
      config,
      userPickerOpen,
      sharePickerOpen,
      menuOpen,
      modalShown: Boolean(userPickerOpen || sharePickerOpen || menuOpen),
      selectedUser,
      user,
      hostConfig: user && config,
      friends,
      avatars,
      manifests,
      exclusions,
      arc,
      key,
      metadata,
      description: metadata && metadata.description,
      share,
      suggestions,
      plans,
      plan,
      step,
      shellStyle
    };
    return render;
  }
  _didRender(props, {toolsVisible}) {
    Xen.Template.setBoolAttribute(this, 'expanded', Boolean(toolsVisible));
  }
  _onNavClick() {
    const {toolsVisible} = this._state;
    this._setIfDirty({toolsVisible: !toolsVisible});
  }
  _onSelectUser() {
    this._setIfDirty({userPickerOpen: true});
  }
  _onSelectedUser(e, selectedUser) {
    this._setIfDirty({selectedUser, userPickerOpen: false});
  }
  _onMenuShare() {
    this._setIfDirty({sharePickerOpen: true});
  }
  _onShare(e, share) {
    this._setIfDirty({share, sharePickerOpen: false});
  }
  _onData(e, data) {
    const property = e.type.replace(/-/g, '');
    if (this._setIfDirty({[property]: data})) {
      ShellUi.log(property, data);
    }
  }
  // TODO(sjmiles): need to collapse (at least some) logic into update to handle arc correctly
  _onSearch(e, {search}) {
    const state = this._state;
    if (search !== state.search && state.arc) {
      ShellUi.log('search', search);
      search = search.trim().toLowerCase();
      // TODO(sjmiles): installing the search term should be the job of arc-host
      // TODO(sjmiles): setting search to '' causes an exception at init-search.js|L#29)
      state.arc.search = search && search !== '*' ? search : null;
      // re-plan only if the search has changed (beyond simple filtering)
      if ((state.search && search && search !== '*') || (state.search !== '*' && search && search !== '*')) {
        this._setState({plans: null});
      }
      this._setState({search});
    }
  }
  _onSuggest(e, step) {
    if (this._setIfDirty({step})) {
      ShellUi.log('step', step);
    }
  }
  _onPlan(e, plan) {
    if (this._setIfDirty({plan})) {
      ShellUi.log('plan', plan);
      const {arc, description, metadata} = this._state;
      this._updateArcDescription(arc, metadata);
    }
  }
  async _updateArcDescription(arc, metadata) {
    // TODO(sjmiles): move to update
    const description = await ArcsUtils.describeArc(arc);
    if (description && metadata.description !== description) {
      metadata.description = description;
      this._setState({metadata: Object.assign(Object.create(null), metadata)});
    }
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
}

ShellUi.log = Xen.Base.logFactory('ShellUi', '#294740');
customElements.define('shell-ui', ShellUi);