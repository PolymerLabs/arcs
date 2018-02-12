/*
@license
Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/
import Xen from '../xen/xen.js';

const template = Xen.Template.createTemplate(
  `<style>
    arc-item {
      display: inline-block;
      padding: 8px;
    }
  </style>
  <div title="{{key}}">
    <i class="material-icons" style="color: gray;">donut_large</i>
    <span unsafe-html="{{name}}"></span>
    <a href="{{href}}" target="_blank"><i class="material-icons" style="font-size: 0.8em; vertical-align: middle;">open_in_new</i></a>
  </div>`
);

class ArcItem extends Xen.Base {
  static get observedAttributes() { return ['key','data']; }
  get template() { return template; }
  get host() {
    return this;
  }
  _render(props, state) {
    let {key, data} = props;
    let label = data ? data.description : '';
    return {
      key,
      name: label,
      href: `${location.origin}/${location.pathname}?amkey=${key}`
    };
  }
}
customElements.define("arc-item", ArcItem);
