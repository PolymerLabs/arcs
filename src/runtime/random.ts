/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {MersenneTwister} from '../platform/mersenne-twister-web.js';

abstract class RNG {
  abstract next() : number;
}

/**
 * A basic random number generator using Math.random();
 */
class MathRandomRNG extends RNG {
  next() : number {
    return Math.random();
  }
}

/**
 * Provides a deterministic Random Number Generator for Tests
 */
class SeededRNG extends RNG {
  private generator = new MersenneTwister(7);
  next(): number {
    return this.generator.random();
  }
}

// Singleton Pattern
let random: RNG = new MathRandomRNG();

export class Random {
  static next() : number {
    return random.next();
  }

  // TODO: remove test code and allow for injectable implementations.
  static seedForTests() : void {
    random = new SeededRNG();
  }
}
