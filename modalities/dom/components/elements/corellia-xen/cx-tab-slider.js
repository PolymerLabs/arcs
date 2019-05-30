/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import Xen from '../../xen/xen.js';

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
    await this._animatedMove(fromTab, toTab);
    this._fire('tab-slider-done');
  }
  async _animatedMove(fromTab, toTab) {
    if (this._supportsAnimation()) {
      if (fromTab !== undefined && toTab !== undefined) {
        this.setAttribute('animating', '');
        if (this.offsetParent) {
          await this._implementAnimation(fromTab, toTab);
        }
        this.removeAttribute('animating');
      }
    }
  }
  _supportsAnimation() {
    return (typeof this.animate === 'function');
  }
  async _implementAnimation(fromTab, toTab) {
    Object.assign(this.style, {
      top: '0px',
      right: '0px',
      bottom: '0px',
      left: '0px',
    });
    const origin = this.offsetParent.getBoundingClientRect();
    const from = fromTab.getBoundingClientRect();
    const to = toTab.getBoundingClientRect();
    const easing = 'ease-in-out';
    const duration = 50;
    const fill = 'both';
    const edgeDelay = 50;
    const ord = (name, start, end, edge) => this.animate(
      [{[name]: `${start}px`}, {[name]: `${end}px`}],
      {duration, easing, fill, delay: edge ? edgeDelay : 0}
    );
    const animations = [
      ord('top', from.top - origin.top, to.top - origin.top, from.top < to.top && from.bottom < to.bottom),
      ord('right', origin.right - from.right, origin.right - to.right, from.left > to.left && from.right > to.right),
      ord('bottom', origin.bottom - from.bottom, origin.bottom - to.bottom, from.top > to.top && from.bottom > to.bottom),
      ord('left', from.left - origin.left, to.left - origin.left, from.left < to.left && from.right < to.right)
    ];
    await Promise.all(animations.map(a => new Promise(resolve => a.onfinish = resolve)));
  }
}
customElements.define('cx-tab-slider', CorelliaXenTabSlider);
