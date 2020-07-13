/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {StorageKey} from './storage-key.js';

export class ReferenceModeStorageKey extends StorageKey {
  public static readonly protocol = 'reference-mode';
  constructor(public backingKey: StorageKey, public storageKey: StorageKey) {
    super(ReferenceModeStorageKey.protocol);
  }

  toString(): string {
    return `${this.protocol}://{${this.backingKey.embedKey()}}{${this.storageKey.embedKey()}}`;
  }

  childWithComponent(component: string): StorageKey {
    return new ReferenceModeStorageKey(this.backingKey, this.storageKey.childWithComponent(component));
  }

  static fromString(key: string, parse: (key: string) => StorageKey): ReferenceModeStorageKey {
    const match = key.match(/^reference-mode:\/\/{((?:\}\}|[^}])+)}{((?:\}\}|[^}])+)}$/);

    if (!match) {
      throw new Error(`Not a valid ReferenceModeStorageKey: ${key}.`);
    }
    const [_, backingKey, storageKey] = match;

    return new ReferenceModeStorageKey(
      parse(StorageKey.unembedKey(backingKey)),
      parse(StorageKey.unembedKey(storageKey))
    );
  }
}
