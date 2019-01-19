// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import {ParticleExecutionContext} from '../../../build/runtime/particle-execution-context.js';
import {PlatformLoader} from '../../../build/platform/loader-web.js';

self.onmessage = function(e) {
  self.onmessage = null;
  const {id, base} = e.data;
  new ParticleExecutionContext(e.ports[0], id, new PlatformLoader(base));
};
