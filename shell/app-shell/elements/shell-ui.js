// code libs
import ArcsUtils from '../lib/arcs-utils.js';
import Xen from '../../components/xen/xen.js';

// elements
import './arc-cloud.js';
import './shell-handles.js';
import './user-picker.js';
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

<app-modal shown$="{{modalShown}}" on-click="_onScrimClick">
  <app-dialog open$="{{userPickerOpen}}">
    <user-picker users="{{users}}" on-selected="_onSelectedUser"></user-picker>
  </app-dialog>
  <menu-panel
    arc="{{arc}}" open="{{menuOpen}}" avatar_title="{{avatarTitle}}" avatar_style="{{avatarStyle}}" friends="{{friends}}" avatars="{{avatars}}"
    on-close="_onMenuClose" on-user="_onSelectUser" on-cast="_onMenuCast" on-tools="_onToolsClick" on-share="_onData"
  ></menu-panel>
</app-modal>

<app-main launcher$="{{launcher}}" style="{{shellStyle}}">
  <!-- toolbar is here only to reserve space in the static flow (see also: footer) -->
  <toolbar>
    <!-- app-toolbar is position-fixed -->
    <app-toolbar style="{{shellStyle}}">
      <a href="{{launcherUrl}}" title="Go to Launcher">${AppIcon}</a>
      <arc-title style="{{titleStatic}}" on-click="_onStartEditingTitle" unsafe-html="{{description}}"></arc-title>
      <toolbar-buttons>
        <icon on-click="_onMenuClick">more_vert</icon>
      </toolbar-buttons>
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

  <!-- footer is here only to reserve space in the static flow (see also: toolbar) -->
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
      <!-- <local-data manifest="{{manifest}}" on-update-manifest="_onUpdateManifest" on-promote-manifest="_onPromoteManifest"></local-data> -->
      <manifest-data manifests="{{manifests}}" exclusions="{{exclusions}}" on-exclusions="_onData"></manifest-data>
    </div>
  </simple-tabs>
</app-tools>

`;

const log = Xen.Base.logFactory('ShellUi', '#294740');

class ShellUi extends Xen.Base {
  static get observedAttributes() {
    return ['config', 'manifests', 'exclusions', 'user', 'key', 'metadata', 'theme', 'step'];
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
      share: 0,
      userPickerOpen: false,
      sharePickerOpen: false,
      launcherUrl: `${location.origin}${location.pathname}`
    };
  }
  _update(props, state, lastProps, lastState) {
    // TODO(sjmiles): only for console debugging
    window.arc = state.arc;
    const {config, key, user} = props;
    const {plan, plans, search, metadata, description} = state;
    if (config && config !== lastProps.config) {
      this._consumeConfig(config, state);
    }
    if (config) {
      localStorage.setItem('0-3-arcs-dev-tools', state.toolsVisible ? 'open' : 'closed');
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
    //if (!plan && plans && plans.length && (config.launcher || config.profiler)) {
    //  state.step = plans[0].plan;
    //}
    if (metadata && metadata.description) {
      state.description = metadata.description;
    }
    this._fire('exclusions', state.exclusions);
    this._fire('arc', state.arc);
    this._fire('plans', state.plans);
  }
  _consumeConfig(config) {
    let user = null;
    let selectedUser = config.user;
    if (selectedUser === 'new') {
      selectedUser = null;
      user = this._newUserPrompt();
      log('new user', user);
    }
    this._setState({
      selectedUser,
      user,
      toolsVisible: config.arcsToolsVisible
    });
  }
  _consumePlans(plans, search) {
    let suggestions = plans;
    // If there is a search, plans are already filtered
    if (!search) {
      // Otherwise only show plans that don't populate a root.
      suggestions = plans.filter(
        // TODO(seefeld): Don't hardcode `root`
        // TODO(sjmiles|mmandlis): name.includes catches all variants of `root` (e.g. `toproot`), the tags
        // test only catches `#root` specifically
        ({plan}) => plan.slots && !plan.slots.find(s => s.name.includes('root') || s.tags.includes('#root'))
      );
    }
    this._setState({suggestions});
  }
  _render({config, manifests, exclusions, key, user, theme, step}, state) {
    //log(this._state);
    const {metadata} = state;
    const avatarUrl = user && user.avatar ? user.avatar : `${shellPath}/assets/avatars/user (0).png`;
    const render = {
      config,
      manifests,
      exclusions,
      key,
      user,
      step,
      avatarStyle: `background: url('${avatarUrl}') center no-repeat; background-size: cover;`,
      avatarTitle: user && user.name || '',
      modalShown: Boolean(state.userPickerOpen || state.sharePickerOpen || state.menuOpen),
      hostConfig: user && config,
      shellStyle: {
        backgroundColor: theme && theme.mainBackground,
        color: theme && theme.mainColor
      }
    };
    return [state, render];
  }
  _didRender(props, {toolsVisible}) {
    Xen.Template.setBoolAttribute(this, 'expanded', Boolean(toolsVisible));
  }
  _setState(state) {
    if (super._setState(state)) {
      log(state);
    }
  }
  _onToolsClick() {
    const {toolsVisible} = this._state;
    this._setState({toolsVisible: !toolsVisible});
  }
  _onSelectUser() {
    this._setState({userPickerOpen: true});
  }
  _onSelectedUser(e, selectedUser) {
    this._setState({selectedUser, userPickerOpen: false});
  }
  _onData(e, data) {
    this._setState({[e.type]: data});
  }
  // TODO(sjmiles): need to collapse (at least some) logic into update to handle arc correctly
  _onSearch(e, {search}) {
    const state = this._state;
    if (search !== state.search && state.arc) {
      log('search', search);
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
    if (this._setState({step})) {
      log('step', step);
    }
  }
  _onPlan(e, plan) {
    if (this._setState({plan})) {
      log('plan', plan);
      const {arc, metadata} = this._state;
      if (metadata) {
        this._updateArcDescription(arc, metadata);
      }
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

customElements.define('shell-ui', ShellUi);