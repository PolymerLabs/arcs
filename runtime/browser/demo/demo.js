/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

let BrowserLoader = require("../../browser-loader.js");
let SlotComposer = require('../../slot-composer.js');
let DemoBase = require('../lib/demo-base.js');
let demoContext = require('./demo-context-factory.js');

// 0: make shortlist, 1: see wishlist,
// 2: uber shortlist, 3: buying for,
// 4: manu info, 5: interests

function buildStages(recipes) {
  return [{
    recipes: [
      recipes[0],
      recipes[1],
      recipes[2]
    ]
  }, {
    recipes: [
      recipes[3],
      recipes[4]
    ]
  }, {
    recipes: [
      recipes[3],
      recipes[4],
      recipes[5]
    ]
  }, {
    recipes: [
      recipes[4],
      recipes[5]
    ]
  }, {
    recipes: [
      recipes[5],
      recipes[6]
    ]
  }];
}

require('../lib/auto-tabs.js');
require('../lib/suggestions-element.js');

let template = Object.assign(document.createElement('template'), {innerHTML: `

<style>
  :host {
    display: flex;
    flex-direction: column;
    position: relative;
    overflow: hidden;
  }
  [particle-container] {
    flex: 1;
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    padding-bottom: 25px;
    overflow: auto;
    overflow-x: hidden;
  }
  [particle-container] > * {
    flex: 1;
  }
</style>

<auto-tabs particle-container>
  <slot></slot>
</auto-tabs>
<suggestions-element></suggestions-element>

`.trim()});

class DemoFlow extends DemoBase {
  get template() {
    return template;
  }
  async didMount() {
    let root = '../../';
    let loader = new BrowserLoader(root);
    let {context} = await demoContext({
      loader,
      pecFactory: require('../worker-pec-factory.js').bind(null, root),
      slotComposer: new SlotComposer(this.$('[particle-container]'),  /* affordance */ "dom")
    });
    this.arc = context.arc;
    this.context = context;
    this.stages = buildStages(context.recipes);
    this.suggestions = this.$('suggestions-element');
    this.suggestions.arc = context.arc;
    this.suggestions.callback = this.nextStage.bind(this);
  }
}

customElements.define('demo-flow', DemoFlow);
