// elements
import './elements/shell-ui.js';
import './elements/arc-config.js';
// components
import '../components/suggestion-element.js';
// code
import Xen from '../components/xen/xen.js';
// globals
/* global shellPath */

// templates
const template = Xen.html`

  <arc-config rootpath="{{shellPath}}" on-config="_onData"></arc-config>

  <arc-cloud
    config="{{config}}"
    userid="{{selectedUser}}"
    manifests="{{persistedManifests}}"
    exclusions="{{persistedExclusions}}"
    key="{{key}}"
    arc="{{arc}}"
    metadata="{{metadata}}"
    share="{{share}}"
    plans="{{plans}}"
    plan="{{plan}}"
    launcherarcs="{{launcherarcs}}"
    on-users="_onData"
    on-user="_onData"
    on-friends="_onData"
    on-avatars="_onData"
    on-manifests="_onData"
    on-exclusions="_onData"
    on-key="_onData"
    on-metadata="_onData"
    on-step="_onData"
    on-arcs="_onData"
  ></arc-cloud>

  <shell-handles
    users="{{users}}"
    user="{{user}}"
    arc="{{arc}}"
    visited="{{arcs}}"
    on-theme="_onData"
    on-launcherarcs="_onData"
  ></shell-handles>

  <shell-ui
    config="{{config}}"
    manifests="{{manifests}}"
    exclusions="{{exclusions}}"
    user="{{user}}"
    key="{{key}}"
    metadata="{{metadata}}"
    theme="{{theme}}"
    step="{{step}}"
    on-exclusions="_onExclusions"
    on-arc="_onData"
    on-share="_onData"
    on-plans="_onData"
    on-plan="_onData"
  >
      <div slotid="toproot"></div>
      <div slotid="root"></div>
      <div slotid="modal"></div>
      <div slotid="suggestions" slot="suggestions"></div>
  </shell-ui>
`;

const log = Xen.logFactory('AppShell', '#6660ac');

const launcherKey = 'launcher';
const profileKey = 'profile';

class AppShell extends Xen.Base {
  get host() {
    return this;
  }
  get template() {
    return template;
  }
  _getInitialState() {
    return {
      launcherSoloPath: '../web/artifacts/launcher.manifest',
      profileSoloPath: '../web/artifacts/profile.manifest'
    };
  }
  _update(props, state, oldProps, oldState) {
    const {config, plan, plans} = state;
    if (config && config !== oldState.config) {
      this._consumeConfig(state, config);
    }
    if (!plan && plans && plans.length && (config.launcher || config.profiler)) {
      state.injectedStep = plans[0].plan;
    }
  }
  _consumeConfig(state, config) {
    let key = config.key || '';
    if (!config.key) {
      config.key = launcherKey;
    }
    if (config.key === launcherKey) {
      state.description = 'Launcher';
      config.soloPath = state.launcherSoloPath;
      config.launcher = true;
      key = '';
    }
    if (config.key === profileKey) {
      config.soloPath = state.profileSoloPath;
      config.profiler = true;
      key = '*';
    }
    // TODO(sjmiles): explain `user` vs `selectedUser`
    let user = null;
    let selectedUser = config.user;
    if (selectedUser === 'new') {
      selectedUser = null;
      log('new user', user);
      // TODO(sjmiles): need to port _newUserPrompt from old shell
      user = this._newUserPrompt();
    }
    this._setState({
      selectedUser,
      user,
      key
    });
  }
  _render({}, state) {
    const {step, injectedStep} = state;
    const render = {
      shellPath,
      step: step || injectedStep
    };
    return [state, render];
  }
  _onData(e, data) {
    const property = e.type;
    if (this._setIfDirty({[property]: data})) {
      log(property, data);
    }
  }
  _onExclusions(e, persistedExclusions) {
    this._setIfDirty({persistedExclusions});
  }
}

customElements.define('app-shell', AppShell);

export default AppShell;