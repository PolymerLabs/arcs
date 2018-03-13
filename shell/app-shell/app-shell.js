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

  <shell-ui config="{{config}}">
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
  getInitialState() {
    return {
      launcherSoloPath: '../web/artifacts/launcher.manifest',
      profileSoloPath: '../web/artifacts/profile.manifest'
    };
  }
  _update(props, state, oldProps, oldState) {
    const {config} = state;
    if (config && config !== oldState.config) {
      this._consumeConfig(state, config);
    }
  }
  _consumeConfig(state, config) {
    let configkey = config.key || '';
    if (!config.key) {
      config.key = launcherKey;
    }
    if (config.key === launcherKey) {
      config.soloPath = state.launcherSoloPath;
      config.launcher = true;
      configkey = '';
      state.description = 'Launcher';
    }
    if (config.key === profileKey) {
      config.soloPath = state.profileSoloPath;
      config.profiler = true;
      configkey = '*';
    }
    this._setState({
      configkey
    });
  }
  _render({}, {config}) {
    const render = {
      config,
      shellPath
    };
    return render;
  }
  _onData(e, data) {
    const property = e.type;
    if (this._setIfDirty({[property]: data})) {
      log(property, data);
    }
  }
}

customElements.define('app-shell', AppShell);

export default AppShell;