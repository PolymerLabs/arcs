/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

interface UniqueStringable {
  /**
   * Returns a unique string representation of this object, with the property
   * that A deep equals B iff A.toUniqueString() == B.toUniqueString().
   */
  toUniqueString(): string;
}

/**
 * A Set implementation that performs deep equality of its elements instead of
 * strict equality. Every element needs to have a unique string representation,
 * which will be used as a simple way to compute deep equality.
 */
export class DeepSet<T extends UniqueStringable> implements Iterable<T> {
  /** All elements stored in the set. */
  private readonly elementSet: Set<T> = new Set();

  /** The unique string representation of every element in the set. */
  private readonly stringSet: Set<string> = new Set();

  constructor(...elements: T[]) {
    elements.forEach(e => this.add(e));
  }

  add(element: T) {
    const repr = element.toUniqueString();
    if (this.stringSet.has(repr)) {
      return;
    }
    this.stringSet.add(repr);
    this.elementSet.add(element);
  }

  addAll(other: DeepSet<T>) {
    other.elementSet.forEach(e => this.add(e));
  }

  map(transform: (value: T) => T): DeepSet<T> {
    const result = new DeepSet<T>();
    for (const elem of this) {
      result.add(transform(elem));
    }
    return result;
  }

  [Symbol.iterator]() {
    return this.elementSet[Symbol.iterator]();
  }

  asSet(): ReadonlySet<T> {
    return this.elementSet;
  }

  toArray(): T[] {
    return [...this.elementSet];
  }

  get size(): number {
    return this.elementSet.size;
  }

  get isEmpty(): boolean {
    return this.size === 0;
  }

  /**
   * Returns true if this DeepSet is equal to the other DeepSet (deep equals,
   * computed via toUniqueString() for each DeepSet).
   */
  equals(other: DeepSet<T>): boolean {
    return this.toUniqueString() === other.toUniqueString();
  }

  /** Unique string representation of this DeepSet. */
  toUniqueString(): string {
    const strings = [...this.stringSet];
    strings.sort();
    return '{' + strings.join(', ') + '}';
  }
}
