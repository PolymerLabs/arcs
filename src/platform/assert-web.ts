/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

// tslint:disable-next-line: no-any
export function assert(test: any, message?: string) {
  if (!test) {
    if (typeof window !== 'object') {
      // tslint:disable-next-line: no-debugger
      debugger; // eslint-disable-line no-debugger
    }
    throw new Error(message);
  }
}
