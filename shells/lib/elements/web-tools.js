/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Xen} from '../components/xen.js';
import IconStyle from '../modalities/dom/components/icons.css.js';
import '../modalities/dom/components/elements/simple-tabs.js';
import '../modalities/dom/components/arc-tools/store-explorer.js';
import '../modalities/dom/components/xen/tools/xen-explorer.js';

// templates
const template = Xen.Template.html`
  <style>
    :host {
      display: block;
    }
    icon {
      position: fixed;
      right: 0px;
      bottom: 0px;
      z-index: 10000;
    }
    [scrim] {
      position: fixed;
      right: 0;
      width: 100vw;
      top: 0;
      bottom: 0;
      overflow: hidden;
      background-color: rgba(0, 0, 0, 0.13);
      transform: translate3d(120%, 0, 0);
    }
    [tools] {
      position: fixed;
      right: 0;
      width: 80vw;
      top: 0;
      bottom: 0;
      box-shadow: 0px 0px 32px 3px rgba(0,0,0,0.13);
      transform: translate3d(120%, 0, 0);
      transition: transform 200ms ease-in-out;
      overflow: auto;
      color: black;
      background-color: white;
    }
    [open] {
      z-index: 10000;
      transform: translate3d(0,0,0);
    }
    store-explorer {
      font-size: 0.9em;
    }
    button {
      margin: 8px;
    }
    ${IconStyle}
  </style>

  <icon on-click="onToolsPanelOpen">assessment</icon>

  <div scrim open$="{{toolsOpen}}" on-click="onToolsPanelClose"></div>
  <div tools open$="{{toolsOpen}}">
    <simple-tabs>
      <div tab="Store Explorer">
        <simple-tabs on-change="onTabChange">
          <div tab="User Arc" style="padding-top: 8px;">
            <store-explorer arc="{{arc}}" context="{{context}}"></store-explorer>
          </div>
        </simple-tabs>
      </div>
      <div tab="Xen Explorer">
        <xen-explorer></xen-explorer>
      </div>
      <div tab="Plumber's Helpers">
      </div>
    </simple-tabs>
  </div>
`;

const log = Xen.logFactory('WebTools', '#cc9096');

export class WebTools extends Xen.Debug(Xen.Async, log) {
  static get observedAttributes() {
    return ['arc', 'context', 'nullarc', 'launcherarc', 'pipesarc', 'open'];
  }
  get template() {
    return template;
  }
  render(props, state) {
    const renderModel = {
      scrimOpen: Boolean(state.toolsOpen)
    };
    return [props, state, renderModel];
  }
  onToolsPanelClose(e) {
    e.stopPropagation();
    this.state = {toolsOpen: false};
  }
  onToolsPanelOpen(e) {
    e.stopPropagation();
    this.state = {toolsOpen: true};
  }
  onTabChange(e, tab) {
  }
}

customElements.define('web-tools', WebTools);
