// elements
import './elements/arc-config.js';
import './elements/arc-host.js';
import './elements/shell-ui.js';
import './elements/shell-handles.js';
import './elements/cloud-data.js';

// code libs
import Xen from '../components/xen/xen.js';
import ArcsUtils from './lib/arcs-utils.js';
import Const from '../app-shell/constants.js';

// globals
/* global shellPath */

// templates
const html = Xen.html;
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
    plan="{{plan}}"
    serialization="{{serialized}}"
    on-arc="_onStateData"
    on-plans="_onPlans"
  ></arc-host>

  <shell-handles
    arc="{{arc}}"
    users="{{users}}"
    on-theme="_onStateData"
  ></shell-handles>

  <cloud-data
    key="{{key}}"
    arc="{{arc}}"
    metadata="{{metadata}}"
    plan="{{plan}}"
    on-users="_onStateData"
    on-key="_onStateData"
    on-metadata="_onStateData"
    on-serialized="_onStateData"
  ></cloud-data>

  <shell-ui
    arc="{{arc}}"
    title="{{title}}"
    showhint="{{showhint}}"
    users="{{users}}"
    on-plan="_onPlan"
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
      manifest: `
import 'https://sjmiles.github.io/arcs-stories/0.3/GitHubDash/GitHubDash.recipes'
import 'https://sjmiles.github.io/arcs-stories/0.3/TV/TV.recipes'
import 'https://sjmiles.github.io/arcs-stories/0.3/PlaidAccounts/PlaidAccounts.recipes'
import '../artifacts/canonical.manifest'
    `};
  }
  _update(props, state, oldProps, oldState) {
    // TODO(sjmiles): for debugging only
    window.app = this;
    window.arc = state.arc;
    //
    const params = (new URL(document.location)).searchParams;
    if (!state.key) {
      state.key = ArcsUtils.getUrlParam('key') || '*';
    } else if (state.key !== '*') {
      ArcsUtils.setUrlParam('key', state.key);
    }
  }
  _render({}, state) {
    const {metadata} = state;
    const render = {
      title: metadata && metadata.description
    };
    return [state, render];
  }
  _onStateData(e, data) {
    this._setState({[e.type]: data});
  }
  _onConfig(e, config) {
    this._setState({config});
  }
  _onPlan(e, suggestion) {
    this._setState({plan: suggestion.plan});
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
