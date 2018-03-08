/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
'use strict';

// A simple dictionary class to encapsulate the set of words that are
// considered valid for game purposes.
class Dictionary {
  // Expects words to be provided as a return-delimited string.
  constructor(words) {
    // TODO(wkorman): Use a trie for better memory efficiency and ship a
    // more compact dictionary representation over the wire. Also, strip
    // proper nouns and words with apostrophes.
    this._dict = new Set();
    for (const wordEntry of words.split('\n')) {
      const trimmedWord = wordEntry.trim();
      if (trimmedWord.length > 0)
        this._dict.add(trimmedWord.toUpperCase());
    }
  }
  contains(word) {
    return this._dict.has(word.toUpperCase());
  }
  get size() {
    return this._dict.size;
  }
}
