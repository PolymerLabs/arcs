/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

// You can't export a global symbol, so we need to bind them locally first.
const localTextEncoder = TextEncoder;
const localTextDecoder = TextDecoder;
export {localTextEncoder as TextEncoder, localTextDecoder as TextDecoder};
