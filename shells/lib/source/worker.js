/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {ParticleExecutionContext} from '../../../build/runtime/particle-execution-context.js';
import {PlatformLoader} from '../../../build/platform/loader-web.js';
import {Id, IdGenerator} from '../../../build/runtime/id.js';

self.onmessage = function(e) {
  self.onmessage = null;
  const {id, base, logLevel} = e.data;
  // TODO(sjmiles): happens too late for modules that immediately construct loggers, but
  // soon enough for `log` injected into Particle.
  global.logLevel = logLevel;
  new ParticleExecutionContext(e.ports[0], Id.fromString(id), IdGenerator.newSession(), new PlatformLoader(base));
};
