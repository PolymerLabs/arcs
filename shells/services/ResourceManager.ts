/**
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */


'use strict';

import {logFactory} from '../../build/platform/log-web.js';

const log = logFactory('resource-mgr');

export type Reference = number;

// TODO(sjmiles): demonstrate simple concept for tracking objects across the PEC

/**
 * Allows developer to reference + use resource without passing them between the `Services` bus.
 * @see src/service.ts
 */
export class ResourceManager {

  static references: Reference[] = [];

  /**
   *  Cache the value for later use (try for no duplicates).
   *  @return Reference a `number` associated with the cached resource.
   */
  static ref(val): Reference {
    if (!(val in this.references)) {
      return this.references.push(val) - 1;
    }
    return this.references.indexOf(val);
  }

  /** @return the cached value associated with the input reference. */
  static deref(r: Reference): unknown {
    return this.references[r];
  }

  /** Delete the cached resource associated with the reference `r`. */
  static dispose(r: Reference): void {
    delete this.references[r];
  }

}
