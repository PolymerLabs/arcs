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
import './se-find.js';
import '../arcs-shared.js';
import '../../deps/@vaadin/vaadin-split-layout/vaadin-split-layout.js';
import {Polymer} from '../../deps/@polymer/polymer/lib/legacy/polymer-fn.js';
import {html} from '../../deps/@polymer/polymer/lib/utils/html-tag.js';

Polymer({
  _template: html`
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
      <aside style="flex: .3">
        <se-find id="find" on-find-phrase="onFindPhrase"></se-find>
        <se-compare-populations results="{{results}}"></se-compare-populations>
        <se-recipe-view></se-recipe-view>
        <!--<se-arc-view></se-arc-view> this is disconnected today, PRs welcome-->
        <se-stats results="{{results}}"></se-stats>
        <se-legend></se-legend>
      </aside>
    </vaadin-split-layout>
`,

  is: 'strategy-explorer',

  properties: {
    results: Array,
    findBacklit: Boolean
  },

  reset: function() {
    this.set('results', []);
    this.idMap = new Map();
    this.pendingActions = new Map();
  },

  attached: function() {
    document.strategyExplorer = this;
    this.reset();
    this.timeoutId = null;
  },

  displayResults: function(results) {
    if (JSON.stringify(this.results) === JSON.stringify(results)) return;
    this.reset();
    if (this.timeoutId) {
      // Clear previous timeout if it hasn't fired yet. Prevents
      // race conditions between multiple reset() and setting results.
      clearTimeout(this.timeoutId);
    }

    this.timeoutId = setTimeout(() => this.set('results', results), 0);
  },

  onMessageBundle: function(messages) {
    for (let msg of messages) {
      switch (msg.messageType) {
        case 'generations':
          this.displayResults(msg.messageBody);
          break;
        case 'page-refresh':
          this.reset();
          break;
      }
    }
  },

  onFindPhrase(e) {
    const phrase = e.detail;
    this.findBacklit = !!phrase;
    for (let seRecipe of this.idMap.values()) {
      seRecipe.setFindPhrase(phrase);
    }
  }
});
