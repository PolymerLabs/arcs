/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

/** Arcs runtime flags. */
export class Flags {
  static useNewStorageStack: boolean;

  /** Resets flags. To be called in test teardown methods. */
  static reset() {
    Flags.useNewStorageStack = false;
  }
}

/** Initialize flags to their default value */
Flags.reset();
