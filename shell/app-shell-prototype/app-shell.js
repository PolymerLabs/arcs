// elements
import './elements/arc-config.js';
import './elements/arc-host.js';
import './elements/shell-ui.js';
import './elements/shell-handles.js';
import './elements/cloud-data.js';
// components
// components for particle use
import '../components/corellia-xen/cx-input.js';
import '../components/good-map.js';
import '../components/video-controller.js';
import '../components/firebase-upload.js';
// components for particle use: deprecated
import '../components/x-list.js';
// code libs
import Xen from '../components/xen/xen.js';
import ArcsUtils from '../app-shell/lib/arcs-utils.js';
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

  <arc-config rootpath="{{shellPath}}" on-config="_onConfig"></arc-config>
  <arc-host config="{{config}}" manifest="{{manifest}}"  suggestions="{{suggestions}}" plan="{{plan}}" on-arc="_onArc" on-plans="_onPlans"></arc-host>

  <shell-handles arc="{{arc}}"></shell-handles>
  <cloud-data on-users="_onUsers"></cloud-data>

  <shell-ui showhint="{{showhint}}" users="{{users}}" on-plan="_onPlan" on-select-user="_onSelectUser">
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
import 'http://localhost/projects/arcs/arcs-stories/0.3/Test/Test.recipes'
import 'http://localhost/projects/arcs/arcs-stories/0.3/GitHubDash/GitHubDash.recipes'
import 'http://localhost/projects/arcs/arcs-stories/0.3/TV/TV.recipes'
import 'http://localhost/projects/arcs/arcs-stories/0.3/PlaidAccounts/PlaidAccounts.recipes'

//import 'https://shaper.github.io/arcs-stories/social/Social/Social.recipes'
//import 'http://localhost/projects/arcs/arcs/shell/artifacts/canonical.manifest'
//import 'http://localhost/projects/arcs/arcs/shell/artifacts/Profile/Profile.recipes'
`
    };
  }
  _update(props, state, oldProps, oldState) {
  }
  _render({}, state) {
    return state;
  }
  _onConfig(e, config) {
    this._setState({config});
  }
  _onArc(e, arc) {
    this._setState({arc});
  }
  _onPlan(e, suggestion) {
    this._setState({plan: suggestion.plan});
  }
  _onPlans(e, plans) {
    this._setState({suggestions: plans, showhint: plans.length > 0});
  }
  _onUsers(e, users) {
    this._setState({users});
  }
  _onSelectUser(e, user) {
    this._setState({user});

  }
}

customElements.define('app-shell', AppShell);

export default AppShell;
