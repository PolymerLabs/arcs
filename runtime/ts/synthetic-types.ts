// @license
// Copyright (c) 2018 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import {Type} from './type.js';
import {Id} from './id.js';

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
  static extractSerialization(data) {
    return data.serialization.replace(/\bimport .*\n/g, '');
  }
}

export class ArcHandle {
  public readonly storageKey: string;
  public readonly type: Type;
  public readonly tags: string[];

  constructor(storageKey, type, tags) {
    this.storageKey = storageKey;
    this.type = type;
    this.tags = tags;
  }
}
