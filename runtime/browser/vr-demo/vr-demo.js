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

let template = Object.assign(document.createElement('template'), {innerHTML: `

<style>
  demo-flow {
    flex: 1;
    display: flex;
    flex-direction: column;
    position: relative;
    overflow: hidden;
  }
</style>

  <a-scene particle-container physics="debug: false">

    <a-entity light="type:directional; castShadow: true;" position="1 1 1"></a-entity>
    <a-sky color="#ECECEC" src="assets/tokyo (candy bar).jpg"></a-sky>
    <a-camera position="0 0 0">
      <!--
      <a-entity position="0 0 -1" scale="0.02 0.02 0.02"
        geometry="primitive: ring"
        material="color: black; shader: flat"
        cursor="fuse: true; fuseTimeout: 750"
        raycaster="objects: [clickable]"
        event-set__fuse="_event: fusing; material.color: red"
        event-set__leave="_event: mouseleave; material.color: black; scale: 0.02 0.02 0.02">
        <a-animation begin="cursor-fusing" easing="ease-in" attribute="scale"
          fill="forwards" from="0.02 0.02 0.02" to="0.002 0.002 0.002" dur="700"></a-animation>
        <a-animation begin="click" easing="ease-out-elastic" attribute="scale"
          from="0.002 0.002 0.002" to="0.02 0.02 0.02" dur="150"></a-animation>
      </a-entity>
      -->
    </a-camera>

  </a-scene>

  <suggestions-element></suggestions-element>
`.trim()});

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
      slotComposer: new SlotComposer(this._root.querySelector('[particle-container]'))
    });
    this.arc = arc;
    this.stages =  [{
      recipes: [
        recipes[0],
        recipes[1],
        recipes[2]
      ]
    }];
    this.suggestions = this._root.querySelector('suggestions-element');
    this.suggestions.arc = arc;
    this.suggestions.callback = this.nextStage.bind(this);
  }
}

customElements.define('demo-flow', DemoFlow);