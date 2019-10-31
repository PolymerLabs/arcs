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
import {Id, IdGenerator} from '../../../build/runtime/id.js';
import {Loader} from '../../../build/platform/loader.js';

self.onmessage = function(e) {
  // immediately close message channel, this is one-time use
  self.onmessage = null;
  // snarf out scope data
  const {id, base, logLevel} = e.data;
  // TODO(sjmiles): happens too late for modules that immediately construct loggers, but
  // soon enough for `log` injected into Particle.
  global.logLevel = logLevel;
  // construct execution context with scope data
  new ParticleExecutionContext(e.ports[0], Id.fromString(id), IdGenerator.newSession(), new Loader(base));
};
