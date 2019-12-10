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

class FlagDefaults {
  static useNewStorageStack = false;
}

export class Flags extends FlagDefaults {
  /** Resets flags. To be called in test teardown methods. */
  static reset() {
    Object.assign(Flags, FlagDefaults);
  }

  // tslint:disable-next-line: no-any
  static withNewStorageStack<T, Args extends any[]>(f: (...args: Args) => Promise<T>): (...args: Args) => Promise<T> {
    return Flags.withFlags({useNewStorageStack: true}, f);
  }

  // For testing with a different set of flags to the default.
  // tslint:disable-next-line: no-any
  static withFlags<T, Args extends any[]>(flagsSettings: Partial<typeof FlagDefaults>, f: (...args: Args) => Promise<T>): (...args: Args) => Promise<T> {
    return async (...args) => {
      Object.assign(Flags, flagsSettings);
      let res;
      try {
        res = await f(...args);
      } finally {
        Flags.reset();
      }
      return res;
    };
  }
}

/** Initialize flags to their default value */
Flags.reset();
