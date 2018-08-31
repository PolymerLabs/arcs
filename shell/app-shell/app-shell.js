// libs
import Xen from '../components/xen/xen.js';
import Arcs from './lib/arcs.js';
import LinkJack from './lib/link-jack.js';
import Const from './constants.js';
import Firebase from './elements/cloud-data/firebase.js';

// elements
import './elements/arc-config.js';
import './elements/arc-manifest.js';
import './elements/arc-host.js';
import './elements/arc-planner.js';
import './elements/shell-ui.js';
import './elements/shell-stores.js';
import './elements/cloud-data.js';
import './elements/background-arcs/bg-arc.js';

// external data pipes (MiToast, ArcExtension)
import './elements/pipes/mi-toast-pipe.js';

// templates
const html = Xen.Template.html;
const template = html`

  <style>
    :host {
      /*--max-width: 420px;*/
    }
    :host {
      display: block;
      position: relative;
      min-height: 100vh;
      max-width: var(--max-width);
      margin: 0 auto;
      background: var(--shell-bg, white);
      color: var(--shell-color, black);
    }
  </style>

  <arc-config
    userid="{{userid}}"
    key="{{key}}"
    search="{{search}}"
    on-config="_onStateData"
  ></arc-config>

  <arc-manifest
    config="{{config}}"
    on-manifest="_onStateData"
  ></arc-manifest>

  <arc-host
    key="{{key}}"
    config="{{config}}"
    manifest="{{manifest}}"
    search="{{search}}"
    suggestion="{{suggestion}}"
    serialization="{{serialization}}"
    on-arc="_onStateData"
    on-context="_onStateData"
    on-suggestions="_onStateData"
  ></arc-host>

  <arc-planner
    config="{{config}}"
    arc="{{arc}}"
    search="{{search}}"
    suggestion="{{suggestion}}"
    on-metaplans="_onStateData"
    on-metaplan="_onStateData"
    on-suggestions="_onStateData"
    on-search="_onStateData"
  ></arc-planner>

  <shell-stores
    config="{{config}}"
    users="{{users}}"
    user="{{user}}"
    context="{{context}}"
    key="{{key}}"
    arc="{{arc}}"
    on-theme="_onStateData"
  ></shell-stores>

  <cloud-data
    config="{{config}}"
    users="{{users}}"
    userid="{{userid}}"
    context="{{context}}"
    user="{{user}}"
    key="{{key}}"
    arc="{{arc}}"
    metadata="{{metadata}}"
    share="{{share}}"
    description="{{description}}"
    plans="{{metaplans}}"
    plan="{{metaplan}}"
    on-userid="_onStateData"
    on-user="_onStateData"
    on-users="_onStateData"
    on-friends="_onStateData"
    on-key="_onStateData"
    on-metadata="_onStateData"
    on-share="_onStateData"
    on-serialization="_onStateData"
    on-suggestion="_onSuggestion"
  ></cloud-data>

  <mi-toast-pipe
    context="{{context}}"
    arc="{{arc}}"
    suggestions="{{suggestions}}"
    metaplans="{{metaplans}}"
    on-suggestion="_onStateData"
  ></mi-toast-pipe>

  <!-- pretend this is a processing arc -->
  <bg-arc></bg-arc>
  <!-- pretend this is the login arc -->
  <bg-arc></bg-arc>

  <shell-ui
    key="{{key}}"
    arc="{{arc}}"
    title="{{title}}"
    showhint="{{showhint}}"
    users="{{users}}"
    user="{{user}}"
    context="{{context}}"
    friends="{{friends}}"
    share="{{share}}"
    search="{{search}}"
    glows="{{glows}}"
    on-search="_onStateData"
    on-suggestion="_onSuggestion"
    on-select-user="_onSelectUser"
    on-share="_onStateData"
    on-showhint="_onStateData"
  >
    <slot></slot>
    <slot name="modal" slot="modal"></slot>
    <slot name="suggestions" slot="suggestions"></slot>
  </shell-ui>

`;

const log = Xen.logFactory('AppShell', '#6660ac');

class AppShell extends Xen.Debug(Xen.Base, log) {
  get template() {
    return template;
  }
  _didMount() {
    LinkJack(window, anchor => this._routeLink(anchor));
  }
  _update({}, state, {}, oldState) {
    this._updateDebugGlobals(state);
    this._updateConfig(state, oldState);
    this._updateKey(state, oldState);
    this._updateDescription(state);
    this._updateSuggestions(state, oldState);
    this._updateLauncher(state, oldState);
  }
  _updateDebugGlobals(state) {
    window.app = this;
    window.arc = state.arc;
  }
  _updateConfig(state, oldState) {
    const {config, user} = state;
    if (config !== oldState.config) {
      state.search = config.search;
      state.userid = config.userid;
      this._updateTestUser(state);
    }
  }
  _updateTestUser(state) {
    // TODO(sjmiles): special handling for test user
    if (state.userid[0] === '*') {
      const user = state.userid.slice(1);
      log('CREATING user', user);
      state.userid = Firebase.db.newUser(user);
    }
  }
  _updateKey(state, oldState) {
    let {config, user, key, arc} = state;
    if (config && user) {
      if (!key && !oldState.key) {
        key = config.key;
      }
      if (!key) {
        key = Const.SHELLKEYS.launcher;
      }
      if (key !== oldState.key) {
        this._setState({
          key,
          description: null,
          serialization: null,
          metaplans: null,
          suggestions: null,
          suggestion: null,
          metaplan: null
        });
      }
    }
  }
  _updateDescription(state) {
    let {arc, description, metaplan, describedPlan} = state;
    if (arc && metaplan && metaplan.plan && metaplan !== describedPlan) {
      // remember we already described for this metaplan
      state.describedPlan = metaplan;
      // arc has instantiated a plan so generate new description
      this._describeArc(arc, description);
    }
  }
  _updateLauncher(state, oldState) {
    const {key, metaplan, metaplans, suggestion, pendingSuggestion} = state;
    if (key === Const.SHELLKEYS.launcher) {
      if (!suggestion && (!metaplan || !metaplan.plan) && metaplans && metaplans.plans && metaplans.plans.length) {
        // TODO(sjmiles): need a better way to find the launcher suggestion
        state.suggestion = metaplans.plans.find(s => s.descriptionText === 'Arcs launcher.');
      }
      else if (suggestion && suggestion !== oldState.suggestion) {
        log('suggestion registered from launcher, generate new arc (set key to *)');
        state.suggestion = null;
        state.pendingSuggestion = suggestion;
        this._setKey('*');
      }
    }
    if (pendingSuggestion && key && !Const.SHELLKEYS[key] && metaplans && metaplans.plans.length) {
      log('matching pending launcher suggestion');
      // TODO(sjmiles): need a better way to match the suggestion
      state.suggestion = metaplans.plans.find(s => s.descriptionText === pendingSuggestion.descriptionText);
      if (state.suggestion) {
        state.pendingSuggestion = null;
      } else {
        log('failed to match pending launcher suggestion against plans, will retry');
      }
    }
  }
  _updateSuggestions(state, oldState) {
    if (state.metaplans && state.suggestions === null) {
      state.suggestions = [];
    }
    if (state.suggestions !== oldState.suggestions) {
      state.showhint = Boolean(state.suggestions && state.suggestions.length > 0);
    }
  }
  _render({}, state) {
    const {userid, description, suggestions} = state;
    const render = {
      title: description,
      glows: userid && (suggestions == null)
    };
    return [state, render];
  }
  _routeLink(anchor) {
    const url = new URL(anchor.href, document.location);
    const params = url.searchParams;
    log(/*url,*/ anchor.href, Array.from(params.keys()));
    const key = params.get('arc');
    // loopback not supported
    if ((key !== this._state.key) && (key || this._state.key !== Const.SHELLKEYS.launcher)) {
      this._setKey(key);
    }
  }
  _setKey(key) {
    log('registered new key, begin arc rebuild procedure');
    this._setState({arc: null, key});
  }
  async _describeArc(arc, fallback) {
    const description = (await Arcs.Runtime.getArcDescription(arc)) || fallback;
    this._setState({description});
  }
  _onStateData(e, data) {
    this._setState({[e.type]: data});
  }
  _onSelectUser(e, userid) {
    this._setState({userid});
  }
  _onSuggestion(e, suggestion) {
    this._setState({suggestion, search: ''});
  }
}

customElements.define('app-shell', AppShell);

export default AppShell;
