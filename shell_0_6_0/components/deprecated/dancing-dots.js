/*
@license
Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

import Xen from './xen/xen.js';

const template = Xen.Template.createTemplate(
  `<style>
    dancing-dots bullet {
      display: inline-block;
      font-size: 2em;
    }
    dancing-dots bullet::after {
      content: '•'
    }
    body dancing-dots[off] bullet {
      color: silver;
    }
    dancing-dots bullet:nth-of-type(1) {
      color: blue;
    }
    dancing-dots bullet:nth-of-type(2) {
      color: red;
    }
    dancing-dots bullet:nth-of-type(3) {
      color: orange;
    }
    dancing-dots bullet:nth-of-type(4) {
      color: green;
    }
  </style>
  <div bullets>
    <bullet one></bullet>
    <bullet two></bullet>
    <bullet three></bullet>
    <bullet four></bullet>
  </div>`
);

class DancingDots extends HTMLElement {
  constructor() {
    super();
    this._active = false;
  }
  connectedCallback() {
    if (!this.childElementCount) {
      this.appendChild(template.content.cloneNode(true));
    }
  }
  get disabled() {
    return this._disabled;
  }
  set disabled(disabled) {
    this._disabled = disabled;
    if (this._disabled) {
      this.active = false;
      this.setAttribute('off', '');
    } else {
      this.removeAttribute('off');
    }
  }
  get active() {
    return this._active;
  }
  set active(active) {
    if (this._active !== active) {
      this._active = active;
      this._active ? this._start() : this._stop();

      // add a marker to allow other components (and tests) to see when we're
      // done processing.
      this[active ? 'setAttribute' : 'removeAttribute']('animate', '');
    }
  }
  get _bullets() {
    return this.querySelectorAll('bullet');
  }
  _start() {
    this._bullets.forEach((bullet, i) => {
      const keyframes = {transform: ['translateY(8px)', 'translateY(-8px)']};
      const timing = {
        iterations: Infinity,
        duration: 200,
        direction: 'alternate',
        iterationStart: 0.5,
        easing: 'ease-in-out',
        delay: i * 40,
      };
      bullet._animation = bullet.animate && bullet.animate(keyframes, timing);
    });
  }
  _stop() {
    for (const bullet of this._bullets) {
      // Ideally we would cause the animation to reach the half way point
      // between iterations, but that's complicated without the setTiming
      // API.
      if (bullet.animate) {
        const transform = getComputedStyle(bullet).transform;
        const animation = bullet._animation;
        const stopAnimation = bullet.animate(
            {transform: [transform, 'translateY(0px)']},
            // About 10 frames at 60hz.
            {duration: 166.66, easing: 'ease'});
        stopAnimation.startTime = animation.startTime + animation.currentTime;
        animation.cancel();
      }
    }
  }
  startStop() {
    this.active = !this.active;
  }
  disEnable() {
    this.disabled = !this.disabled;
  }
}
customElements.define('dancing-dots', DancingDots);
