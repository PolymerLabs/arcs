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
export type Producer<T> = () => T;

export type Consumer<T> = (input: T) => void;

export type Runnable = () => void;

export type Predicate<T> = (input: T) => boolean;



// Higher Order Data Types

export type Literal = object;
