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
import {UiParticle} from '../dist/ui-particle.js';
import {UiTransformationParticle} from '../dist/ui-transformation-particle.js';
import {UiMultiplexerParticle} from '../dist/ui-multiplexer-particle.js';

const modifyParticleNamespace = namespace => {
  Object.assign(namespace, {
    // Ui-flavored Particles
    UiParticle,
    UiTransformationParticle,
    UiMultiplexerParticle,
    // Aliases
    SimpleParticle: UiParticle
  });
};

self.onmessage = function(e) {
  // snarf out scope data
  const {id, base, logLevel, traceChannel, inWorkerPool} = e.data;
  // TODO(sjmiles): happens too late for modules that immediately construct loggers, but
  // soon enough for `log` injected into Particle.
  global.logLevel = logLevel;
  if (!inWorkerPool) {
    // immediately close message channel, this is one-time use
    self.onmessage = null;
  }
  // selection on system tracing channel
  global.systemTraceChannel = traceChannel;
  // whether this worker is managed by the worker pool
  global.inWorkerPool = inWorkerPool;
  // create a loader for use inside the PEC
  const loader = new Loader(base);
  // provide app-specific values for use by Particles
  loader.modifyParticleNamespace = modifyParticleNamespace;
  // construct execution context with scope data
  // PEC context will be freshly clean despite a new spun-up worker or a resumed
  // worker as one dedicated worker is associated with one single PEC at a time.
  new ParticleExecutionContext(e.ports[0], Id.fromString(id), IdGenerator.newSession(), loader);
};
