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

/** A function that just runs; it takes no values and returns nothing. */
export type Runnable = () => void;

/** A function that maps an input to an output. */
export type Mapper<I, O> = (input: I) => O;

// Higher Order Data Types

