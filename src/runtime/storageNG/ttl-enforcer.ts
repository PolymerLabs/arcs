
/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Ttl} from '../recipe/ttl.js';
import {CRDTTypeRecord, CRDTData} from '../crdt/crdt.js';
import {CollectionData, Referenceable} from '../crdt/crdt-collection.js';

export class TtlEnforcer<T extends CRDTTypeRecord> {
  constructor(public readonly ttl: Ttl) {}

  // TODO: specify `data` class.
  // In reality is either CollectionData or SingletonData, which are, in fact, identical.
  // But none of them have `value` inside `values`.
  // CollectionData<T extends Referenceable>: doesn't have expirationTimestamp.
  // enforceTtl<V extends Referenceable>(data: CRDTData): void {
  // enforceTtl<V extends Referenceable>(data: CollectionData<V>): void {
  enforceTtl(data): void {
    for (const id of Object.keys(data.values)) {
      const v = data.values[id];
      if (v['value'] && !v['value'].expirationTimestamp) {
        const expiration = this.ttl.calculateExpiration();
        data.values[id] = Object.freeze({...v,
          value: {...v['value'], expirationTimestamp: expiration.getTime()}
        });
      }
    }
  }
}
