/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import { CRDTChange, CRDTConsumerType, CRDTData, CRDTModel, CRDTOperation, CRDTTypeRecord, VersionMap } from '../crdt/crdt';
import { Handle } from './handle';

/**
 * TODO: describe this class. And add some tests.
 */
export class StorageProxy<T extends CRDTTypeRecord> {
  private handles: Handle<T>[] = [];
  private crdt: CRDTModel<T>;

  constructor(crdt: CRDTModel<T>) {
    this.crdt = crdt;
  }

  registerHandle(h: Handle<T>): VersionMap {
    this.handles.push(h);
    return new Map(this.crdt.getData().version);
  }

  applyOp(op: CRDTOperation): boolean {
    return this.crdt.applyOperation(op);
  }

  getParticleView(): T['consumerType'] {
    return this.crdt.getParticleView()!;
  }
}
