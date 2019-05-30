/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import Xen from '../xen/xen.js';

//const log = Xen.logFactory('DomRepeater', 'blue');

class DomRepeater extends Xen.Base {
  static get observedAttributes() {
    return ['models'];
  }
  get host() {
    return this;
  }
  _update({models}, state) {
    if (!state.template) {
      state.template = this.querySelector('template');
    }
    if (!state.doms) {
      state.doms = {};
      state.pool = [];
    }
    if (state.template && models) {
      this._repeat(this.host, models, state.doms, state.pool, state.template);
    }
  }
  _repeat(host, models, doms, pool, template) {
    Object.values(doms).forEach(dom => dom.used = false);
    models.forEach(model => {
      const dom = this._requireDom(doms, pool, model.key, template, host);
      dom.used = true;
      dom.set(model);
      dom.firstElement.style.transition = dom.new ? 'none' : '';
    });
    Object.keys(doms).forEach(key => {
      const dom = doms[key];
      // TODO(sjmiles): by convention
      const root = dom.firstElement;
      // remove unused DOM elements
      if (!dom.used) {
        this._styleUnusedDom(root);
        // move unused DOM into reuse pool
        pool.push(dom);
        delete doms[key];
      } else {
        this._styleUsedDom(root);
      }
    });
  }
  _requireDom(doms, pool, key, template, host) {
    let dom = doms[key];
    if (!dom) {
      dom = pool.pop() || this._stampDom(template, host);
      dom.new = true;
      doms[key] = dom;
    } else {
      dom.new = false;
    }
    return dom;
  }
  _stampDom(template, host) {
    return Xen.Template.stamp(template).appendTo(host).forward();
  }
  _styleUnusedDom(root) {
    root.style.pointerEvents = 'none';
    root.classList.add('xen-exit');
    const firstElementStyles = window.getComputedStyle(root);
    const exitTransitionDuration = firstElementStyles.getPropertyValue('transition-duration');
    if (exitTransitionDuration === '0s') {
      // no exit transition defined, hide the element immediately
      root.style.opacity = '0';
    }
  }
  _styleUsedDom(root) {
    root.classList.remove('xen-exit');
    root.style.removeProperty('opacity');
    root.style.removeProperty('pointer-events');
  }
}

customElements.define('dom-repeater', DomRepeater);
