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
const Arc = require('../../arc.js');
const Manifest = require("../../manifest.js");

require('../lib/suggestions-element.js');

const Tracing = require('../tracelib/trace.js');
Tracing.enable();
global.Tracing = Tracing;

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

<div particle-container>
  <div slotid="root">
  </div>
</div>
<suggestions-element></suggestions-element>

`.trim()});

class DemoFlow extends DemoBase {
  get template() {
    return template;
  }
  async didMount() {
    let root = '../../';
    let loader = new BrowserLoader(root);
    let arc = new Arc({
      id: 'demo',
      pecFactory: require('../worker-pec-factory.js').bind(null, root),
      slotComposer: new SlotComposer({rootContext: this.$('[particle-container]'), affordance: "dom"}),
      context: await Manifest.load('browser/demo/recipes.manifest', loader),
      loader,
    });
    this.arc = arc;
    this.suggest(this.arc, this.$('suggestions-element'));
  }

}

customElements.define('demo-flow', DemoFlow);
