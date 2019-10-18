/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

export class BiMap<L, R> {
  private left2right = new Map<L, R>();
  private right2left = new Map<R, L>();

  constructor(iterable?) {
    if (iterable) {
      for (const [left, right] of iterable) {
        this.set(left, right);
      }
    }
  }

  get size() { return this.left2right.size; }

  set(left: L, right: R): BiMap<L, R> {
    if (this.hasL(left)) {
      this.right2left.delete(this.getL(left));
    }
    if (this.hasR(right)) {
      this.left2right.delete(this.getR(right));
    }
    this.left2right.set(left, right);
    this.right2left.set(right, left);
    return this;
  }

  hasL(left: L): boolean {
    return this.left2right.has(left);
  }

  hasR(right: R): boolean {
    return this.right2left.has(right);
  }

  getL(left: L): R {
    return this.left2right.get(left);
  }

  getR(right: R): L {
    return this.right2left.get(right);
  }

  deleteL(left: L): boolean {
    this.right2left.delete(this.getL(left));
    return this.left2right.delete(left);
  }

  deleteR(right: R): boolean {
    this.left2right.delete(this.getR(right));
    return this.right2left.delete(right);
  }

  clear(): void {
    this.left2right.clear();
    this.right2left.clear();
  }

  entries(): IterableIterator<[L, R]> {
    return this.left2right.entries();
  }

  lefts(): IterableIterator<L> {
    return this.left2right.keys();
  }

  rights(): IterableIterator<R> {
    return this.right2left.keys();
  }

  forEach(callback: (left: L, right: R, map: BiMap<L, R>) => void): void {
    this.left2right.forEach((value, key) => callback(key, value, this));
  }
}
