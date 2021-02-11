/**
 * @license
 * Copyright 2020 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {ParticleExecutionContext} from '../../../../build/runtime/particle-execution-context.js';
import {Id, IdGenerator} from '../../../../build/runtime/id.js';
import {StorageKeyParser} from '../../../../build/runtime/storage/storage-key-parser.js';
import {Loader} from '../../../../build/platform/loader.js';
import '../../arcs-ui/dist/install-ui-classes.js';

self.onmessage = function(e) {
  // snarf out scope data
  const {id, base, logLevel, traceChannel, inWorkerPool} = e.data;
  if (!inWorkerPool) {
    // immediately close message channel, this is one-time use
    self.onmessage = null;
  }
  // TODO(sjmiles): happens too late for modules that immediately construct loggers, but
  // soon enough for `log` injected into Particle.
  global.logLevel = logLevel;
  // selection on system tracing channel
  global.systemTraceChannel = traceChannel;
  // whether this worker is managed by the worker pool
  global.inWorkerPool = inWorkerPool;
  // construct execution context with scope data
  // PEC context will be freshly clean despite a new spun-up worker or a resumed
  // worker as one dedicated worker is associated with one single PEC at a time.
  new ParticleExecutionContext(e.ports[0], Id.fromString(id), IdGenerator.newSession(), new StorageKeyParser(), new Loader(base));
};
