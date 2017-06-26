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

let ContextFactory = require('./demo-context-factory.js');
let recipes = require('./recipes.js');

let stages = [{
  recipes: [
    recipes[0],
    recipes[1],
    recipes[2]
  ]
}, {
  recipes: [
    recipes[3]
  ]
}, {
  recipes: [
    recipes[4],
    recipes[5],
    recipes[6],
    recipes[7]
  ]
}, {
  recipes: [
    recipes[8]
  ]
}];

require('../lib/auto-tabs.js');
require('../lib/x-toast.js');

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
  x-toast[suggestion-container] {
    background-color: white;
    /*margin: 0 2px;*/
  }
  #suggestions {
    padding: 2px;
    background-color: whitesmoke;
    border: 3px solid gray;
  }
  suggest {
    display: block;
    box-shadow: 0px 1px 5px 0px rgba(102,102,102,0.21);
    background-color: white;
    color: #666666;
    margin: 6px;
    padding: 4px;
    margin-bottom: 8px;
    cursor: pointer;
  }
  suggest:hover {
    background-color: rgba(86,255,86,0.25);
    box-shadow: 0px 3px 11px 0px rgba(102,102,102,0.41);
    padding-top: 2px;
    margin-bottom: 10px;
    color: black;
  }
</style>

<auto-tabs particle-container>
  <slot></slot>
</auto-tabs>
<x-toast open suggestion-container>
  <div slot="header"><img src="../assets/dots.png"></div>
  <suggestions></suggestions>
</x-toast>

`.trim()});

class DemoFlow extends DemoBase {
  get template() {
    return template;
  }
  didMount() {
    let root = '../../';
    let {arc} = ContextFactory({
      loader: new BrowserLoader(root),
      pecFactory: require('../worker-pec-factory.js').bind(null, root),
      slotComposer: new SlotComposer(this._root.querySelector('[particle-container]'))
    });
    this.arc = arc;
    this.stages = stages;
    this.toast = this._root.querySelector('x-toast');
  }
  chooseSuggestion(plan) {
    this.toast.open = false;
    super.chooseSuggestion(plan);
  }
}

customElements.define('demo-flow', DemoFlow);