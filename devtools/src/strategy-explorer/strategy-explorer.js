/*
Copyright (c) 2017 Google Inc. All rights reserved.
This code may only be used under the BSD style license found at
http://polymer.github.io/LICENSE.txt
Code distributed by Google as part of this project is also
subject to an additional IP rights grant found at
http://polymer.github.io/PATENTS.txt
*/

import './se-arc-view.js';
import './se-explorer.js';
import './se-legend.js';
import './se-recipe-view.js';
import './se-stats.js';
import './se-compare-populations.js';
import {MessengerMixin} from '../arcs-shared.js';
import '../../deps/@vaadin/vaadin-split-layout/vaadin-split-layout.js';
import {PolymerElement} from '../../deps/@polymer/polymer/polymer-element.js';
import {html} from '../../deps/@polymer/polymer/lib/utils/html-tag.js';

class StrategyExplorer extends MessengerMixin(PolymerElement) {
  static get template() {
    return html`
    <style include="shared-styles">
      .se-explorer-container {
        overflow: scroll;
        flex-grow: 1;
      }
      .se-explorer-container[find-backlit] {
        background-color: #ddd;
      }
      aside {
        flex-shrink: 0;
      }
    </style>
    <vaadin-split-layout>
      <div style="flex: .7" class="se-explorer-container" find-backlit\$="[[findBacklit]]">
        <se-explorer results="{{results}}"></se-explorer>
      </div>
      <aside style="flex: .3" class="paddedBlocks">
        <se-compare-populations results="{{results}}" id='compare'></se-compare-populations>
        <se-recipe-view></se-recipe-view>
        <!--<se-arc-view></se-arc-view> this is disconnected today, PRs welcome-->
        <se-stats results="{{results}}"></se-stats>
        <se-legend></se-legend>
      </aside>
    </vaadin-split-layout>`;
  }

  static get is() { return 'strategy-explorer'; }

  static get properties() {
    return {
      results: {
        type: Array,
        value: []
      },
      searchPhrase: {
        type: String,
        observer: '_onSearchPhraseChanged'
      },
      findBacklit: Boolean
    };
  }

  constructor() {
    super();
    this.reset();    
  }

  reset() {
    this.set('results', []);
    this.idMap = new Map();
    this.pendingActions = new Map();
  }

  ready() {
    super.ready();
    document.strategyExplorer = this;
  }

  displayResults({results, options}, force = false) {
    if (JSON.stringify(this.results) === JSON.stringify(results) && !force) return;
    this.reset();
    this.set('results', results);
    if (options) this.$.compare.processOptions(options);
  }

  onMessageBundle(messages) {
    for (const msg of messages) {
      switch (msg.messageType) {
        case 'generations':
          this.displayResults(msg.messageBody);
          break;
        case 'arc-selected':
        case 'page-refresh':
          this.reset();
          this.$.compare.reset();
          break;
      }
    }
  }

  _onSearchPhraseChanged(phrase) {
    this.findBacklit = !!phrase;
    for (const seRecipe of this.idMap.values()) {
      seRecipe.setFindPhrase(phrase);
    }
  }
}

window.customElements.define(StrategyExplorer.is, StrategyExplorer);
