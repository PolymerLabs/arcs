/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import Planner from '../../planner.js';

export default class DemoBase extends HTMLElement {
  constructor() {
    super();
  }
  connectedCallback() {
    if (!this._mounted) {
      this._mounted = true;
      this.mount();
    }
  }
  mount() {
    this._root = this.attachShadow({mode: 'open'});
    this._root.appendChild(document.importNode(this.template.content, true));
    this.didMount();
  }
  didMount() {
  }
  $(selector) {
    return this._root && this._root.querySelector(selector);
  }
  suggest(arc, ui) {
    if (!arc.makeSuggestions) {
      arc.makeSuggestions = async () => {
        let planner = new Planner();
        planner.init(arc);
        let generations = [];
        ui.suggestions = await planner.suggest(5000, generations);
        document.dispatchEvent(new CustomEvent('generations', {detail: {generations, arc}}));
      };
    }
    ui.addEventListener('plan-selected', e => {
      let {plan} = e.detail;
      arc.instantiate(plan);
      arc.makeSuggestions();
    });
    arc.makeSuggestions();
  }
}
