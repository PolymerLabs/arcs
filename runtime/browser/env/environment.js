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
import '../lib/suggestions-element.js';

Tracing.enable();
window.Tracing = Tracing;

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

class ArcHost extends DemoBase {
  get template() {
    return template;
  }
  async didMount() {
    let root = '../../';
    let loader = new BrowserLoader(root);
    let arc = new Arc({
      id: 'demo',
      pecFactory: WorkerPecFactory.bind(null, root),
      slotComposer: new SlotComposer({
        rootContext: this.$('[particle-container]'),
        suggestionsContext: this.$('suggestions-element'),
        affordance: 'dom',
      }),
      context: await Manifest.load(this.getAttribute('manifest-location'),
      loader),
    });
    this.arc = arc;
    this.suggest(this.arc, this.$('suggestions-element'));
  }
}

customElements.define('arc-host', ArcHost);
