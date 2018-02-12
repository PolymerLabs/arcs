/**
@license
Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
 */

import ArcsUtils from "./lib/arcs-utils.js";

// core
import Xen from '../components/xen/xen.js';
import "./elements/arc-config.js";
import "./elements/arc-footer.js";
import "./elements/arc-handle.js";
import "./elements/arc-host.js";
import "./elements/arc-steps.js";
import "./elements/persistent-arc.js";
import "./elements/persistent-handles.js";
import "./elements/persistent-manifests.js";
import "./elements/persistent-user.js";
import "./elements/persistent-users.js";
import "./elements/remote-friends-profile-handles.js";
import "./elements/remote-profile-handles.js";
import "./elements/remote-shared-handles.js";
import "./elements/remote-visited-arcs.js";

// tools
import "../components/arc-tools/explorer-hotkey.js";
import "../components/arc-tools/handle-explorer.js";
import "../components/arc-tools/local-data.js";
import "../components/arc-tools/manifest-data.js";
import "../components/arc-tools/shell-particles.js";
import "../components/data-explorer.js";
import "../components/simple-tabs.js";
import "../components/suggestion-element.js";
import "../components/toggle-button.js";

// For particles.
import "../components/corellia-xen/cx-input.js";
import "../components/good-map.js";

const template = ArcsUtils.html`
<style>
  body {
    background-color: gray;
  }
  app-shell, [app-shell] {
    display: block;
    max-width: 640px;
    margin: 0 auto;
    background-color: white;
  }
  app-main {
    display: block;
    min-height: 100vh;
  }
  app-tools {
    display: none;
    background-color: white;
  }
  toolbar {
    display: block;
    height: 56px;
  }
  .material-icons, toolbar i {
    font-family: 'Material Icons';
    font-size: 24px;
    font-style: normal;
    -webkit-font-feature-settings: 'liga';
    -webkit-font-smoothing: antialiased;
    vertical-align: middle;
    cursor: pointer;
    user-select: none;
  }
  app-toolbar {
    position: fixed;
    top: 0;
    width: 100%;
    max-width: 640px;
    height: 56px;
    display: flex;
    align-items: center;
    white-space: nowrap;
    padding-left: 16px;
    box-sizing: border-box;
    background-color: white;
    z-index: 1000;
  }
  app-toolbar > *, app-toolbar > [buttons] > * {
    margin-right: 16px;
  }
  app-toolbar > [arc-title] {
    flex: 1;
    min-height: 0.6em;
    padding-top: 0.1em;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  app-toolbar > [avatar] {
    height: 32px;
    width: 32px;
    min-width: 32px;
    border-radius: 100%;
  }
  [launcher] app-toolbar > [buttons] {
    display: none;
  }
  app-toolbar > [buttons] {
    display: flex;
    white-space: nowrap;
    align-items: center;
    padding-right: 0;
  }
  app-toolbar > [buttons] > a {
    color: inherit;
    text-decoration: none;
  }
  footer {
    display: block;
    position: relative;
    height: 40px;
  }
  arc-footer {
    position: fixed;
    bottom: 0;
    width: 100%;
    max-width: 640px;
    background-color: white;
  }
  [hidden] {
    display: none;
  }
  [illuminate] [particle-host] {
    border: 1px solid #ea80fc;
    border-top: 18px solid #ea80fc;
    border-radius: 8px 8px 0 0;
  }
  [illuminate] [particle-host]::before {
    content: attr(particle-host);
    position: relative;
    top: -18px;
    left: 4px;
    font-size: 12px;
    font-family: monospace;
  }
  [slotid=suggestions] {
    max-height: 356px;
    overflow-y: auto;
    overflow-x: hidden;
  }
  [slotid=modal] {
    position: fixed;
    top: 56px;
    bottom: 0;
    width: 100%;
    max-width: 640px;
    margin: 0 auto;
    box-sizing: border-box;
    pointer-events: none;
  }
  /* wider-than-mobile */
  @media (min-width: 500px) {
    app-shell[expanded], [expanded] app-main, [expanded] app-toolbar, [expanded] arc-footer {
      margin: 0;
      width: 424px;
      max-width: 424px;
    }
    [expanded] app-tools {
      display: block;
      position: fixed;
      left: 424px;
      right: 0;
      top: 0;
      bottom: 0;
      overflow: auto;
      border-left: 1px solid silver;
    }
  }
</style>

<app-main launcher$="{{launcher}}">
  <agents>
    <!--<arc-auth on-auth="_onAuth"></arc-auth>-->
    <arc-config rootpath="{{cdnPath}}" on-config="_onConfig"></arc-config>
    <persistent-arc key="{{suggestKey}}" on-key="_onKey" metadata="{{metadata}}" on-metadata="_onMetadata"></persistent-arc>
    <persistent-users on-users="_onUsers"></persistent-users>
    <persistent-user id="{{userId}}" user="{{user}}" key="{{key}}" on-user="_onUser"></persistent-user>
    <persistent-manifests manifests="{{manifests}}" on-manifests="_onManifests" exclusions="{{exclusions}}" on-exclusions="_onExclusions"></persistent-manifests>
    <persistent-handles arc="{{arc}}" key="{{key}}"></persistent-handles>
    <remote-profile-handles arc="{{arc}}" user="{{user}}" on-profile="_onProfile"></remote-profile-handles>
    <remote-shared-handles arc="{{arc}}" user="{{user}}" friends="{{friends}}"></remote-shared-handles>
    <remote-friends-profiles-handles arc="{{arc}}" friends="{{friends}}" user="{{user}}"></remote-friends-profiles-handles>
    <arc-handle arc="{{arc}}" data="{{arcsHandleData}}" options="{{arcsHandleOptions}}" on-change="_onArcsHandleChange"></arc-handle>
    <arc-handle arc="{{arc}}" data="{{identityHandleData}}" options="{{identityHandleOptions}}" on-change="_onIdentityHandleChange"></arc-handle>
    <arc-handle arc="{{arc}}" data="{{identitiesHandleData}}" options="{{identitiesHandleOptions}}" on-change="_onIdentitiesHandleChange"></arc-handle>
    <arc-handle arc="{{arc}}" data="{{friendsAvatarData}}" options="{{friendsAvatarHandleOptions}}"></arc-handle>
    <arc-handle arc="{{arc}}" data="{{themeData}}" options="{{themeHandleOptions}}" on-change="_onShellThemeChange"></arc-handle>
    <arc-steps plans="{{plans}}" plan="{{plan}}" steps="{{steps}}" step="{{step}}" on-step="_onStep" on-steps="_onSteps"></arc-steps>
    <!-- only for launcher -->
    <remote-visited-arcs user="{{launcherUser}}" arcs="{{visitedArcs}}" on-arcs="_onVisitedArcs"></remote-visited-arcs>
  </agents>

  <!-- toolbar is here only to reserve space in the static flow, the app-toolbar is position-fixed -->
  <toolbar>
    <app-toolbar style="{{shellThemeStyle}}">
      <img title="Arcs" on-click="_onNavClick" src="../logo_24x24.svg" style="cursor: pointer;">
      <span arc-title style="{{titleStatic}}" on-click="_onStartEditingTitle" unsafe-html="{{description}}"></span>
      <span avatar style="{{avatarStyle}}"></span>
      <select on-change="_onUserSelected">{{usersOptions}}</select>
      <template users-options>
        <option value="{{value}}" selected="{{selected}}">{{user}}</option>
      </template>
      <div buttons>
        <toggle-button title="Arc Contains Profile Data" state="{{profileState}}" on-state="_onProfileState" icons="person_outline person"></toggle-button>
        <toggle-button title="Share this Arc" state="{{sharedState}}" on-state="_onSharedState" icons="link supervisor_account"></toggle-button>
        <toggle-button title="Cast" on-state="_onCastState" icons="cast cast_connected"></toggle-button>
        <a href="{{launcherUrl}}"><i>apps</i></a>
      </div>
    </app-toolbar>
  </toolbar>

  <arc-host config="{{hostConfig}}" manifests="{{manifests}}" exclusions="{{exclusions}}" plans="{{plans}}" plan="{{plan}}" suggestions="{{suggestions}}" on-arc="_onArc" on-plans="_onPlans" on-applied="_onApplied">
    <div slotid="toproot"></div>
    <div slotid="root"></div>
    <div slotid="modal"></div>
  </arc-host>

  <footer>
    <arc-footer dots="{{dots}}" on-suggest="_onStep" on-search="_onSearch">
      <div slotid="suggestions"></div>
    </arc-footer>
  </footer>
</app-main>

<app-tools>
  <simple-tabs>
    <div tab="Manifests">
      <local-data manifest="{{manifest}}" on-update-manifest="_onUpdateManifest" on-promote-manifest="_onPromoteManifest"></local-data>
      <manifest-data manifests="{{manifests}}" exclusions="{{exclusions}}" on-exclusions="_onExclusions"></manifest-data>
    </div>
    <div tab="Handle Explorer">
      <handle-explorer arc="{{arc}}"></handle-explorer>
    </div>
    <!-- <div tab="App State">
      <data-explorer style="font-size: 0.6em;" object="{{appState}}"></data-explorer>
    </div> -->
  </simple-tabs>
  <shell-particles arc="{{arc}}"></shell-particles>
</app-tools>
`;

class AppShell extends Xen.Base {
  get host() {
    // TODO(sjmiles): override shadow-root generation so that
    // old-timey systems (e.g. TradingView widgets) can find
    // various bits in `document` when used in Particles.
    // Note that using light-dom exposes style-leakage concerns.
    return this;
  }
  get template() {
    return Xen.Template.createTemplate(template);
  }
  _getInitialState() {
    let cdnPath = window.shellPath;
    //let cdnPath = AppShell.module.URL.split('/').slice(0, -3).join('/');
    let typesPath = `${cdnPath}/app-shell/artifacts`;
    return {
      cdnPath,
      linkTarget: '_self',
      launcherUrl: `${location.origin}${location.pathname}`,
      arcsHandleOptions: {
        schemas: `${typesPath}/arc-types.manifest`,
        type: '[ArcMetadata]',
        name: 'ArcMetadata',
        tags: ['#arcmetadata']
      },
      themeHandleOptions: {
        schemas: `${typesPath}/arc-types.manifest`,
        type: 'Theme',
        name: 'ShellTheme',
        tags: ['#shelltheme']
      },
      themeData: {
        mainBackground: "white"
      },
      identityHandleOptions: {
        schemas: `${typesPath}/identity-types.manifest`,
        type: 'Person',
        name: 'User',
        tags: ['#user']
      },
      identitiesHandleOptions: {
        schemas: `${typesPath}/identity-types.manifest`,
        type: '[Person]',
        name: 'Identities',
        tags: ['#identities']
      },
      friendsAvatarHandleOptions: {
        schemas: `${typesPath}/identity-types.manifest`,
        type: '[Avatar]',
        name: 'FRIENDS_PROFILE_avatar',
        id: 'FRIENDS_PROFILE_avatar',
        tags: ['#friends_avatar'],
        asContext: true
      },
      friendsAvatarData: {},
      auth: true
    };
  }
  _didMount() {
    this.setAttribute('app-shell', '');
    this._initHotKeys();
    this._initGeolocation();
  }
  _update(props, state, lastProps, lastState) {
    // for debugging
    window.app = this;
    //window.state = state;
    window.arc = state.arc;
    window.user = state.user;
    window.users = state.users;
    state.appState = state;
    //
    if (state.arc && state.user && (state.user !== lastState.user || !state.identityHandleData
        || state.geoCoords !== lastState.geoCoords)) {
      state.identityHandleData = this._synthesizeIdentityHandleData(
          state.arc, state.user, state.geoCoords);
    }
    if (state.users && (state.users !== lastState.users || !state.identitiesHandleData)) {
      state.identitiesHandleData = this._synthesizeIdentitiesHandleData(state.users);
    }
    if (state.user) {
      state.userId = state.user.id;
      ArcsUtils.setUrlParam('user', state.userId);
    }
    if (state.key) {
      ArcsUtils.setUrlParam('arc', state.key);
    }
    if (!state.plan && state.plans && state.plans.length && (state.config.launcher || state.config.profiler)) {
      state.plan = state.plans[0].plan;
    }
    if (state.plans && (state.plans !== lastState.plans || state.search !== lastState.search)) {
      this._updateSuggestions(state.plans, state.search);
    }
    if (state.newSteps) {
      this._updateMetadata({steps: state.newSteps});
      state.newSteps = null;
    }
    if (state.arcsToolsVisible !== lastState.arcsToolsVisible) {
      localStorage.setItem('0-3-arcs-dev-tools', state.arcsToolsVisible ? 'open' : 'closed');
    }
    super._update(props, state);
  }
  _render(props, state) {
    // only persistent-arc ever gets '*', which it converts into a real key;
    // state.key is blank in the interim
    state.suggestKey = state.key;
    if (state.key === '*') {
      state.key = '';
    }
    // unpack arc metadata for rendering
    if (state.metadata) {
      state.description = state.metadata.description;
      state.steps = state.metadata.steps;
    }
    // unpack user for rendering
    if (state.user) {
      state.userName = state.user.name;
    }
    if (state.config && state.key && state.user) {
      // modifying config only matters before initializing arc-host
      let isProfile = state.user.profiles && state.user.profiles[state.key];
      if (isProfile && !state.arc) {
        AppShell.log('is a profile Arc, setting soloPath to "profile.manifest"');
        //state.config.soloPath = 'profile.manifest';
      }
      let isShared = state.user.shares && state.user.shares[state.key];
      // unpack button states
      state.profileState = isProfile ? 1 : 0;
      state.sharedState = isShared ? 1 : 0;
    }
    // enable remote-visited-arcs if running as launcher
    if (state.config && state.config.launcher) {
      state.launcherUser = state.user;
    }
    // launcher state can affect rendering
    state.launcher = Boolean(!state.config || state.config.launcher);
    // do not send config data to arc-host before `user` is ready
    state.hostConfig = state.user ? state.config : null;
    // populate user select
    state.usersOptions = {
      $template: 'users-options',
      models: this._renderUserOptionModels(state.users, state.user)
    };
    state.dots = state.plans == null ? 'active' : '';
    if (state.avatar && arc) {
      const url = arc._loader._resolve(state.avatar.rawData.url);
      state.avatarStyle = `background: url("${url}") center no-repeat; background-size: cover;`;
    }
    // must have `auth` before doing anything else
    return state.auth ? state : null;
  }
  _didRender(props, state) {
    if (state.config) {
      Xen.Template.setBoolAttribute(this, 'expanded', Boolean(state.arcsToolsVisible));
    }
    Xen.Template.setBoolAttribute(this, 'illuminate', Boolean(state.illuminateParticles));
  }
  _renderUserOptionModels(users, user) {
    let models = [
      {user: '(none)'},
      {user: '* New User'}
    ];
    if (users) {
      let selectedId = user ? user.id : '';
      models = models.concat(Object.keys(users).map(id => {
        return {
          value: id,
          user: users[id].name,
          selected: id == selectedId
        };
      }));
    }
    return models;
  }
  _synthesizeIdentityHandleData(arc, user, geoCoords) {
    return {
      id: user.id,
      name: user.name,
      location: geoCoords ? {
        latitude: geoCoords.latitude,
        longitude: geoCoords.longitude
      } : null
    };
  }
  _synthesizeIdentitiesHandleData(users) {
    return Object.keys(users).map(id => {
      return {
        id: id,
        name: users[id].name
      };
    });
  }
  _setIfDirty(object) {
    let dirty = null;
    for (let property in object) {
      let value = object[property];
      if (this._state[property] !== value) {
        if (!dirty) {
          dirty = {};
        }
        dirty[property] = value;
      }
    }
    if (dirty) {
      this._setState(dirty);
      return true;
    }
  }
  _initHotKeys() {
    addEventListener('keydown', e => {
      if (e.ctrlKey && !{input:1, textArea:1}[e.target.localName] && this.hotkey(e.key, e)) {
        e.preventDefault();
      }
    });
  }
  hotkey(key, e) {
    switch(key) {
      case 'i':
        this._onToggleIlluminate(e);
        break;
      default:
        return false;
    }
    return true;
  }
  _updateSuggestions(plans) {
    let suggestions = plans;
    // If there is a search, plans are already filtered
    if (!this._state.search) {
      // Otherwise only show plans that don't populate a root.
      // TODO(seefeld): Don't hardcode `root`
      suggestions = plans.filter(
        ({plan}) => plan.slots && !plan.slots.find(s => s.name.includes('root'))
      );
    }
    this._setState({suggestions});
  }
  _onConfig(e, config) {
    let user = null;
    let userId = config.user;
    let key = config.key || '';
    if (!config.key) {
      config.key = 'launcher';
    }
    if (config.key === 'launcher') {
      config.soloPath = /*config.soloPath ||*/ 'launcher.manifest';
      config.launcher = true;
      key = '';
    }
    if (config.key === 'profile') {
      config.soloPath = 'profile.manifest';
      config.profiler = true;
      key = '*';
    }
    if (userId === 'new') {
      userId = null;
      user = this._newUserPrompt();
      AppShell.log('new user', user);
    }
    //config.suggestionsNode = this.querySelector('suggestions-element');
    this._setState({config, key, userId, user, arcsToolsVisible: config.arcsToolsVisible});
  }
  _onToggleIlluminate() {
    this._setState({illuminateParticles: !this._state.illuminateParticles});
  }
  _onNavClick() {
    this._setState({arcsToolsVisible: !this._state.arcsToolsVisible});
  }
  _onAuth(e, auth) {
    this._setState({auth});
  }
  _onUsers(e, users) {
    this._setIfDirty({users});
  }
  _onUserSelected(e) {
    let user, userId;
    switch (e.currentTarget.selectedIndex) {
      case 0:
        break;
      case 1:
        this._onNewUser(e);
        return;
      default:
        userId = e.currentTarget.value;
        break;
    }
    AppShell.log('switching user', user, userId);
    this._setState({user, userId});
  }
  _onNewUser() {
    let url = `?arc=profile&user=new`;
    open(url, this._state.linkTarget);
  }
  _newUserPrompt() {
    // returns String 'null' (sheesh) on cancel
    let name = prompt('User name?', 'User');
    if (name !== "null") {
      return {name};
    }
  }
  _onUser(e, user, props, state) {
    // TODO(sjmiles): in the new user flow, stale `user` record can be received after the
    // app sets state.user.name but before persistent-user constructs the new user.
    // This is fixed here by careful examination of the state data.
    // Other ways of fixing: (1) examine the timing issues, make sure we are doing the right things, (2) stop
    // multiplexing `user` object to request user-creation.
    if ((state.user && state.user.name && !state.user.id) || user) {
      // reference testing, remember to treat `user` as immutable
      if (this._setIfDirty({user})) {
        if (user) {
          localStorage.setItem('0-3-currentUser', user.id);
        }
      }
    }
  }
  _onVisitedArcs(e, visited) {
    AppShell.log('_onVisitedArcs: ', visited);
    let user = this._state.user;
    if (user) {
      let data = Object.keys(visited).map(key => {
        let {metadata, profile} = visited[key];
        let href = `${location.origin}${location.pathname}?arc=${key}&user=${user.id}`;
        if (metadata.externalManifest) {
          href += `&manifest=${metadata.externalManifest}`;
        }
        return {
          key: key,
          description: metadata.description || key.slice(1),
          color: metadata.color || 'gray',
          bg: metadata.bg,
          href: href,
          profile: profile
        };
      });
      // prepend New Arc item
      data.unshift({
        key: '*',
        blurb: 'New Arc',
        description: 'New Arc',
        bg: 'black',
        color: 'white',
        href: `?arc=*&user=${user.id}`
      });
      this._setState({arcsHandleData: data});
    }
  }
  async _onProfile(e, profile) {
    let data;
    switch (profile.id) {
      case 'PROFILE_Avatar_avatar':
      case 'PROFILE_!Person!_friends':
        data = await ArcsUtils.getHandleData(profile);
        AppShell.log(profile.id, data);
        break;
      default:
        return;
    }
    switch(profile.id) {
      case 'PROFILE_Avatar_avatar':
        this._setIfDirty({avatar: data});
        break;
      case 'PROFILE_!Person!_friends':
        this._setIfDirty({friends: data});
        break;
    }
  }
  _onNewArcClick() {
    open(`${location.origin}${location.pathname}`, this._state.linkTarget);
  }
  _onKey(e, key) {
    this._setState({key});
  }
  _onArc(e, arc) {
    this._setState({arc});
    if (arc && this._state.config.profiler) {
      this._modifyProfileState(true);
    }
  }
  async _onArcsHandleChange(e, handle) {
    this._setState({
      // TODO(sjmiles): any reason to replan here? I don't think so
      //plans: null,
      visitedArcs: await ArcsUtils.getHandleData(handle)
    });
    AppShell.log('onArcsHandle: ', this._state.visitedArcs);
  }
  _onIdentityHandleChange() {
    // TODO(sjmiles): runtime will cause replanning on any handle change
    //this._setState({plans: null});
  }
  _onIdentitiesHandleChange() {
    // TODO(sjmiles): runtime will cause replanning on any handle change
    //this._setState({plans: null});
  }
  _onMetadata(e, metadata) {
    this._setIfDirty({metadata});
  }
  _onProfileState(e, profileState) {
    AppShell.log('profile state changed', profileState);
    this._modifyProfileState(profileState);
  }
  _modifyProfileState(profileState) {
    let {user, key} = this._state;
    if (user && key) {
      user.profiles = user.profiles || Object.create(null);
      if (Boolean(user.profiles[key]) !== Boolean(profileState)) {
        if (profileState) {
          user.profiles[key] = true;
        } else {
          delete user.profiles[key];
        }
        AppShell.log('mutating user object (onProfileState)', user);
        // `state.user` is considered immutable, need a copy
        this._setState({user: Object.assign(Object.create(null), user)});
      }
    }
  }
  _onSharedState(e, sharedState) {
    AppShell.log('shared state changed', sharedState);
    let {user, key} = this._state;
    if (user) {
      user.shares = user.shares || Object.create(null);
      if (sharedState) {
        user.shares[key] = true;
      } else {
        delete user.shares[key];
      }
      AppShell.log('mutating user object (onSharedState)', user);
      // `state.user` is considered immutable, need a copy
      this._setState({user: Object.assign(Object.create(null), user)});
    }
  }
  _onPlans(e, plans) {
    this._setIfDirty({plans});
    this._fire('generations', plans && plans.generations || [], document);
  }
  _onSearch({detail: {search}}) {
    const state = this._state;
    if (search !== state.search) {
      // TODO(sjmiles): probably this should be part of update()
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
  _onSteps(e, steps) {
    this._setState({newSteps: steps});
  }
  _onStep(e, {plan}) {
    this._setState({plan});
  }
  async _onApplied(e, plan, props, state) {
    let description = await ArcsUtils.describeArc(state.arc);
    if (!description && !state.description) {
      description = ArcsUtils.randomName();
    }
    if (description && description !== state.description) {
      this._updateMetadata({description});
      this._setState({description});
    }
    // must re-plan
    this._setState({plans: null});
  }
  _updateMetadata(data) {
    let {metadata} = this._state;
    if (metadata && data) {
      // `metadata` is considered immutable downstream (have to make a new reference or it's not considered changed)
      metadata = Object.assign(Object.assign(Object.create(null), metadata), data);
      // set new object to state
      this._setState({metadata});
    }
  }
  _onUpdateManifest(e, manifestPath) {
    manifestPath = manifestPath.trim();
    AppShell.log(`onUpdateManifest: [${manifestPath}]`);
    this._setState({manifestPath});
  }
  _onPromoteManifest() {
    const state = this._state;
    if (state.manifestPath) {
      const currentManifests = state.manifests || [];
      if (!currentManifests.includes(state.manifestPath)) {
        const newManifests = currentManifests.concat(state.manifestPath);
        AppShell.log(`Promoting manifest [new=${state.manifestPath}, all=[${newManifests}]].`);
        this._setState({manifestPath: '', manifests: newManifests})
      }
    }
  }
  _onManifests(e, manifests) {
    this._setIfDirty({manifests});
  }
  _onExclusions(e, exclusions) {
    this._setIfDirty({exclusions});
  }
  async _onShellThemeChange(e, handle) {
    const theme = (await ArcsUtils.getHandleData(handle)).rawData;
    AppShell.log('ShellThemeChange', theme);
    this._setState({
      shellThemeStyle: {
        backgroundColor: theme.mainBackground,
        color: theme.mainColor
      }
    });
  }
  _initGeolocation() {
    if ("geolocation" in navigator) {
      navigator.geolocation.watchPosition(({coords}) => {
        // Skip setting the position if it's the same as what we've already got.
        const lastCoords = this._state.geoCoords;
        if (!lastCoords ||
            coords.latitude != lastCoords.latitude ||
            coords.longitude != lastCoords.longitude) {
          this._setState({geoCoords: coords});
        }
      });
    }
  }
}
AppShell.log = Xen.Base.logFactory('AppShell', '#bb4d00');
customElements.define('app-shell', AppShell);
