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
  // Enables the parsing of both pre and post slandles (unified) syntaxes.
  // Preslandles syntax is to be deprecated.
  static parseBothSyntaxes = false;
  // Use pre slandles syntax for parsing and toString by default.
  // If parseBothSyntaxes is off, this will set which syntax is enabled.
  static defaultToPreSlandlesSyntax = true;
}

export class Flags extends FlagDefaults {
  /** Resets flags. To be called in test teardown methods. */
  static reset() {
    Object.assign(Flags, FlagDefaults);
  }

  static withPreSlandlesSyntax<T>(f: () => Promise<T>): () => Promise<T> {
    return Flags.withFlags({parseBothSyntaxes: false, defaultToPreSlandlesSyntax: true}, f);
  }
  static withPostSlandlesSyntax<T>(f: () => Promise<T>): () => Promise<T> {
    return Flags.withFlags({parseBothSyntaxes: false, defaultToPreSlandlesSyntax: false}, f);
  }

  static withNewStorageStack<T>(f: () => Promise<T>): () => Promise<T> {
    return Flags.withFlags({useNewStorageStack: true}, f);
  }

  // For testing with a different set of flags to the default.
  static withFlags<T>(args: Partial<typeof FlagDefaults>, f: () => Promise<T>): () => Promise<T> {
    return async () => {
      Object.assign(Flags, args);
      let res;
      try {
        res = await f();
      } finally {
        Flags.reset();
      }
      return res;
    };
  }
}

/** Initialize flags to their default value */
Flags.reset();
