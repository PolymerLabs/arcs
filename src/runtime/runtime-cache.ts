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
