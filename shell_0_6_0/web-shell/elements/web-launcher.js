/*
@license
Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

import {SlotComposer} from '../../../runtime/slot-composer.js';
import {Xen} from '../../lib/xen.js';
import './web-arc.js';

// templates
const template = Xen.Template.html`
  <style>
    :host {
      display: block;
      text-align: center;
    }
    cx-tabs {
      border-bottom: 1px solid #ccc;
      justify-content: center;
    }
    cx-tab {
      font-weight: 500;
      font-size: 14px;
      letter-spacing: .25px;
      color: #999;
    }
    [preview] {
      padding: 16px;
    }
    [wrapper] {
      display: inline-block;
      border: 1px solid silver;
      width: 192px;
      height: 200px;
      overflow: hidden;
      margin: 16px;
      text-align: left;
    }
    [label] {
      background-color: whitesmoke;
      height: 32px;
      white-space: nowrap;
      font-size: 12px;
      padding: 4px;
    }
    [box] {
      transform-origin: top left;
      transform: scale(0.3);
      width: 640px;
      height: 560px;
      pointer-events: none;
    }
  </style>
  <cx-tabs on-select="onTabSelect">
    <cx-tab>All</cx-tab>
    <cx-tab selected>Recent</cx-tab>
    <cx-tab>Starred</cx-tab>
    <cx-tab>Shared</cx-tab>
  </cx-tabs>
  <div preview></div>
`;

const preview = Xen.Template.html`
  <a wrapper href="{{href}}">
    <div label unsafe-html="{{description}}"></div>
    <div box>
      <web-arc env="{{env}}" storage="{{storage}}" config="{{config}}"></web-arc>
    </div>
  </a>
`;

const log = Xen.logFactory('WebLauncher', '#BF8A57');

export class WebLauncher extends Xen.Debug(Xen.Async, log) {
  static get observedAttributes() {
    return ['env', 'storage', 'info'];
  }
  get template() {
    return template;
  }
  async update(props, state) {
    if (props.info !== state.info) {
      state.info = props.info;
      this.launcherStoreChange(props);
    }
  }
  render(props, state) {
    return [props, state];
  }
  launcherStoreChange({env, storage, info}) {
    log(info);
    info.remove && info.remove.forEach(({value: {id}}) => this.removeArc(id));
    info.add && info.add.forEach(({value: {id, rawData}}) => {
      if (!rawData.deleted) {
        this.addArc(env, storage, id, rawData);
      }
    });
  }
  removeArc(id) {
    this.boxes = this.boxes || {};
    const oldarc = this.boxes[id];
    if (oldarc) {
      oldarc.config = null;
      oldarc.parentElement.parentElement.remove();
      this.boxes[id] = null;
    }
  }
  addArc(env, storage, id, {key, href, description}) {
    this.boxes = this.boxes || {};
    const oldarc = this.boxes[id];
    if (!oldarc) {
      const dom = Xen.Template.stamp(preview).appendTo(this.host.querySelector('[preview]'));
      dom.set({description, href, env, storage, config: {id: key}});
      this.boxes[id] = dom.root.querySelector('web-arc');
      log(id, this.boxes[id]);
    }
  }
}

customElements.define('web-launcher', WebLauncher);
