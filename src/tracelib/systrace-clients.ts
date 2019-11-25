/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

interface ClientInterface {
  asyncTraceBegin(tag: string, cookie: number): void;
  asyncTraceEnd(tag: string, cookie: number): void;
}

// TODO: Client: console.log

// TODO: Client: Android Trace.* APIs

// TODO: Client selector
// Using url parameter to choose among clients (default: Android Trace client)
