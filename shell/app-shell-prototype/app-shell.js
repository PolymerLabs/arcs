// elements
import './elements/arc-config.js';
import './elements/arc-host.js';
import './elements/arc-planner.js';
import './elements/shell-ui.js';
import './elements/shell-handles.js';
import './elements/cloud-data.js';

// code libs
import Xen from '../components/xen/xen.js';
import ArcsUtils from './lib/arcs-utils.js';
import LinkJack from './lib/link-jack.js';
import Const from './constants.js';

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
      background: white;
    }
  </style>

  <arc-config
    userid="{{userid}}"
    key="{{key}}"
    search="{{search}}"
    on-config="_onStateData"
  ></arc-config>

  <arc-host
    key="{{key}}"
    config="{{config}}"
    manifest="{{manifest}}"
    suggestions="{{filteredSuggestions}}"
    search="{{search}}"
    suggestion="{{suggestion}}"
    serialization="{{serialization}}"
    on-arc="_onStateData"
    on-suggestions="_onSuggestions"
    on-plan="_onStateData"
  ></arc-host>

  <arc-planner
    config="{{config}}"
    arc="{{arc}}"
    search="{{search}}"
    suggestions="{{suggestions}}"
    suggestion="{{suggestion}}"
    on-suggestions="_onSuggestions"
    on-plan="_onStateData"
    on-search="_onStateData"
  ></arc-planner>

  <shell-handles
    arc="{{arc}}"
    users="{{users}}"
    user="{{user}}"
    arcs="{{arcs}}"
    on-theme="_onStateData"
    on-arcs="_onStateData"
  ></shell-handles>

  <cloud-data
    config="{{config}}"
    profile="{{profile}}"
    userid="{{userid}}"
    user="{{user}}"
    arcs="{{arcs}}"
    key="{{key}}"
    arc="{{arc}}"
    metadata="{{metadata}}"
    share="{{share}}"
    description="{{description}}"
    suggestions="{{suggestions}}"
    plan="{{plan}}"
    on-user="_onStateData"
    on-profile="_onStateData"
    on-users="_onStateData"
    on-arcs="_onStateData"
    on-key="_onStateData"
    on-metadata="_onStateData"
    on-share="_onStateData"
    on-serialization="_onStateData"
    on-suggestion="_onStateData"
  ></cloud-data>

  <shell-ui
    key="{{key}}"
    arc="{{arc}}"
    title="{{title}}"
    showhint="{{showhint}}"
    users="{{users}}"
    user="{{user}}"
    profile="{{profile}}"
    share="{{share}}"
    search="{{search}}"
    glows="{{glows}}"
    on-search="_onStateData"
    on-suggestion="_onStateData"
    on-select-user="_onSelectUser"
    on-share="_onStateData"
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
  _getInitialState() {
    return {
      defaultManifest: `
//import 'https://sjmiles.github.io/arcs-stories/0.3/GitHubDash/GitHubDash.recipes'
import '../../../arcs-stories/0.3/GitHubDash/GitHubDash.recipes'
import 'https://sjmiles.github.io/arcs-stories/0.3/TV/TV.recipes'
import 'https://sjmiles.github.io/arcs-stories/0.3/PlaidAccounts/PlaidAccounts.recipes'
import '../artifacts/canonical.manifest'
import '../artifacts/0.4/Arcs/Arcs.recipes'
      `
    };
  }
  _didMount() {
    LinkJack(window, anchor => this._routeLink(anchor));
  }
  _update({}, state, {}, oldState) {
    this._updateDebugGlobals(state);
    this._updateConfig(state, oldState);
    this._updateKey(state, oldState);
    this._updateManifest(state);
    this._updateDescription(state, oldState);
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
        state.key = key;
      }
    }
  }
  _updateManifest(state) {
    this._setState({manifest: state.defaultManifest});
  }
  _updateDescription(state, oldState) {
    let {arc, description, plan} = state;
    if (arc && plan && plan !== oldState.plan) {
      // arc has implemented new plan so generate new description
      this._describeArc(arc, description);
    }
  }
  _updateLauncher(state, oldState) {
    const {key, arc, plan, suggestions, suggestion, pendingSuggestion} = state;
    if (key === Const.SHELLKEYS.launcher) {
      if (!suggestion && !plan && suggestions && suggestions.length) {
        // TODO(sjmiles): need a better way to find the launcher suggestion
        state.suggestion = suggestions.find(s => s.descriptionText === 'Arcs launcher.');
      }
      else if (suggestion && suggestion !== oldState.suggestion) {
        log('suggestion registered from launcher, generate new arc (set key to *)');
        state.pendingSuggestion = suggestion;
        this._setKey('*');
      }
    }
    if (key && !Const.SHELLKEYS[key] && suggestions && pendingSuggestion) {
      log('instantiating pending launcher suggestion');
      // TODO(sjmiles): need a better way to find the launcher suggestion
      state.suggestion = suggestions.find(s => s.descriptionText === pendingSuggestion.descriptionText);
      state.pendingSuggestion = null;
    }
  }
  _updateSuggestions(state, oldState) {
    let {key, search, suggestions, plan} = state;
    state.filteredSuggestions = state.suggestions;
    // filter out root suggestions if we aren't searching directly
    // TODO(sjmiles): ...and if aren't launcher and there is one plan, otherwise suggestions are empty all the time
    if (suggestions && !search && !Const.SHELLKEYS[key] && plan) {
      // Otherwise only show suggestions that don't populate a root.
      state.filteredSuggestions = suggestions.filter(
        // TODO(seefeld): Don't hardcode `root`
        // TODO(sjmiles|mmandlis): `name.includes` catches all variants of `root` (e.g. `toproot`), but
        // `tags.includes` only catches `#root` tag specifically
        ({plan}) => plan.slots && !plan.slots.find(s => s.name.includes('root') || s.tags.includes('#root'))
      );
    }
  }
  _render({}, state) {
    const {userid, description, theme, suggestions} = state;
    const render = {
      title: description,
      glows: userid && (suggestions == null)
    };
    state.shellStyle = theme ? `background-color: ${theme.mainBackground}; color: ${theme.mainColor};` : '';
    return [state, render];
  }
  _didRender({}, {shellStyle}) {
    this.style.cssText = shellStyle;
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
    this._setState({
      key,
      description: null,
      serialization: null,
      suggestions: null,
      suggestion: null,
      plan: null
    });
  }
  async _describeArc(arc, description) {
    description = await ArcsUtils.describeArc(arc) || description;
    this._setState({description});
  }
  _onStateData(e, data) {
    this._setState({[e.type]: data});
  }
  _onSuggestions(e, suggestions) {
    this._setState({suggestions, filteredSuggestions: suggestions, showhint: suggestions && suggestions.length > 0});
  }
  _onSelectUser(e, userid) {
    this._setState({userid});
  }
}

customElements.define('app-shell', AppShell);

export default AppShell;
