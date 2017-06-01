/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
"use strict";

const assert = require('assert');

class SuggestionDom {
  constructor(root, name, handler) {
    this.name = name;
    this._dom = {};
    if (global.document) {
      this._dom = root.appendChild(document.createElement('suggest'));
      this._dom.appendChild(document.createTextNode(this.name));
      this._dom.addEventListener("click", function() {
        // TODO(mmandlis): this is a temporary workaround for removing the accepted suggestion.
        // Instead we should trigger suggestinator to produce new suggestions.
        this.destroy();
        handler();
      }.bind(this));
    }
  }
  destroy() {
    if (this._dom.parentNode) this._dom.parentNode.removeChild(this._dom);
    this._dom = undefined;
  }
}

// TODO(mmandlis): replace the hardcoded value with a device dependant one.
let maxSuggestions = 4;

class SuggestionComposer {
  constructor(root, slotManager) {
    this._root = root;
    this._slotManager = slotManager;
    this._suggestions = [];
  }
  // Sorts recipes by rank and adds the top suggestions up the the allowed max.
  // New suggestions replace all preexisting suggestions.
  setSuggestions(recipes, arc) {
    this._removeAll();
    recipes.sort(function(r1, r2) {
      return r2.rank - r1.rank;
    });
    recipes.splice(maxSuggestions);
    recipes.forEach(r => { this._addSuggestion(r, arc); });
  }
  _removeAll() {
    this._suggestions.forEach(s => s.destroy());
    this._suggestions = [];
  }
  _addSuggestion(recipe, arc) {
    let slotids = [];  // list of slots required for the given recipe to render.
    recipe.components.forEach(p => {
      arc.particleSpec(p.particleName).renders.forEach(r => {if (r.name) slotids.push(r.name.name)})
    });

    this._suggestions.push(new SuggestionDom(this._root, recipe.description, function() {
      // Free all slots required for the accepted suggestion.
      slotids.forEach(id => { if (this._slotManager.hasSlot(id)) this._slotManager.freeSlot(id) });
      recipe.instantiate(arc);
    }.bind(this)));
  }
}

module.exports = SuggestionComposer;
