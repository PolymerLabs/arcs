// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

export async function digest(str) {
  let buffer = new TextEncoder('utf-8').encode(str);
  let digest = await crypto.subtle.digest('SHA-1', buffer);
  return Array.from(new Uint8Array(digest)).map(x => ('00' + x.toString(16)).slice(-2)).join('');
}
