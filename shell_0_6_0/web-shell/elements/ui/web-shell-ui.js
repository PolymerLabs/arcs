/*
@license
Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/
import {Xen} from '../../../lib/xen.js';
import IconStyle from '../../../components/icons.css.js';
import './system-ui.js';
import './web-tools.js';
import './suggestion-element.js';

// templates
const template = Xen.Template.html`
  <style>
    :host {
      display: block;
    }
    :host {
      --bar-max-width: 400px;
      --bar-max-height: 50vh;
      --bar-hint-height: 160px;
      --bar-over-height: 56px;
      --bar-peek-height: 16px;
      --bar-touch-height: 32px;
      --bar-space-height: 48px;
      --avatar-size: 24px;
      --large-avatar-size: 40px;
    }
    ${IconStyle}
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
    system-ui {
      position: fixed;
      z-index: 10000;
      right: 0;
      bottom: 0;
      left: 0;
      margin: 0 auto;
      width: 90vw;
      max-width: var(--bar-max-width);
    }
  </style>
  <!-- -->
  <div scrim open$="{{scrim}}" on-click="onScrimClick"></div>
  <!-- -->
  <slot></slot>
  <!-- -->
  <system-ui open="{{system}}" on-open="onSystemUiOpen" on-search="onForward">
    <slot name="suggestions"></slot>
  </system-ui>
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
      scrim: Boolean(state.tools || state.system)
    };
    return [props, state, renderModel];
  }
  onScrimClick() {
    this.state = {tools: false, system: false};
  }
  onSystemUiOpen(e, system) {
    this.state = {system};
  }
  onForward(e, data) {
    this.fire(e.type, data);
  }
}

customElements.define('web-shell-ui', WebShellUi);
