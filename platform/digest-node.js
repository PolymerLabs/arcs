// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import crypto from 'crypto';

export async function digest(str) {
  const sha = crypto.createHash('sha1');
  sha.update(str);
  return Promise.resolve().then(() => sha.digest('hex'));
}
