// elements
import './app-bar.js';
// components
// for particle use
// deprecated!
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
      --bar-max-width: 400px;
      --bar-max-height: 33vh;
      --bar-hint-height: 112px;
      --bar-small-height: 56px;
      --bar-peek-height: 16px;
    }
    :host {
      display: block;
    }
  </style>

  <app-bar>
    <slot></slot>
    <slot name="suggestions" slot="suggestions"></slot>
  </app-bar>
`;

const log = Xen.logFactory('AppShell', '#6660ac');

class AppShell extends Xen.Debug(Xen.Base, log) {
  get template() {
    return template;
  }
  _getInitialState() {
    return {
    };
  }
  _update(props, state, oldProps, oldState) {
  }
  _render({}, state) {
  }
  _consumeConfig(state, config) {
  }
}

customElements.define('app-shell-prototype', AppShell);

export default AppShell;
