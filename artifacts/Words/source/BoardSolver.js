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

// A simple container for word text and its associated board tiles.
class WordEntry {
  constructor(text, tiles) {
    this.text = text;
    this.tiles = tiles;
  }
  get lastTile() {
    return this.tiles.length == 0 ? null : this.tiles[this.tiles.length - 1];
  }
  toString() {
    return `text=${this.text}, tiles=${this.tiles}`;
  }
}

// Allows analyzing a board to obtain all known valid words.
class BoardSolver {
  constructor(dictionary, board) {
    this._dictionary = dictionary;
    this._board = board;
  }
  // Analyzes a board for words present that are considered valid by the given
  // dictionary. Returns an array of WordEntry instances describing the valid
  // words or an empty array if none are present.
  getValidWords() {
    const validWords = [];
    for (let x = 0; x < BOARD_WIDTH; x++) {
      for (let y = 0; y < BOARD_HEIGHT; y++) {
        this._walkTileRecursive(
            x, y, new WordEntry('', []), validWords, new Set());
      }
    }
    return validWords;
  }
  _buildNextWord(word, x, y) {
    const currentTile = this._board.tileAt(x, y);
    const currentWord = word.text + currentTile.letter;
    const newTiles = word.tiles.slice();
    newTiles.push(currentTile);
    return new WordEntry(currentWord, newTiles);
  }
  _walkTileRecursive(x, y, wordBase, validWords, touchedBase) {
    // Not to go out-of-bounds.
    if (x < 0 || y < 0 || x > BOARD_WIDTH - 1 || y > BOARD_HEIGHT - 1)
      return;

    const word = this._buildNextWord(wordBase, x, y);
    const currentTile = word.lastTile;
    // Don't consider a board position more than once for a single starting tile
    // recursion.
    if (touchedBase.has(currentTile.charIndex))
      return;
    const isMinimumWordLength = Scoring.isMinimumWordLength(word.text.length);
    const isInDictionary = this._dictionary.contains(word.text);
    if (isMinimumWordLength && !isInDictionary)
      return;

    const touched = new Set(touchedBase);
    touched.add(currentTile.charIndex);

    // If the word is long enough, add it to the collection.
    if (isMinimumWordLength && isInDictionary)
      validWords.push(word);

    // Recurse through all connected tiles looking for more valid words.

    // Above.
    this._walkTileRecursive(x, y - 1, word, validWords, touched);
    // Below.
    this._walkTileRecursive(x, y + 1, word, validWords, touched);
    // Left.
    this._walkTileRecursive(x - 1, y, word, validWords, touched);
    // Left and offset above.
    if (!currentTile.isShiftedDown)
      this._walkTileRecursive(x - 1, y - 1, word, validWords, touched);
    // Left and offset below.
    if (currentTile.isShiftedDown)
      this._walkTileRecursive(x - 1, y + 1, word, validWords, touched);
    // Right.
    this._walkTileRecursive(x + 1, y, word, validWords, touched);
    // Right and offset below.
    if (currentTile.isShiftedDown)
      this._walkTileRecursive(x + 1, y + 1, word, validWords, touched);
    // Right and offset above.
    if (!currentTile.isShiftedDown)
      this._walkTileRecursive(x + 1, y - 1, word, validWords, touched);
  }
}
