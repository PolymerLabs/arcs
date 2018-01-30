/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import BrowserLoader from '../../browser-loader.js';
import SlotComposer from '../../slot-composer.js';
import DemoBase from '../lib/demo-base.js';
import Arc from '../../arc.js';
import Manifest from '../../manifest.js';
import Tracing from '../../../tracelib/trace.js';

import WorkerPecFactory from '../worker-pec-factory.js';
import '../lib/suggestion-element.js';

Tracing.enable();

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
  }
  div[slotid="suggestions"] {
    display: block;
    max-height: 500px;
    overflow-y: auto;
  }
</style>

<div particle-container>
  <div slotid="root">
  </div>
</div>
<x-toast suggestion-container>
  <div slot="header">
    <img alt="dots" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADQAAAAICAYAAAC2wNw9AAACdElEQVQ4jd2UPUyTURSGn/u1BSmt0FZqpcWKQCLCYIwMaEUTSGAganRhQwc3DbPRgcGEsBgwDiZGJU4MxoFJjI0R+TEhDkaIkhjlp4Uq0gL9AfrzHYey9oPReO50h+c973vvyVEiIgAr60JwJgNAa6OFI+WK/VZ6eorMzGe0CjclnVf3zYGOhF8gOyuosiaUq23fZDj5i9GFcQDa/QG8pYcBUCIiwdksd4a3WI4JAJUORV9XCa0N5j2F4/29JJ8/Rk8lUSYTRc3ncQw8QXN7jMHtRXKfOpHVL/m7CbSabrSTQ3v2HF0Yp2fsPuHkbwC8pW4GW+7R7g+gltZ0uTaQYDMlVDo1AJajOgetipc9NqpchX9q69UwsVs3MFfXoKw20HNk5maxXumi/NEzQ1O56QASmgC7AmWBXBpJgvnMQ1TV7YLcwmaYjpGbbOzE8dnyjxZKRCgrtvPm8lO0918zhKP5MCIgApVOjXBUCM5mDE1tvx5BczjzYUQHpTAfqyU9PUlu8WdBTlLfkLUJKAWUGRAwF4EF9OUhw56jS+MsJVbw2T3I7vHZPYQSEd6GptAM6X+yFIrCU6NdqLfgdSqWozpKgVL5kfM6Fa0NFkPpAx2X0GNRJJUApYEI2fnvFDWdxXS0urAl6wmU6xwkAckCCrJpyIBWed2wZ3tVAJ/NQyge2Y2mCMUj+Gwe2nzNmB709/Yed5v4MJdlflVYiwuH7PmlcMpvMhS31DdCNkt6coxcJIxsxCgOXKS8bxBVajNkNVcbshmE9V+QzoEOprputNo+Q6682E5dmZ93oY/82AzxZztGRYmDwZa7nHY35Lcc/D9r+y9bbAxYGnHEIgAAAABJRU5ErkJggg==">
  </div>
  <div slotid="suggestions"></div>
</x-toast>
`.trim()});

class DemoFlow extends DemoBase {
  get template() {
    return template;
  }
  async didMount() {
    let root = '../../';
    let loader = new BrowserLoader(root);
    this.arc = new Arc({
      id: 'demo',
      pecFactory: WorkerPecFactory.bind(null, root),
      slotComposer: new SlotComposer({
        rootContext: this.$('[particle-container]').parentNode,
        affordance: 'dom'}),
      context: await Manifest.load('browser/demo/recipes-duplicate.manifest', loader),
      loader,
    });
    this.suggest(this.arc);
  }
}

customElements.define('demo-flow', DemoFlow);
