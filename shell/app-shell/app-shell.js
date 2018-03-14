// elements
import './elements/shell-ui.js';
import './elements/arc-config.js';
import './elements/arc-cloud.js';
import './elements/shell-handles.js';
import './elements/extension-data.js';
import './elements/arc-host.js';

// components
import '../components/suggestion-element.js';

// for particle use
import '../components/corellia-xen/cx-input.js';
import '../components/good-map.js';
import '../components/video-controller.js';

// code libs
import Xen from '../components/xen/xen.js';
import ArcsUtils from './lib/arcs-utils.js';

// globals
/* global shellPath */

// templates
const template = Xen.html`

  <arc-config rootpath="{{shellPath}}" on-config="_onData"></arc-config>

  <!--
    arc-cloud
      TODO: refator into more meaningful concerns ('cloud' is ad-hoc, there are too many properties)

      manifests: are persisted to Firebase
      exclusions: are persisted to localStorage

      on-manifests: manifests from Firebase
      on-exclusions: manifests read from localStorage

      config: supplies arc key suggestion (could be a metakey, like '*', 'launcher', 'profiler')
              supplies launcher flag used to generate luancheruser
              (TODO: doesn't need 'config' for these two things)
      on-key: actual arc key determined after studying config.key
      on-metadata: metadata belonging to arc identified by key from on-key
      on-step: next step to playback based on arc metadata

      userid: used to construct faux 'user' record
      on-user: constructed 'user' record

      on-friends: friends data scraped out of handle boxing
      on-avatars: avatars data scraped out of handle boxing

      launcherarcs: local handle data for arcs data from arc-handles (can be modified by UI),
                    studies in order to update Firebase data
      on-arcs: arcs metadata for arcs owner by user from Firebase,
               fed to arc-handles for conversion to launcherarcs
               TODO: isolate conversions so data doesn't criss-cross like this
  -->
  <arc-cloud
    manifests="{{persistedManifests}}"
    exclusions="{{persistedExclusions}}"
    config="{{config}}"
    userid="{{selectedUser}}"
    key="{{key}}"
    arc="{{arc}}"
    metadata="{{metadata}}"
    share="{{share}}"
    plans="{{plans}}"
    plan="{{plan}}"
    launcherarcs="{{launcherarcs}}"
    on-manifests="_onData"
    on-exclusions="_onData"
    on-users="_onData"
    on-user="_onData"
    on-friends="_onData"
    on-avatars="_onData"
    on-arcs="_onData"
    on-key="_onData"
    on-metadata="_onData"
    on-step="_onData"
  ></arc-cloud>

  <!--
    shell-handles
      visited: visited arc data from Firebase
      on-launcherarcs: arc data formatted for local handle
      TODO: isolate conversions so data doesn't criss-cross like this
  -->
  <shell-handles
    users="{{users}}"
    user="{{user}}"
    arc="{{arc}}"
    visited="{{arcs}}"
    on-launcherarcs="_onData"
    on-theme="_onData"
  ></shell-handles>

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
  </arc-host>

  <extension-data arc="{{arc}}" on-manifests="_onExtensionManifests"></extension-data>

  <shell-ui
    config="{{config}}"
    manifests="{{manifests}}"
    exclusions="{{exclusions}}"
    user="{{user}}"
    key="{{key}}"
    arc="{{arc}}"
    metadata="{{metadata}}"
    theme="{{theme}}"
    step="{{step}}"
    on-exclusions="_onExclusions"
    on-share="_onData"
    on-suggest="_onData"
    on-search="_onData"
  >
    <slot></slot>
    <slot name="suggestions" slot="suggestions"></slot>
  </shell-ui>
`;

const log = Xen.logFactory('AppShell', '#6660ac');

const launcherKey = 'launcher';
const profileKey = 'profile';

class AppShell extends Xen.Base {
  // get host() {
  //   return this;
  // }
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
    const {config, arc, metadata, plans, search, suggest, plan} = state;
    // TODO(sjmiles): only for console debugging
    window.arc = state.arc;
    // ^
    if (config && config !== oldState.config) {
      this._consumeConfig(state, config);
    }
    if (!plan && plans && plans.length && (config.launcher || config.profiler)) {
      state.injectedStep = plans[0].plan;
    }
    if (plans && (plans !== oldState.plans || search !== oldState.search)) {
      this._consumePlans(plans, search);
    }
    if (suggest) {
      state.suggest = null;
      state.step = suggest;
    }
    if (search !== oldState.search) {
      this._consumeSearch(search, arc);
    }
    if (plan && plan !== oldState.plan && metadata) {
      this._consumePlan(arc, metadata);
    }
  }
  _render({}, state) {
    const {user, config, step, injectedStep} = state;
    const render = {
      shellPath,
      hostConfig: user && config,
      step: step || injectedStep
    };
    return [state, render];
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
  _consumeSearch(search, arc) {
    search = (search || '').trim().toLowerCase();
    // TODO(sjmiles): setting search to '' causes an exception at init-search.js|L#29)
    search = (search !== '') && (search !== '*') ? search : null;
    // re-plan only if the search has changed (beyond simple filtering)
    if (search !== arc.search) {
      this._setState({plans: null});
    }
    // TODO(sjmiles): installing the search term should probably be the job of arc-host
    arc.search = search;
  }
  _consumePlans(plans, search) {
    let suggestions = plans;
    // If there is a search, plans are already filtered
    if (!search) {
      // Otherwise only show plans that don't populate a root.
      suggestions = plans.filter(
        // TODO(seefeld): Don't hardcode `root`
        // TODO(sjmiles|mmandlis): name.includes catches all variants of `root` (e.g. `toproot`), the `tags`
        // test only catches `#root` specifically
        ({plan}) => plan.slots && !plan.slots.find(s => s.name.includes('root') || s.tags.includes('#root'))
      );
    }
    this._setState({suggestions});
  }
  async _consumePlan(arc, metadata) {
    if (metadata) {
      const description = await ArcsUtils.describeArc(arc);
      if (description && metadata.description !== description) {
        metadata.description = description;
        this._invalidate();
        //this._setState({metadata: Object.assign(Object.create(null), metadata)});
      }
    }
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
  _onExtensionManifests(e, manifests) {
    log('recieved extension manifests: ', manifests);
  }
}

customElements.define('app-shell', AppShell);

export default AppShell;