// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

'use strict';

import InnerPec from '../inner-PEC.js';
import Loader from '../browser-loader.js';

self.onmessage = function(e) {
  self.onmessage = null;
  let {id, base} = e.data;
  console.log('starting worker', id, base);
  new InnerPec(e.ports[0], id, new Loader(base));
};

export default null;
