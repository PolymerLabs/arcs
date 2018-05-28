/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

let random = Math.random;

const seededRandom = () => {
  return seededRandom.x = Math.pow(seededRandom.x + Math.E, Math.PI) % 1;
};

export class Random {
  static next() {
    return random();
  }

  static seedForTests() {
    seededRandom.x = 0; // Re-seed on each call for test isolation.
    random = seededRandom;
  }
}
