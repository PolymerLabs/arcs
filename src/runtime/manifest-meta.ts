/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */


export class ManifestMeta {
  storageKey: string|null;
  name: string|null;

  constructor() {
    this.storageKey = null;
    this.name = null;
  }

  apply(items: {key: string, value: string}[]) {
    items.forEach(item => { this[item.key] = item.value; });
  }
}
