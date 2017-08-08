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
  get stages() {
    return this._stages;
  }
  set stages(stages) {
    this.stageNo = 0;
    this._stages = stages;
    this.update();
  }
  update() {
    if (this.arc && this.stages) {
      this.nextStage();
    }
  }
  nextStage() {
    this.stage = this.stages[this.stageNo % this.stages.length];
    //this.stage.recipes = recipes;
    this.stageNo++;
    this.suggest();
  }
  async suggest() {
    if (!this.stage.recipes) {
      return;
    }

    let planner = new Planner();
    // TODO: Shrug.. Context dependency between demo base and subclasses is weird.
    this.context.recipes = this.stage.recipes;
    planner.init(this.arc, this.context);
    let plans = await planner.plan(500);

    const Speculator = require('../../speculator.js');
    let speculator = new Speculator;

    plans.forEach(async(plan, i) => {
      const DescriptionGenerator = require('../../description-generator.js');
      let relevance = await speculator.speculate(this.arc, plan);
      let rank = relevance.calcRelevanceScore();
      let description = new DescriptionGenerator(plan, relevance).description;
      this.suggestions.add({plan, rank, description}, i);
    });
  }
}

module.exports = DemoBase;
