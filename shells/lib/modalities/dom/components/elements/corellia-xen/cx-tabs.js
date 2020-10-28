/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import './cx-tab.js';
import './cx-tab-slider.js';
import Xen from '../../xen/xen.js';

const html = Xen.Template.html;
const template = html`

<style>
  :host {
    display: flex;
    position: relative;
  }
  :host([animating]) {
    --cx-tab-bar-display: none;
  }
</style>
<slot on-tab-connect="_onTabConnect" on-tab-select="_onTabSelect"></slot>
<cx-tab-slider from="{{from}}" to="{{to}}" on-tab-slider-done="_onSliderDone"></cx-tab-slider>

`;

class CorelliaXenTabs extends Xen.Base {
  get template() {
    return template;
  }
  _getInitialState() {
    return {
      tabs: []
    };
  }
  _render(props, state) {
    return state;
  }
  _onTabConnect(e) {
    const tab = e.target;
    const {tabs} = this._state;
    // concat so we treat `tabs` as immutable
    this._setState({tabs: tabs.concat([tab])});
  }
  _onTabSelect(e, select) {
    const selectedTab = e.target;
    selectedTab.selected = true;
    const {tabs} = this._state;
    let previousTab = undefined;
    for (const tab of tabs) {
      if (tab !== selectedTab) {
        if (tab.selected) {
          previousTab = tab;
        }
        tab.selected = false;
      }
    }
    if (previousTab !== selectedTab) {
      this.setAttribute('animating', '');
      this._setState({from: previousTab, to: selectedTab});
      // TODO(sjmiles): this is a hack because I forgot to handle selection events
      // and don't have time to fix it properly right now
      this.value = Array.from(this.children).indexOf(selectedTab);
    }
  }
  _onSliderDone() {
    this.removeAttribute('animating');
    this._fire('select');
  }
}
customElements.define('cx-tabs', CorelliaXenTabs);
