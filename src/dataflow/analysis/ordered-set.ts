/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

/**
 * An ordered set of elements. Backed by an Array and a Set. Lookups are backed
 * by the Set so they are quick, and order is maintained by the Array. Elements
 * can be added to the OrderedSet multiple times.
 */
export class OrderedSet<T> {
  private readonly set: Set<T>;
  private readonly array: T[];

  constructor() {
    this.set = new Set();
    this.array = [];
  }

  add(element: T) {
    this.set.add(element);
    this.array.push(element);
  }

  addAll(other: OrderedSet<T>) {
    other.set.forEach(e => this.set.add(e));
    this.array.push(...other.array);
  }

  has(element: T): boolean {
    return this.set.has(element);
  }

  copy(): OrderedSet<T> {
    const copy = new OrderedSet<T>();
    copy.addAll(this);
    return copy;
  }

  get length(): number {
    return this.array.length;
  }

  asSet(): ReadonlySet<T> {
    return this.set;
  }

  asArray(): readonly T[] {
    return this.array;
  }
}
