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
require('../lib/x-toast.js');

let template = Object.assign(document.createElement('template'), {innerHTML: `

<style>
  demo-flow {
    flex: 1;
    display: flex;
    flex-direction: column;
    position: relative;
    overflow: hidden;
  }
  x-toast[suggestion-container] {
    margin: 0 2px;
  }
  suggestions {
    display: block;
    padding: 2px;
    background-color: whitesmoke;
    border: 1px solid gray;
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
    padding-top: 6px;
    margin-bottom: 6px;
    color: black;
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

  <x-toast open suggestion-container>
    <div slot="header"><img src="../assets/dots.png"></div>
    <suggestions></suggestions>
  </x-toast>
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
    this.toast = this._root.querySelector('x-toast');
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
  }
  chooseSuggestion(plan) {
    this.toast.open = false;
    super.chooseSuggestion(plan);
  }
}

customElements.define('demo-flow', DemoFlow);