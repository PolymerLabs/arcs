/*
Copyright (c) 2018 Google Inc. All rights reserved.
This code may only be used under the BSD style license found at
http://polymer.github.io/LICENSE.txt
Code distributed by Google as part of this project is also
subject to an additional IP rights grant found at
http://polymer.github.io/PATENTS.txt
*/

import '../../deps/@polymer/polymer/polymer-legacy.js';
import '../../deps/@polymer/iron-icons/iron-icons.js';
import '../../deps/@polymer/iron-icons/av-icons.js';
import '../../deps/@polymer/iron-icons/image-icons.js';
import {formatTime} from '../arcs-shared.js';
import {summaryStats} from './se-shared.js';
import {html} from '../../deps/@polymer/polymer/lib/utils/html-tag.js';
import {PolymerElement} from '../../deps/@polymer/polymer/polymer-element.js';

class SeComparePopulations extends PolymerElement {
  static get template() {
    return html`
    <style include="shared-styles se-shared-styles">
      :host {
        display: block;
        background: white;
        border: 1px solid var(--mid-gray);
      }
      .entry {
        padding: 0 5px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        cursor: pointer;
        line-height: 20px;
      }
      .entry[selected] {
        color: #fff;
        background-color: var(--highlight-blue);
      }
      .entry iron-icon {
        height: 16px;
        margin-top: -5px;
        margin-left: 3px;
      }
      div.entry:first-of-type {
        border-top: 1px solid var(--mid-gray);
      }
    </style>
    <div on-click="_onSelected">
      <header id="current" current="" class="entry" selected\$="[[current.selected]]">
        Most Recent: ⊕[[current.surviving]], ✓[[current.resolved]]
        <template is="dom-if" if="[[!current.added]]">
          <iron-icon id="addCurrent" title="Add to Library" icon="av:playlist-add" on-click="_addCurrent"></iron-icon>
        </template>
      </header>
      <template is="dom-repeat" items="{{library}}">
        <div id="[[item.id]]" class="entry" selected\$="[[item.selected]]">
          [[item.label]] : ⊕[[item.surviving]], ✓[[item.resolved]]
          <iron-icon hidden\$="[[item.selected]]" id="compare" title="Compare" icon="image:exposure"></iron-icon></div>
      </template>
    </div>
`;
  }

  static get is() { return 'se-compare-populations'; }

  static get properties() {
    return {
      results: {
        type: Array,
        notify: true
      }
    };
  }

  static get observers() {
    return [
      '_onResultsUpdated(results.*)'
    ];
  }

  constructor() {
    super();
    this.library = [];
    this.current = {};
  }

  processOptions(options) {
    if (options.keep) {
      this._addCurrent(options);
    }
  }

  _onResultsUpdated() {
    if (this.results.length === 0 || this.results.overlapBase
        || [...this.library, this.current].some(p => p.results === this.results)) {
      this._updateSelection();
      return;
    }

    const stats = summaryStats(this.results);
    this.current = {
      id: 'current',
      surviving: stats.survivingDerivations,
      resolved: stats.resolvedDerivations,
      selected: true,
      results: this.results
    };

    this._updateSelection();
  }

  _addCurrent({label} = {}) {
    if (label) {
      const existingIdx = this.library.findIndex(e => e.label === label);
      if (existingIdx >= 0) this.splice('library', existingIdx, 1);
    }
    const now = Date.now();
    const entry = Object.assign({}, this.current, {
      id: String(now),
      label: label || `@${formatTime(now)}`
    });
    this.push('library', entry);
    this.set('current.added', true);
  }

  _onSelected(e) {
    if (!e.srcElement.id || e.srcElement.id === 'addCurrent') return;

    if (e.srcElement.id === 'compare') {
      const overlapOther = this.library.find(p => p.id === e.path[1].id).results;
      if (this.results.overlapOther === overlapOther) {
        // Clicking on diff again deselects it.
        this._displayResults(this.results.overlapBase);
        return;
      }
      this._overlap(this.results.overlapBase || this.results, overlapOther);
      return;
    }

    const selected = [this.current, ...this.library].find(p => p.id === e.srcElement.id);
    this._displayResults(selected.results);
    this._updateSelection();
  }

  _updateSelection() {
    const needsNotify = entry => {
      const shouldBeSelected = (this.results === entry.results || this.results.overlapBase === entry.results);
      if (entry.selected !== shouldBeSelected) {
        entry.selected = shouldBeSelected;
        return true;
      }
      return false;
    };

    if (needsNotify(this.current)) this.notifyPath('current.selected');
    for (let i = 0; i < this.library.length; i++) {
      if (needsNotify(this.library[i])) this.notifyPath(`library.${i}.selected`);
    }
  }

  _displayResults(results) {
    document.strategyExplorer.displayResults({results}, true);
  }

  _overlap(base, other) {
    const copy = JSON.parse(JSON.stringify(base));
    copy.overlapBase = base;
    copy.overlapOther = other;
    base = copy;
    other = JSON.parse(JSON.stringify(other));
    for (let i = 0; i < Math.max(base.length, other.length); i++) {
      if (base[i] && !other[i]) {
        this._markPopulation(base[i], 'add');
      } else if (!base[i] && other[i]) {
        base[i] = this._markPopulation(other[i], 'add');
      } else {
        this._overlapGeneration(base[i].population, other[i].population);
      }
    }
    this._displayResults(base);
  }

  _overlapGeneration(base, other) {
    for (const b of base) {
      const o = other.find(t => t.strategy === b.strategy);
      if (o) {
        this._overlapStrategy(b.recipes, o.recipes);
      } else {
        this._markGeneration(b, 'add');
      }
    }
    for (const o of other.filter(o => !base.find(b => b.strategy === o.strategy))) {
      base.push(this._markGeneration(o, 'remove'));
    }
  }

  _overlapStrategy(base, other) {
    for (const b of base) {
      if (!other.find(o => o.hash === b.hash)) {
        b._diff = 'add';
      }
    }
    for (const o of other.filter(o => !base.find(b => b.hash === o.hash))) {
      o._diff = 'remove';
      base.push(o);
    }
  }

  _markPopulation(p, diff) {
    p.population.forEach(g => this._markGeneration(g, diff));
    return p;
  }

  _markGeneration(g, diff) {
    g._diff = diff;
    g.recipes.forEach(r => r._diff = diff);
    return g;
  }
}

window.customElements.define(SeComparePopulations.is, SeComparePopulations);
