/*
@license
Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

import Xen from './xen/xen.js';

const template = Xen.Template.createTemplate(
  `<style>
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
    <span on-click="_onToggle">{{icon}}</span>`
);

class ToggleButton extends Xen.Base {
  static get observedAttributes() { return ['icons','state']; }
  get template() {
    return template;
  }
  _getInitialState() {
    return {
      state: 0,
      icons: []
    }
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
    this._setState({state});
    // TODO(sjmiles): better to fire after updating the display, how hard is that logic?
    this._fire('state', state);
  }
}

ToggleButton.log = Xen.Base.logFactory('ToggleButton', '#00701a');
customElements.define('toggle-button', ToggleButton);

export default ToggleButton;
