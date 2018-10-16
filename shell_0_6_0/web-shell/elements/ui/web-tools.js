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
import '../../../components/elements/simple-tabs.js';
import '../../../components/arc-tools/store-explorer.js';
import '../../../components/xen/tools/xen-explorer.js';

// templates
const template = Xen.Template.html`
  <style>
    :host {
      display: block;
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
    [tools][open] {
      z-index: 10000;
      transform: translate3d(0,0,0);
    }
    ${IconStyle}
  </style>
  <icon style="position: fixed; right: 0px; bottom: 0px; z-index: 10000;" on-click="onToolsClick">assessment</icon>
  <div tools open$="{{open}}" on-click="onToolsPanelClick">
    <simple-tabs>
      <div tab="Store Explorer">
        <store-explorer arc="{{arc}}" context="{{context}}"></store-explorer>
      </div>
      <div tab="Xen Explorer">
        <xen-explorer></xen-explorer>
      </div>
    </simple-tabs>
  </div>
`;

const log = Xen.logFactory('WebTools', '#cc9096');

export class WebTools extends Xen.Debug(Xen.Async, log) {
  static get observedAttributes() {
    return ['arc', 'context', 'open'];
  }
  get template() {
    return template;
  }
  render(props, state) {
    const renderModel = {
      scrimOpen: Boolean(props.open)
    };
    return [props, state, renderModel];
  }
  onToolsClick(e) {
    this.fire('tools', !this.state.toolsOpen);
  }
  onToolsPanelClick(e) {
    e.stopPropagation();
  }
}

customElements.define('web-tools', WebTools);
