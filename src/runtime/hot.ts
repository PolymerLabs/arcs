/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

/**
 * Higher Order Types
 */

// Higher Order Function Types

/** A function type that returns a value of type `T` */
export type Producer<T> = () => T;

/** A function that takes a value of type `T` as input. */
export type Consumer<T> = (input: T) => void;

/** A function that takes a value of type `T` as input and can be awaited for completion. */
export type AsyncConsumer<T> = (input: T) => Promise<void>;

/** A function that just runs; it takes no values and returns nothing. */
export type Runnable = () => void;

/** A function that converts some input into a boolean, often use for calls like `filter`. */
export type Predicate<T> = (input: T) => boolean;

export class Predicates {
  /** A Predicate that always succeeds */
  static readonly alwaysTrue = <T>() => true;
  /** A Predicate that always fails */
  static readonly alwaysFalse = <T>() => false;
  // TODO(lindner) and(..) negate(..) or(..) etc..
}

/** A function that maps an input to an output. */
export type Mapper<I, O> = (input: I) => O;

// Higher Order Data Types

/**
 * The base type for Literals, i.e. objects that have been serialized into JSON.
 *
 * ## Note
 * `JSON.parse(...)` returns an `any` type. Our definition for literal types is stricter: we demand that values are at
 * least objects (they cannot be `null`, `undefined`, or primitive types).
 */
export interface Literal {
}

/** A light-weight, parameterized key-value store Type */
export interface Dictionary<T> {
  [key: string]: T;
}

