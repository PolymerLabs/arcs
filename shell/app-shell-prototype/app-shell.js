// elements
import './elements/arc-config.js';
import './elements/arc-host.js';
import './elements/shell-ui.js';
import './elements/shell-handles.js';
import './elements/cloud-data.js';

// code libs
import Xen from '../components/xen/xen.js';
import ArcsUtils from './lib/arcs-utils.js';
import LinkJack from './lib/link-jack.js';
import Const from './constants.js';

// globals
/* global shellPath */

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
    rootpath="{{shellPath}}"
    on-config="_onStateData"
  ></arc-config>

  <arc-host
    key="{{key}}"
    config="{{config}}"
    manifest="{{manifest}}"
    suggestions="{{suggestions}}"
    search="{{search}}"
    suggestion="{{suggestion}}"
    serialization="{{serialized}}"
    on-arc="_onStateData"
    on-plans="_onPlans"
    on-plan="_onStateData"
  ></arc-host>

  <shell-handles
    arc="{{arc}}"
    users="{{users}}"
    user="{{user}}"
    visited="{{arcs}}"
    on-theme="_onStateData"
  ></shell-handles>

  <cloud-data
    key="{{key}}"
    arc="{{arc}}"
    metadata="{{metadata}}"
    description="{{description}}"
    plan="{{plan}}"
    on-users="_onStateData"
    on-arcs="_onStateData"
    on-key="_onStateData"
    on-metadata="_onStateData"
    on-serialized="_onStateData"
  ></cloud-data>

  <shell-ui
    arc="{{arc}}"
    title="{{title}}"
    showhint="{{showhint}}"
    users="{{users}}"
    on-search="_onStateData"
    on-suggestion="_onStateData"
    on-select-user="_onSelectUser"
    on-experiment="_onExperiment"
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
      shellPath,
      defaultManifest: `
import 'https://sjmiles.github.io/arcs-stories/0.3/GitHubDash/GitHubDash.recipes'
import 'https://sjmiles.github.io/arcs-stories/0.3/TV/TV.recipes'
import 'https://sjmiles.github.io/arcs-stories/0.3/PlaidAccounts/PlaidAccounts.recipes'
import '../artifacts/canonical.manifest'
import '../artifacts/0.4/Arcs/Arcs.recipes'
      `,
      user: {
        id: 'f4',
        name: 'Gomer'
      }
    };
  }
  _didMount() {
    LinkJack(window, anchor => this._routeLink(anchor));
  }
  _update(props, state, oldProps, oldState) {
    // TODO(sjmiles): for debugging only
    this._globalsForDebug(state);
    // end for debugging
    let {key, plan, suggestions, suggestion, pendingSuggestion} = state;
    // TODO(sjmiles): shouldn't some of this be handled in arc-config.js?
    const params = (new URL(document.location)).searchParams;
    if (!key) {
      state.key = ArcsUtils.getUrlParam('key') || Const.SHELLKEYS.launcher;
    } else if (key !== '*') {
      ArcsUtils.setUrlParam('key', key);
    } else {
      // does nothing but prevent us from testing for '*' later in this method
      key = null;
    }
    //const manifest = (key === Const.SHELLKEYS.launcher) ? Const.MANIFESTS.launcher : state.defaultManifest;
    const manifest = state.defaultManifest;
    this._setState({manifest});
    if (plan && plan !== oldState.plan) {
      // arc has implemented new plan so generate new description
      this._describeArc(state.arc, state.description);
    }
    if (key === Const.SHELLKEYS.launcher) {
      if (!suggestion && !plan && suggestions && suggestions.length) {
        const suggestion = state.suggestions.find(s => s.descriptionText === 'Arcs launcher.');
        if (suggestion) {
          state.suggestion = suggestion;
        }
        //log(state.suggestions);
        //state.suggestion = suggestions[0];
      }
      else if (suggestion && suggestion !== oldState.suggestion) {
        state.pendingSuggestion = suggestion;
        state.suggestion = null;
        state.description = null;
        state.suggestions = null;
        state.key = '*';
      }
    }
    if (key && !Const.SHELLKEYS[key] && suggestions && pendingSuggestion) {
      state.suggestion = suggestions.find(s => s.descriptionText === pendingSuggestion.descriptionText);
      state.pendingSuggestion = null;
    }
  }
  _render({}, state) {
    const {metadata} = state;
    const render = {
      title: metadata && metadata.description
    };
    return [state, render];
  }
  _globalsForDebug(state) {
    window.app = this;
    window.arc = state.arc;
  }
  _routeLink(anchor) {
    const url = new URL(anchor.href, document.location);
    const params = url.searchParams;
    log(/*url,*/ anchor.href, Array.from(params.keys()));
    const key = params.get('arc');
    if (key) {
      this._setState({key});
    }
  }
  async _describeArc(arc, description) {
    description = await ArcsUtils.describeArc(arc) || description;
    this._setState({description});
  }
  _onStateData(e, data) {
    this._setState({[e.type]: data});
  }
  _onPlans(e, plans) {
    this._setState({suggestions: plans, showhint: plans && plans.length > 0});
  }
  _onSelectUser(e, user) {
    this._setState({user});
  }
  async _onExperiment(e) {
    const {arc} = this._state;
    this._setState({serialized: null});
    this._setState({serialized: await arc.serialize()});
  }
}

customElements.define('app-shell', AppShell);

export default AppShell;
