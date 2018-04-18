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
import '../components/model-input.js';
import '../components/video-controller.js';
import '../components/firebase-upload.js';
// deprecated!
import '../components/x-list.js';

// code libs
import Xen from '../components/xen/xen.js';
import ArcsUtils from './lib/arcs-utils.js';
import Const from './constants.js';

// globals
/* global shellPath */

/*
  General notes on steps:
    'step' comes out of arc-cloud (replay) or footer (user interaction)
    'step' is sent to arc-host for instantiation
    'plan' comes out of arc-host and is sent to arc-cloud to save in 'steps'

  arc-cloud
    TODO: refactor into more meaningful concerns ('cloud' is ad-hoc, there are too many properties)

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

  shell-handles
    visited: visited arc data from Firebase
    on-launcherarcs: arc data formatted for local handle
    TODO: isolate conversions so data doesn't criss-cross like this

  arc-host
    plan: schedules the plan for instantiation ('step' goes in)
    on-plan: most recent plan that was instantiated ('plan' comes out)
*/

// templates
const html = Xen.html;
const template = html`
  <style>
    :host {
      display: block;
    }
  </style>

  <arc-config rootpath="{{shellPath}}" on-config="_onStateData"></arc-config>

  <arc-cloud
    manifests="{{persistedManifests}}"
    exclusions="{{persistedExclusions}}"
    config="{{config}}"
    userid="{{selectedUser}}"
    user="{{user}}"
    key="{{key}}"
    arc="{{arc}}"
    metadata="{{metadata}}"
    share="{{share}}"
    plans="{{plans}}"
    plan="{{plan}}"
    launcherarcs="{{launcherarcs}}"
    on-manifests="_onStateData"
    on-exclusions="_onStateData"
    on-users="_onStateData"
    on-user="_onUser"
    on-friends="_onStateData"
    on-avatars="_onStateData"
    on-arcs="_onStateData"
    on-key="_onStateData"
    on-metadata="_onStateData"
    on-step="_onStateData"
    on-share="_onStateData"
  ></arc-cloud>

  <shell-handles
    users="{{users}}"
    user="{{user}}"
    key="{{key}}"
    arc="{{arc}}"
    visited="{{arcs}}"
    on-launcherarcs="_onStateData"
    on-theme="_onStateData"
  ></shell-handles>

  <arc-host
    config="{{hostConfig}}"
    manifests="{{manifests}}"
    exclusions="{{exclusions}}"
    plan="{{step}}"
    on-arc="_onStateData"
    on-plan="_onStateData"
  >
  </arc-host>

  <extension-data arc="{{arc}}" on-manifests="_onExtensionManifests"></extension-data>

  <shell-ui
    config="{{config}}"
    manifests="{{manifests}}"
    exclusions="{{exclusions}}"
    users="{{users}}"
    user="{{user}}"
    key="{{key}}"
    arc="{{arc}}"
    description="{{description}}"
    friends="{{friends}}"
    avatars="{{avatars}}"
    share="{{share}}"
    theme="{{theme}}"
    open="{{drawerOpen}}"
    requestnewuser="{{requestNewUser}}"
    on-exclusions="_onExclusions"
    on-share="_onStateData"
    on-step="_onStateData"
    on-search="_onStateData"
    on-open="_onDrawerOpen"
    on-select-user="_onSelectUser"
    on-new-user="_onNewUser"
  >
    <slot></slot>
    <slot name="suggestions" slot="suggestions"></slot>
  </shell-ui>

`;

const log = Xen.logFactory('AppShell', '#6660ac');

class AppShell extends Xen.Debug(Xen.Base, log) {
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
    const {config, selectedUser, user, key, arc, description, metadata, share, planificator, search, plan, step} = state;
    // TODO(sjmiles): only for console debugging
    window.arc = arc;
    window.app = this;
    // ^
    if (config && config !== oldState.config) {
      this._consumeConfig(state, config);
    }
    if (selectedUser) {
      this._consumeSelectedUser(user, selectedUser);
    }
    if (config && config === oldState.config && !user && !selectedUser) {
      this._setState({requestNewUser: true});
    }
    if (arc && !planificator) {
      let planificator = ArcsUtils.createPlanificator(arc);
      planificator.registerPlansChangedCallback((current) => {
        let plans = current.plans;
        if (!plan && plans && plans.length && (config.launcher || config.profiler)) {
          state.injectedStep = plans[0].plan;
        }
        plans.generations = current.generations;
        this._setState({plans});
      });
      planificator.registerSuggestChangedCallback((suggestions) => {
        this._setState({drawerOpen: Boolean(suggestions)});
      });
      state.planificator = planificator;
    }
    if (search !== oldState.search) {
      planificator.setSearch(search);
    }
    if (metadata) {
      state.description = metadata.description;
    }
    if (plan && plan !== state.consumedPlan) {
      state.consumedPlan = plan;
      this._consumePlan(arc, description);
    }
  }
  _render({}, state) {
    const {config, user, step, injectedStep} = state;
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
      config.key = Const.KEYS.launcher;
    }
    if (config.key === Const.KEYS.launcher) {
      state.description = 'Launcher';
      config.soloPath = state.launcherSoloPath;
      config.launcher = true;
      key = '';
    }
    if (config.key === Const.KEYS.profile) {
      config.soloPath = state.profileSoloPath;
      config.profiler = true;
      key = '*';
    }
    const selectedUser = config.user;
    this._setState({key, selectedUser});
  }
  _consumeSelectedUser(user, selectedUser) {
    // TODO(sjmiles): explain `user` vs `selectedUser`
    if (user && user.id !== selectedUser) {
      this._setState({selectedUser, user});
    }
  }
  async _consumePlan(arc, description) {
    // arc has changed, generate new description
    description = await ArcsUtils.describeArc(arc) || description;
    this._setState({description});
    // update metadata (should be done in persistent-arc instead)
    let metadata = this._state.metadata;
    // push description into metadata
    if (!metadata || metadata.description !== description) {
      metadata = metadata ? Xen.clone(metadata) : Xen.nob();
      metadata.description = description;
      this._setState({metadata});
    }
  }
  _onUser(e, data) {
    // if clearing `user`, also clear `selectedUser`
    if (!data) {
      this._setState({selectedUser: data});
    }

    this._setState({user: data});
  }
  _onStateData(e, data) {
    this._setState({[e.type]: data});
  }
  _onExclusions(e, persistedExclusions) {
    this._setState({persistedExclusions});
  }
  _onExtensionManifests(e, manifests) {
    log('received extension manifests: ', manifests);
  }
  _onSelectUser(e, selectedUser) {
    this._setState({selectedUser});
  }
  _onNewUser(e, name) {
    this._setState({user: {name}, requestNewUser: false});
  }
  _onDrawerOpen(e, drawerOpen) {
    this._setState({drawerOpen});
  }
}

customElements.define('app-shell', AppShell);

export default AppShell;
