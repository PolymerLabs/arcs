/**
 * @license
 * Copyright (c) 2016 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import Xen from './xen/xen.js';

let template = Xen.html`

<style>
  :host {
    display: inline-flex;
    font-size: 24px;
    font-style: normal;
    font-family: 'Material Icons';
    width: 1em;
    cursor: pointer;
    user-select: none;
  }
  span {
    display: inline-block;
    font: inherit;
    line-height: 1;
    -webkit-font-feature-settings: 'liga';
    -webkit-font-smoothing: antialiased;
  }
</style>
<span on-click="_onToggle">{{icon}}</span>

`;
template = Xen.Template.createTemplate(template);

const log = Xen.logFactory('ToggleButton', '#00701a');

class ToggleButton extends Xen.Base {
  static get observedAttributes() { return ['icons', 'state', 'noauto']; }
  get template() {
    return template;
  }
  _getInitialState() {
    return {
      // TODO(sjmiles): `state` is a confusing name (vis a vis `_setState` and so on), use something else
      state: 0,
      icons: []
    };
  }
  _willReceiveProps(props, state) {
    if ('state' in props) {
      state.state = props.state;
    }
    state.icons = (props.icons || '').split(' ');
  }
  _render(props, state) {
    return {
      icon: state.icons[state.state] || ''
    };
  }
  _onToggle() {
    let {state, icons} = this._state;
    state = (state + 1) % icons.length;
    // TODO(sjmiles): better to fire after updating the display, how hard is that logic?
    this._fire('state', state);
  }
}
customElements.define('toggle-button', ToggleButton);

export default ToggleButton;
