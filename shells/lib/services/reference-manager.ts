/**
 * @license
 * Copyright 2020 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

export type Reference = number;

/**
 * Allows developer to reference + use resource without passing them between the `Services` bus.
 * @see src/service.ts
 */
export class ReferenceManager {

  /** Collection of a mixture of types, associated with an identifier (references) */
  // initialized with a sentinel value so we have 1-based indexing
  // tslint:disable-next-line:no-any
  static references: any[] = [null];

  /**
   * Cache the value for later use.
   *
   * @param val A value, object, etc. to be cached for later use.
   * @return Reference a `number` associated with the cached resource.
   */
  static ref(val: unknown): Reference {
    return this.references.push(val) - 1;
  }

  /**
   * Get a stored value, given an identifier to it.
   *
   * @param r An identifier or reference for a value
   * @return the cached value associated with the input reference.
   */
  static deref(r: Reference): unknown {
    return this.references[r];
  }

  /**
   * Delete the cached resource associated with the reference `r`.
   *
   * @param r An identifier or reference to the value to be cleaned up.
   */
  static dispose(r: Reference): void {
    const obj = this.references[r];
    if (obj['dispose']) {
      obj.dispose();
    }
    delete this.references[r];
  }
}
