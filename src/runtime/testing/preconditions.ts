/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

/**
 * @fileoverview
 * Preconditions
 *
 * Convenience functions that check whether values are as expected and
 * also help make Typescript code less nullable/undefined.
 */

/**
 * Returns a given value if it is not undefined and not null.
 *
 * @param value Value to check.
 * @param message Used for the thrown error.
 * @throws when value is undefined or null.
 */
export function checkDefined<T>(value: T|null|undefined, customMessage?: string): T {
  if (value === undefined || value === null) {
    throw new Error(customMessage || 'undefined or null');
  }
  return value;
}

/**
 * Returns the given value if it is not null.
 *
 * @param value Value to check.
 * @param message Used for the thrown error.
 * @throws when value is undefined or null.
 */
export function checkNotNull<T>(value: T|null, customMessage?: string): T {
  if (value === null) {
    throw new Error(customMessage || 'null');
  }
  return value;
}
