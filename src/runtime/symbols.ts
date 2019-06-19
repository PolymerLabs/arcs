/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

// TypeScript seems to lose the necessary type info if this symbol is wrapped in an object and then
// used as an interface key (e.g. 'interface Foo { [Symbols.internals]: {...} }'), so we just have
// to export it as a standard variable. See the EntityInternals class for the usage of this symbol.
export const SYMBOL_INTERNALS = Symbol('internals');
