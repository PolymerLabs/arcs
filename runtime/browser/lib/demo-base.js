/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

const Planner = require("../../planner.js");

class DemoBase extends HTMLElement {
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
  get arc() {
    return this._arc;
  }
  set arc(arc) {
    this._arc = arc;
    this.update();
  }
  update() {
    if (this.arc) {
      this.nextStage();
    }
  }
  nextStage() {
    this.stageNo++;
    this.suggest();
  }
  async suggest() {
    let planner = new Planner();
    planner.init(this.arc);
    let generations = [];
    let suggestions = await planner.suggest(5000, generations);
    suggestions.forEach(async (suggestion, i) => {
      this.suggestions.add(suggestion, i);
    });
    // fire an event so optional tooling can present this data
    document.dispatchEvent(new CustomEvent('generations', {detail: generations}));
  }
}

module.exports = DemoBase;
