/**
 * @license
 * Copyright (c) 2020 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {RecipeHandleCapability} from './manifest-ast-nodes.js';

export class Capabilities {
  private readonly capabilities: Set<RecipeHandleCapability>;

  constructor(capabilities: RecipeHandleCapability[]) {
    this.capabilities = new Set(capabilities);
  }

  get isPersistent() { return this.capabilities.has('persistent'); }
  get isQueryable() { return this.capabilities.has('queryable'); }
  get isTiedToRuntime() { return this.capabilities.has('tied-to-runtime'); }
  get isTiedToArc() { return this.capabilities.has('tied-to-arc'); }

  clone(): Capabilities { return new Capabilities([...this.capabilities]); }

  isEmpty(): boolean { return this.capabilities.size === 0; }

  isSame(other: Capabilities): boolean {
    if ((this.capabilities.size === other.capabilities.size) &&
        [...this.capabilities].every(c => other.capabilities.has(c))) {
      return true;
    }
    return false;
  }

  contains(other: Capabilities): boolean {
    return [...other.capabilities].every(c => this.capabilities.has(c));
  }

  toString(): string {
    return [...this.capabilities].sort().join(' ');
  }

  static readonly tiedToArc = new Capabilities(['tied-to-arc']);
  static readonly tiedToRuntime = new Capabilities(['tied-to-runtime']);
  static readonly persistent = new Capabilities(['persistent']);
  static readonly queryable = new Capabilities(['queryable']);
  static readonly persistentQueryable = new Capabilities(['persistent', 'queryable']);
}
