/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Id} from './id.js';
import {Type} from './type.js';
import {ModelValue} from './storage/crdt-collection-model.js';

// Equivalent to an Entity with Schema { serialization Text }
export class ArcInfo {
  readonly id: string;
  readonly serialization: string;

  constructor(arcId: Id, serialization: string) {
    this.id = arcId.toString();
    // TODO: remove the import-removal hack when import statements no longer appear
    // in serialized manifests, or deal with them correctly if they end up staying
    this.serialization = serialization.replace(/\bimport .*\n/g, '');
  }

  // Retrieves the serialized string from a stored instance of ArcInfo.
  static extractSerialization(data): string {
    return data.serialization.replace(/\bimport .*\n/g, '');
  }
}

export class ArcHandle implements ModelValue {
  public readonly id: string;
  public readonly storageKey: string;
  public readonly type: Type;
  public readonly tags: string[];

  constructor(id: string, storageKey: string, type: Type, tags: string[]) {
    this.id = id;
    this.storageKey = storageKey;
    this.type = type;
    this.tags = tags;
  }
}
