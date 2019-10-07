/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
class CacheKey<K, V> {
  identifier: string;

  constructor(id) {
      this.identifier = id;
  }
}

export class RuntimeCacheService {

  private map = new Map<string, unknown>();
  private nextID = 0;

  getOrCreateCache<K, V>(name): Map<K, V> {
    if (!this.map.has(name)) {
      this.map.set(name, new Map<K, V>());
    }
    return this.map.get(name) as Map<K, V>;
  }
}
