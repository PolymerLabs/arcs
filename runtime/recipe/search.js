// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import assert from 'assert';
import util from './util.js';

class Search {
  constructor(phrase, unresolvedTokens) {
    assert(phrase);

    this._phrase = "";
    this._unresolvedTokens = [];
    this._resolvedTokens = [];

    this.appendPhrase(phrase, unresolvedTokens);
  }
  appendPhrase(phrase, unresolvedTokens) {
    // concat phrase
    if (this._phrase.length > 0) {
      this._phrase = this.phrase.concat(" ");
    }
    this._phrase = this._phrase.concat(phrase);

    // update tokens
    let newTokens = phrase.toLowerCase().split(/[^a-z0-9]/g);
    newTokens.forEach(t => {
      if (!unresolvedTokens || unresolvedTokens.indexOf(t) >= 0) {
        this._unresolvedTokens.push(t)
      } else {
        this._resolvedTokens.push(t);
      }
    });
  }
  get phrase() { return this._phrase; }
  get unresolvedTokens() { return this._unresolvedTokens; }
  get resolvedTokens() { return this._resolvedTokens; }
  resolveToken(token) {
    let index = this.unresolvedTokens.indexOf(token.toLowerCase());
    assert(index >= 0, `Cannot resolved nonexistent token ${token}`);
    this._unresolvedTokens.splice(index, 1);
    this._resolvedTokens.push(token.toLowerCase());
  }

  isValid() {
    return this._unresolvedTokens.length > 0 || this._resolvedTokens.length > 0;
  }

  isResolved() {
    assert(Object.isFrozen(this));
    // Recipe is considered resolved, if at least one of the search tokens was resolved.
    // TODO: Unresolved tokens don't prevent the recipe from being resolved. For now...
    return this._resolvedTokens.length > 0;
  }

  _normalize() {
    this._unresolvedTokens.sort();
    this._resolvedTokens.sort();

    Object.freeze(this);
  }

  _copyInto(recipe) {
    if (recipe.search) {
      recipe.search.appendPhrase(this.phrase, this.unresolvedTokens);
    } else {
      recipe.search = new Search(this.phrase, this.unresolvedTokens);
      assert(recipe.search.resolvedTokens.length == this.resolvedTokens.length);
    }
    assert(this.resolvedTokens.every(rt => recipe.search.resolvedTokens.indexOf(rt) >= 0) &&
           this.unresolvedTokens.every(rt => recipe.search.unresolvedTokens.indexOf(rt) >= 0));
    return recipe.search;
  }

  toString(options) {
    let result = [];
    result.push(`search \`${this.phrase}\``);

    let tokenStr = [];
    tokenStr.push('  tokens');
    if (this.unresolvedTokens.length > 0) {
      tokenStr.push(this.unresolvedTokens.map(t => `\`${t}\``).join(" "));
    }
    if (this.resolvedTokens.length > 0) {
      tokenStr.push(`# ${this.resolvedTokens.map(t => `\`${t}\``).join(" ")}`);
    }
    if (options && options.showUnresolved) {
      if (this.unresolvedTokens.length > 0) {
        tokenStr.push('# unresolved search tokens');
      }
    }
    result.push(tokenStr.join(" "));

    return result.join("\n");
  }
}

export default Search;
