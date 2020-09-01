/**
 * @license
 * Copyright (c) 2020 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

// To break circular import dependencies we need to use dynamic injection
// of static methods into various classes. This file imports the necessary
// internals to do this, and should only be used by platform/loader-base.ts.

import './internal/schema-from-literal.js';
import './internal/type-from-literal.js';
import './internal/interface-info-impl.js';
