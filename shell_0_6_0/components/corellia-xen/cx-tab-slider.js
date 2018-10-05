/*
@license
Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

import Xen from '../xen/xen.js';

const html = Xen.Template.html;
const template = html`

<style>
  :host {
    pointer-events: none;
    display: none;
    position: absolute;
    top: 0px;
    right: 0px;
    left: 0px;
    bottom: 0px;
    border-width: var(--cx-tab-slider-width, 0px 0px 1px 0px);
    border-style: var(--cx-tab-slider-style, solid);
    border-color: var(--cx-tab-slider-color, blue);
    margin-bottom: -2px;
  }
  :host([animating]) {
    display: block;
  };
</style>

`;

class CorelliaXenTabSlider extends Xen.Base {
  static get observedAttributes() {
    return ['from', 'to'];
  }
  get template() {
    return template;
  }
  _render(props, state, oldProps) {
    if (props.from && props.to) {
      if (props.from !== oldProps.from || props.to !== oldProps.to) {
        this._move(props.from, props.to);
      }
    }
  }
  async _move(fromTab, toTab) {
    if (typeof this.animate !== 'function') return;
    if (fromTab === undefined || toTab === undefined) return;
    this.setAttribute('animating', '');
    if (!this.offsetParent) {
      this.removeAttribute('animating');
      return;
    }
    Object.assign(this.style, {
      top: '0px',
      right: '0px',
      bottom: '0px',
      left: '0px',
    });
    const originBox = this.offsetParent.getBoundingClientRect();
    const fromBox = fromTab.getBoundingClientRect();
    const toBox = toTab.getBoundingClientRect();
    const easing = 'ease-in-out';
    const duration = 50;
    const fill = 'both';
    const edgeDelay = 50;
    const animations = [
      this.animate([
          {top: `${fromBox.top - originBox.top}px`},
          {top: `${toBox.top - originBox.top}px`},
        ], {
          delay: (fromBox.top < toBox.top && fromBox.bottom < toBox.bottom) ? edgeDelay : 0,
          duration,
          easing,
          fill,
        }),
      this.animate([
          {right: `${originBox.right - fromBox.right}px`},
          {right: `${originBox.right - toBox.right}px`},
        ], {
          delay: (fromBox.left > toBox.left && fromBox.right > toBox.right) ? edgeDelay : 0,
          duration,
          easing,
          fill,
        }),
      this.animate([
          {bottom: `${originBox.bottom - fromBox.bottom}px`},
          {bottom: `${originBox.bottom - toBox.bottom}px`},
        ], {
          delay: (fromBox.top > toBox.top && fromBox.bottom > toBox.bottom) ? edgeDelay : 0,
          duration,
          easing,
          fill,
        }),
      this.animate([
          {left: `${fromBox.left - originBox.left}px`},
          {left: `${toBox.left - originBox.left}px`},
        ], {
          delay: (fromBox.left < toBox.left && fromBox.right < toBox.right) ? edgeDelay : 0,
          duration,
          easing,
          fill,
        }),
    ];
    await Promise.all(animations.map(a => new Promise(resolve => a.onfinish = resolve)));
    //await Promise.all(animations.map(a => a.finished));
    this.removeAttribute('animating');
    this._fire('tab-slider-done');
  }
}
customElements.define('cx-tab-slider', CorelliaXenTabSlider);
