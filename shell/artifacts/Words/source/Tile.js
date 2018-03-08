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

// A specific tile on the board with an index, position and character.
class Tile {
  constructor(charIndex, letter, style = Tile.Style.NORMAL) {
    this._charIndex = charIndex;
    this._letter = letter;
    this._style = style;
    this._x = TileBoard.indexToX(charIndex);
    this._y = TileBoard.indexToY(charIndex);
  }
  get charIndex() {
    return this._charIndex;
  }
  get letter() {
    return this._letter;
  }
  get x() {
    return this._x;
  }
  get y() {
    return this._y;
  }
  get isShiftedDown() {
    return this._x % 2 == 0;
  }
  get style() {
    return this._style;
  }
  get styleAsNumber() {
    return Tile.StyleToNumber[this.style];
  }
  toString() {
    return `[charIndex=${this.charIndex}, letter=${this.letter}, style=${
        this.style.toString()}, x=${this.x}, y=${this.y}]`;
  }
  static numberToStyle(value) {
    if (value > Tile.NumberToStyle.length)
      throw new Error('Unknown tile style.');
    return Tile.NumberToStyle[value];
  }
}

Tile.Style = Object.freeze({NORMAL: Symbol('normal'), FIRE: Symbol('fire')});
Tile.NumberToStyle = [Tile.Style.NORMAL, Tile.Style.FIRE];
Tile.StyleToNumber = {};
Tile.NumberToStyle.map((style, i) => Tile.StyleToNumber[style] = i);
