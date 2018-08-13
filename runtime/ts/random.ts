/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

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
    private seed: number = 0;
    next(): number {
        this.seed = Math.pow(this.seed + Math.E, Math.PI) % 1;
        return this.seed;
    }
}

export namespace Random {
    // Singleton Pattern
    let random: RNG = new MathRandomRNG();

    export function next() : number {
        return random.next();
    };
    // TODO: remove test code and allow for injectable implementations.
    export function seedForTests() : void {
        random = new SeededRNG();
    }
}
