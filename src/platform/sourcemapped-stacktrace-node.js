// Copyright (c) 2018 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

// This is only relevant in the web devtools, but we need to
// ensure that the stack trace is passed through on node
// so that system exceptions are plumbed properly.
export const mapStackTrace = (x, f) => f([x]);
