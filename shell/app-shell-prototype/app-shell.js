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

  <arc-planner
    config="{{config}}"
    arc="{{arc}}"
    search="{{search}}"
    suggestions="{{suggestions}}"
    suggestion="{{suggestion}}"
    on-plans="_onPlans"
    on-plan="_onStateData"
  ></arc-planner>

  <shell-handles
    arc="{{arc}}"
    users="{{users}}"
    user="{{user}}"
    visited="{{arcs}}"
    on-theme="_onStateData"
  ></shell-handles>

  <cloud-data
    user="{{user}}"
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
        info: {
          name: 'Gomer',
          avatar: `data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAkGBwgHBgkIBwgKCgkLDRUPDQwMGRoUGhAWIB0iIiAdHxskKDQsJCYxJxsfLT0tMTU3Ojo6Iys/RD84PDQ5OjcBCgoKBQUFDgUFDisZExkrKysrKysrKysrKysrKysrKysrKysrKysrKysrKysrKysrKysrKysrKysrKysrKysrK//AABEIADIAMgMBIgACEQEDEQH/xAAcAAACAQUBAAAAAAAAAAAAAAAABwYBAgMFCAT/xAA6EAABAwIEAgYHBQkAAAAAAAABAgMEABEFBhIhMUETIjJCUXEHFCNSYYGxNWJykaEVJTNTc8Hh8PH/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8A3M7MUzEcQbfZcXBiMNjoUd8qI7Tnht3d7UYznoQcHltyH0IxfoCppOoJSLg6VW+VRF0YklyMG5avbuJZZaYtdxZ5E02cq5SiYNFWZTbUzEZIHrUhwBWr7qb8Eig5zht4zmbElFQdnTHSFOLeOlCfDUf7VNWMm5ww2MXojmFWSLlsCwPw1GqxMOhftnGkQ4TsmGxiLzbMdKi2Eqv3vEC1hfap/GlLn4Y/C6KO8tlwtpSpPVWLbAjlQQz0cZmnRM1xsFxNC4SZKleyWSpKzY20qv73/adSkUvk4GyzjGByVwIrT0eV0qmWR1QdBFx4b6T8qYqk0GVAGhPkKKuR2E+VFAkvRcmNHxky8YfbUk9SAXFag2s87nskjYfPxpzJFjXL6ZK0QEgEFCbm/j/t632H55x3BkKZRPedi6QNCiFKb/CVXt5UEux3BXcq5sl4qFpOGYy/caduidtchXLrdYismXp0SHiMhiRibOt6YXI7KgELWFC1viPClJmfO2O4zOQrEZ7jzLK06W0jQjbgdA2v8aYOVMy4NIYTJmzgy/t7Eo1FVvdPPy4igYIfgPZhisS30tKIPQoWbdIvjpHxtUrNJHPSX5kSDiERC2pSZyFxEE6Vcf051NIecZyFhMlLLw71wUKTegn6eyPKitO3mGMW0koPAcxRQc0zoUnBJEvDMVaLDzNlFs7i1r7HmDVsZRmF5ska7a0g8+vb6U5fSzl2Ni+WncVSlKZuHM6wv32u8g/Uf5pGNPCI8xLQo6k3SofdNBnW00hKXXEJU2R0bw8N9j8j9aujRX4aSjDlsokKWFJUvc2T7t+HEVmDjDjqis9R4Dq22N+NWxHEIaUw91vV1W6RPaCeRtztwoNjiecJWKvwEPNBmRFsnS32NgesPmfpXtZxt16WXmf4je+n+Yk8fyP6GoaEhWJvOkjSAd08N/CtlCcEey7qCgsHy+FBPkZhZ0Jugg2G16rUfEzDiAVxxr71lc6rQOfMO+S8Yvv+73uP9M1y6oksDflRRQbSN9mMnmFbfnRF+0JX4aKKDzMgetSNh2k17ZQAYTYAdfl5VWig1ZJvxNFFFB//2Q==`
        }
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
      key = state.key = ArcsUtils.getUrlParam('key') || Const.SHELLKEYS.launcher;
    }
    ArcsUtils.setUrlParam('key', !Const.SHELLKEYS[key] ? key : '');
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
        log('suggestion registered from launcher, set key to *');
        this._setKey('*');
      }
    }
    if (key && !Const.SHELLKEYS[key] && suggestions && pendingSuggestion) {
      log('instantiating pending launcher suggestion');
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
    this._setKey(key || Const.SHELLKEYS.launcher);
  }
  _setKey(key) {
    log('registered new key, begin arc rebuild procedure');
    this._setState({
      key,
      description: null,
      serialized: null,
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
  _onPlans(e, plans) {
    this._setState({suggestions: plans, showhint: plans && plans.length > 0});
  }
  _onSelectUser(e, user) {
    this._setState({user});
  }
}

customElements.define('app-shell', AppShell);

export default AppShell;
