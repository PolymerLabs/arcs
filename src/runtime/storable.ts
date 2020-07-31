/**
 * @license
 * Copyright (c) 2020 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../platform/assert-web.js';
import {SYMBOL_INTERNALS} from './symbols.js';
import {SerializedEntity} from './entity.js';

export abstract class Storable {
  // This lets us say some type T, that is at least StorableInternals, but we don't care what else.
  // tslint:disable-next-line: no-any
  [SYMBOL_INTERNALS]: StorableInternals & any;

  static creationTimestamp(entity: Storable): Date | null {
    return getStorableInternals(entity).hasCreationTimestamp()
        ? getStorableInternals(entity).getCreationTimestamp() : null;
  }

  static expirationTimestamp(entity: Storable): Date | null {
    return getStorableInternals(entity).hasExpirationTimestamp()
        ? getStorableInternals(entity).getExpirationTimestamp() : null;
  }
}

export abstract class StorableInternals {
  abstract hasCreationTimestamp(): boolean;
  abstract getCreationTimestamp(): Date;
  abstract hasExpirationTimestamp(): boolean;
  abstract getExpirationTimestamp(): Date;
  abstract serialize(): SerializedEntity;
}

export function getStorableInternals<T extends StorableInternals>(entity: Storable): T {
  const internals = entity[SYMBOL_INTERNALS];
  assert(internals !== undefined, 'SYMBOL_INTERNALS lookup on non-entity');
  return internals;
}
