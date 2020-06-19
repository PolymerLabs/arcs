/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

export abstract class StorageKey {
  readonly protocol: string;

  constructor(protocol: string) {
    this.protocol = protocol;
  }

  abstract toString(): string;

  // Where there's a distinction, childWithComponent produces
  // a new key inside the serialization root of the parent
  // key, while subKeyWithComponent produces a new serialization
  // root and a new key.
  abstract childWithComponent(component: string): StorageKey;

  subKeyWithComponent(component: string): StorageKey {
    return this.childWithComponent(component);
  }

  childKeyForBackingElement(id: string) {
    return this.childWithComponent(id);
  }

  childKeyForArcInfo() {
    return this.subKeyWithComponent('arc-info');
  }

  childKeyForHandle(id: string) {
    return this.subKeyWithComponent(`handle/${id}`);
  }

  childKeyForSuggestions(id: string) {
    return this.subKeyWithComponent(`suggestion/${id}`);
  }

  childKeyForSearch(id: string) {
    return this.subKeyWithComponent(`search/${id}`);
  }

  embedKey() {
    return this.toString().replace(/\{/g, '{{').replace(/\}/g, '}}');
  }

  static unembedKey(key: string) {
    return key.replace(/\}\}/g, '}').replace(/\{\{/g, '}');
  }
}
