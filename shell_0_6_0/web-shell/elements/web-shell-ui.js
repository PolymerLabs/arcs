/*
@license
Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/
import {Xen} from '../../lib/xen.js';
import IconStyle from '../../components/icons.css.js';
import './web-tools.js';

// templates
const template = Xen.Template.html`
  <style>
    :host {
      display: block;
    }
    [scrim] {
      position: fixed;
      top: 0;
      right: 0;
      left: 0;
      height: 100vh;
      opacity: 0;
      background-color: white;
      z-index: -1;
      pointer-events: none;
      transition: opacity 200ms ease-in;
    }
    [scrim][open] {
      z-index: 9000;
      pointer-events: auto;
      opacity: 0.8;
    }
    ${IconStyle}
  </style>
  <!-- -->
  <div scrim open$="{{scrimOpen}}" on-click="onScrimClick"></div>
  <!-- -->
  <slot></slot>
  <!-- -->
  <web-tools context="{{context}}" arc="{{arc}}" open="{{tools}}" on-tools="onState"></web-tools>
`;

const log = Xen.logFactory('WebShellUi', '#9690cc');

export class WebShellUi extends Xen.Debug(Xen.Async, log) {
  static get observedAttributes() {
    return ['arc', 'context'];
  }
  get template() {
    return template;
  }
  render(props, state) {
    const renderModel = {
      scrimOpen: Boolean(state.tools)
    };
    return [props, state, renderModel];
  }
  onScrimClick() {
    if (this._state.tools) {
      this.state = {tools: false};
    }
  }
}

customElements.define('web-shell-ui', WebShellUi);
