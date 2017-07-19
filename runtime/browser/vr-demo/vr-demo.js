/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

let Suggestinator = require("../../suggestinator.js");
let ContextFactory = require('./demo-context-factory.js');
let BrowserLoader = require("../../browser-loader.js");
let SlotComposer = require('../../slot-composer.js');

let recipes = require('./recipes.js');
let DemoBase = require('../lib/demo-base.js');

require('../lib/auto-tabs.js');
require('../lib/suggestions-element.js');

let template = `

<style>
  demo-flow {
    flex: 1;
    display: flex;
    flex-direction: column;
    position: relative;
    overflow: hidden;
  }
</style>

<a-scene gridhelper="size:8" particle-container physics="debug: false">
  <a-entity light="type:directional; castShadow: true;" position="1 1 1"></a-entity>
  <a-sky color="#DCDCDC" src="assets/tokyo (candy bar).jpg"></a-sky>
  <a-camera position="0 0 0"></a-camera>
</a-scene>

<suggestions-element></suggestions-element>

  `.trim();

let bg = window.location.hash.slice(1);
switch (bg) {
  case '1':
    template = template.replace('tokyo (candy bar)', 'tokyo');
  default:
    template = template.replace('gridhelper="size:8" ', '');
    break;
  case '2':
    template = template.replace('src="assets/tokyo (candy bar).jpg"', '');
    template = template.replace('<a-camera position="0 0 0">', '<a-camera position="0 0 2">');
    break;
}

template = Object.assign(document.createElement('template'), {innerHTML: template});

class DemoFlow extends DemoBase {
  get template() {
    return template;
  }
  mount() {
    this._root = this;
    this._root.appendChild(document.importNode(this.template.content, true));
    this.didMount();
  }
  didMount() {
    let {arc} = ContextFactory({
      loader: new BrowserLoader('../../'),
      pecFactory: require('../worker-pec-factory.js').bind(null, '../../'),
      slotComposer: new SlotComposer(this.$('[particle-container]'))
    });
    this.arc = arc;
    this.stages =  [{
      recipes
    }];
    this.suggestions = this.$('suggestions-element');
    this.suggestions.arc = arc;
    this.suggestions.callback = this.nextStage.bind(this);
  }
}

customElements.define('demo-flow', DemoFlow);