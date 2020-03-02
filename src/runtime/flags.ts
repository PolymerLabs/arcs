/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

/* Arcs runtime flags.
 * These can be set via command line arguments and are generally for
 * incrementally introducing potentially breaking changes (e.g. adding/removing
 * features).
 *
 * Example:
 * To run all test, but use the new storage stack, use the following command:
 * sigh test --useNewStorageStack=true
 *
 * Note: This does not override flag values set explicitly for a test.
 */
class FlagDefaults {
  static useNewStorageStack = true;
  static enforceRefinements = false;
  static useSlandles = false;
  static fieldRefinementsAllowed = false;
  static defaultReferenceMode = false;
}

export class Flags extends FlagDefaults {
  /** Resets flags. To be called in test teardown methods. */
  static reset() {
    // Use the defaults
    Object.assign(Flags, FlagDefaults);
    // Overwrite the defaults with the testFlags.
    if (typeof global !== 'undefined') {
      Object.assign(Flags, global['testFlags']);
    }
  }

  // tslint:disable-next-line: no-any
  static withNewStorageStack<T, Args extends any[]>(f: (...args: Args) => Promise<T>): (...args: Args) => Promise<T> {
    return Flags.withFlags({useNewStorageStack: true}, f);
  }

  // tslint:disable-next-line: no-any
  static whileEnforcingRefinements<T, Args extends any[]>(f: (...args: Args) => Promise<T>): (...args: Args) => Promise<T> {
    return Flags.withFlags({enforceRefinements: true}, f);
  }

  // tslint:disable-next-line: no-any
  static withFieldRefinementsAllowed<T, Args extends any[]>(f: (...args: Args) => Promise<T>): (...args: Args) => Promise<T> {
    return Flags.withFlags({fieldRefinementsAllowed: true}, f);
  }

  // tslint:disable-next-line: no-any
  static withDefaultReferenceMode<T, Args extends any[]>(f: (...args: Args) => Promise<T>): (...args: Args) => Promise<T> {
    return Flags.withFlags({defaultReferenceMode: true}, f);
  }

  // For testing with a different set of flags to the default.
  // tslint:disable-next-line: no-any
  static withFlags<T, Args extends any[]>(flagsSettings: Partial<typeof FlagDefaults>, f: (...args: Args) => Promise<T>): (...args: Args) => Promise<T> {
    return async (...args) => {
      Object.assign(Flags, flagsSettings);
      let res: T;
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
