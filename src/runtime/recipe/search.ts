/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../../platform/assert-web.js';

export class Search {
  _phrase: string;
  _unresolvedTokens: string[];
  _resolvedTokens: string[];
  constructor(phrase: string, unresolvedTokens: string[] = undefined) {
    assert(phrase);
    this._phrase = phrase;

    const tokens = this.phrase.toLowerCase().split(/[^a-z0-9]/g);
    // If unresolvedTokens not passed, consider all tokens unresolved.
    this._unresolvedTokens = [];
    (unresolvedTokens || tokens).forEach(token => this._unresolvedTokens.push(token));

    // compute the resolved tokens
    this._resolvedTokens = tokens.slice();
    for (const token of this.unresolvedTokens) {
      const index = this._resolvedTokens.indexOf(token);
      if (index >= 0) {
        this._resolvedTokens.splice(index, 1);
      }
    }
    assert(tokens.length === this.unresolvedTokens.length + this.resolvedTokens.length);
  }

  _append(phrase: string, unresolvedTokens, resolvedTokens) {
    // concat phrase
    if (this._phrase.length > 0) {
      this._phrase = this.phrase.concat(' ');
    }
    this._phrase = this._phrase.concat(phrase);
    resolvedTokens.forEach(t => this._resolvedTokens.push(t));
    unresolvedTokens.forEach(t => this._unresolvedTokens.push(t));
  }

  get phrase(): string { return this._phrase; }
  get unresolvedTokens() { return this._unresolvedTokens; }
  get resolvedTokens() { return this._resolvedTokens; }

  resolveToken(token) {
    const index = this.unresolvedTokens.indexOf(token.toLowerCase());
    assert(index >= 0, `Cannot resolved nonexistent token ${token}`);
    this._unresolvedTokens.splice(index, 1);
    this._resolvedTokens.push(token.toLowerCase());
  }

  isValid(): boolean {
    return this._unresolvedTokens.length > 0 || this._resolvedTokens.length > 0;
  }

  isResolved(): boolean {
    assert(Object.isFrozen(this));
    // Recipe is considered resolved, if at least one of the search tokens was resolved.
    // TODO: Unresolved tokens don't prevent the recipe from being resolved. For now...
    return this._resolvedTokens.length > 0;
  }

  _normalize(): void {
    this._unresolvedTokens.sort();
    this._resolvedTokens.sort();

    Object.freeze(this);
  }

  _copyInto(recipe) {
    if (recipe.search) {
      recipe.search._append(this.phrase, this.unresolvedTokens, this.resolvedTokens);
    } else {
      recipe.search = new Search(this.phrase, this.unresolvedTokens);
      assert(recipe.search.resolvedTokens.length === this.resolvedTokens.length,
             `${recipe.search.resolvedTokens} is not same as ${this.resolvedTokens}`);
    }
    assert(this.resolvedTokens.every(rt => recipe.search.resolvedTokens.indexOf(rt) >= 0) &&
           this.unresolvedTokens.every(rt => recipe.search.unresolvedTokens.indexOf(rt) >= 0));
    return recipe.search;
  }

  toString(options): string {
    const result: string[] = [];
    result.push(`search \`${this.phrase}\``);

    const tokenStr: string[] = [];
    tokenStr.push('  tokens');
    if (this.unresolvedTokens.length > 0) {
      tokenStr.push(this.unresolvedTokens.map(t => `\`${t}\``).join(' '));
    }
    if (this.resolvedTokens.length > 0) {
      tokenStr.push(`// ${this.resolvedTokens.map(t => `\`${t}\``).join(' ')}`);
    }
    if (options && options.showUnresolved) {
      if (this.unresolvedTokens.length > 0) {
        tokenStr.push('// unresolved search tokens');
      }
    }
    result.push(tokenStr.join(' '));

    return result.join('\n');
  }
}
