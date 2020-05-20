/**
 * @license
 * Copyright (c) 2020 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {AnnotationRef} from './recipe/annotation.js';
import {Dictionary} from './hot.js';

export enum Capability {
  Persistent = 'persistent',
  Queryable = 'queryable',
  TiedToRuntime = 'tiedToRuntime',
  TiedToArc = 'tiedToArc',
}

export class Capabilities {
  private readonly capabilities: Set<Capability>;

  constructor(capabilities: Capability[]) {
    this.capabilities = new Set(capabilities);
  }

  static fromAnnotations(annotations: AnnotationRef[]) {
    const capSet = new Set<Capability>();
    for (const ann of annotations) {
      const capability = Object.keys(Capability).find(capability => Capability[capability] === ann.name);
      if (capability) {
        capSet.add(Capability[capability]);
      }
    }
    return new Capabilities([...capSet]);
  }

  merge(other: Capabilities) {
    for (const capability of other.capabilities) {
      this.capabilities.add(capability);
    }
  }

  get isPersistent() { return this.capabilities.has(Capability.Persistent); }
  get isQueryable() { return this.capabilities.has(Capability.Queryable); }
  get isTiedToRuntime() { return this.capabilities.has(Capability.TiedToRuntime); }
  get isTiedToArc() { return this.capabilities.has(Capability.TiedToArc); }

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
    if (other.isEmpty()) {
      return this.isEmpty();
    }
    return [...other.capabilities].every(c => this.capabilities.has(c));
  }

  toString(): string {
    return [...this.capabilities].sort().join(' ');
  }

  static readonly empty = new Capabilities([]);
  static readonly tiedToArc = new Capabilities([Capability.TiedToArc]);
  static readonly tiedToRuntime = new Capabilities([Capability.TiedToRuntime]);
  static readonly persistent = new Capabilities([Capability.Persistent]);
  static readonly queryable = new Capabilities([Capability.Queryable]);
  static readonly tiedToArcQueryable = new Capabilities([Capability.TiedToArc, Capability.Queryable]);
  static readonly tiedToRuntimeQueryable = new Capabilities([Capability.TiedToRuntime, Capability.Queryable]);
  static readonly persistentQueryable = new Capabilities([Capability.Persistent, Capability.Queryable]);
}
