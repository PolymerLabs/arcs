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

class Suggestion {
  constructor(dom, content, rank, handler) {
    this._dom = dom;
    this._dom.innerHTML = content;
    this.rank = rank;
    this._dom.onclick = function() {
      handler();
    };
  }
}

// TODO(mmandlis): replace the hardcoded value with a device dependant one.
let maxSuggestions = 4;

class SuggestionManager {
  constructor(root) {
    this._root = root;
    this._suggestions = [];
  }
  createSuggestionElement() {
    if (global.document) {
      let dom = document.createElement('suggest');
      this._root.appendChild(dom);
      return dom;
    }
    return {};
  }
  addSuggestion(content, rank, handler) {
    // If reached max allowed number of suggestions.
    if (this._suggestions.length >= maxSuggestions) {
      // Check whether the lowest ranked suggestion is lower than the new one, if so remove.
      if (this._suggestions[0].rank < rank) {
        this._suggestions.shift()._dom = undefined;
      } else {
        // Cannot add a new suggestion.
        // TODO(mmandlis): do we want to support pending suggestions?
        return;
      }
    }
    let newSuggestion = new Suggestion(this.createSuggestionElement(), content, rank, handler);
    this._suggestions.push(newSuggestion);
    this._suggestions.sort(function(s1, s2) {
      return s1.rank - s2.rank;
    });
    return newSuggestion;
  }
}

Object.assign(module.exports, {
  Suggestion,
  SuggestionManager,
});
