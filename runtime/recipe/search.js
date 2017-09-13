// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

var assert = require('assert');
var util = require('./util.js');

// ??? rename to SearchConstraint?
class Search {
  constructor(phrase, unresolvedTokens) {
    assert(phrase);

    this._phrase = phrase;
    // ??? should these be sets instead? do repeated tokens matter?
    this._unresolvedTokens = [];
    this._resolvedTokens = [];

    let allTokens = this._phrase.toLowerCase().split(/[^a-z0-9]/g);
    unresolvedTokens = unresolvedTokens || allTokens;
    allTokens.forEach(t => {
      if (unresolvedTokens.indexOf(t) >= 0) {
        this._unresolvedTokens.push(t)
      } else {
        this._resolvedTokens.push(t);
      }
    })
  }
  get phrase() { return this._phrase; }
  get unresolvedTokens() { return this._unresolvedTokens; }
  get resolvedTokens() { return this._resolvedTokens; }
  resolveToken(token) {
    let index = this.unresolvedTokens.indexOf(token);
    assert(index >= 0, `Cannot resolved nonexistent token ${token}`);
    this._unresolvedTokens.splice(index, 1);
    this._resolvedTokens.push(token);
  }

  isValid() {
    return this._unresolvedTokens.length > 0 || this._resolvedTokens.length > 0;
  }

  isResolved() {
    assert(Object.isFrozen(this));

    return this._unresolvedTokens.length == 0;
  }

  _normalize() {
    this._unresolvedTokens.sort();
    this._resolvedTokens.sort();

    Object.freeze(this);
  }

  _copyInto(recipe) {
    recipe.search = new Search(this.phrase, this.unresolvedTokens);
    assert(recipe.resolveTokens.length == this.resolveTokens.length &&
           recipe.resolveTokens.every(rt => this.resolveTokens.indexOf(rt) >= 0));
    return recipe.search;
  }

  toString(options) {
    let result = [];
    result.push(`search \`${this.phrase}\``);

    let tokenStr = [];
    tokenStr.push('tokens');
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

module.exports = Search;
