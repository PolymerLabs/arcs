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
import IconStyle from '../../../../modalities/dom/components/icons.css.js';
import '../../../../modalities/dom/components/elements/simple-tabs.js';
import '../../../../modalities/dom/components/arc-tools/store-explorer.js';
import '../../../../modalities/dom/components/xen/tools/xen-explorer.js';

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
    store-explorer {
      font-size: 0.9em;
    }
    button {
      margin: 8px;
    }
    ${IconStyle}
  </style>

  <icon on-click="onToolsClick">assessment</icon>

  <div tools open$="{{open}}" on-click="onToolsPanelClick">
    <simple-tabs>
      <div tab="Store Explorer">
        <simple-tabs on-change="onTabChange">
          <div tab="User Arc">
            <store-explorer arc="{{arc}}" context="{{context}}"></store-explorer>
          </div>
          <div tab="Launcher">
            <store-explorer arc="{{launcherarc}}"></store-explorer>
          </div>
          <!-- <div tab="Pipes">
            <store-explorer arc="{{pipesarc}}"></store-explorer>
          </div> -->
        </simple-tabs>
      </div>
      <div tab="Xen Explorer">
        <xen-explorer></xen-explorer>
      </div>
      <div tab="Plumber's Helpers">
        <button on-click="onReplan">Replan</button>
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
  onTabChange(e, tab) {
    // const name = ['arc', 'launcherarc', 'pipesarc'][tab];
    // const arc = this.props[name];
    // if (arc && arc.debugHandler && arc.debugHandler.identifyArc) {
    //   log('debugHandler.identifyArc', String(arc.id));
    //   arc.debugHandler.identifyArc(arc);
    // }
  }
  onReplan() {
    const webPlanner =document.querySelector('web-shell').shadowRoot.querySelector('web-planner');
    const producer = webPlanner.state.planificator.producer;
    producer.result.suggestions = [];
    producer.produceSuggestions();
  }
}

customElements.define('web-tools', WebTools);
