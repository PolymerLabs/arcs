// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import {Loader} from './loader.js';
import {MessageChannel, MessagePort} from './message-channel.js';
import {ParticleExecutionContext, PecFactory} from './particle-execution-context.js';
import {StubLoader} from './testing/stub-loader.js';
import {Id, IdGenerator} from './id.js';

// TODO: Make this generic so that it can also be used in-browser, or add a
// separate in-process browser pec-factory.
export function FakePecFactory(loader: Loader): PecFactory {
  return (pecId: Id, idGenerator: IdGenerator) => {
    const channel = new MessageChannel();
    // Each PEC should get its own loader. Only a StubLoader knows how to be cloned,
    // so its either a clone of a Stub or a new Loader.
    const loaderToUse = loader instanceof StubLoader ? (loader as StubLoader).clone() : new Loader();
    const pec = new ParticleExecutionContext(channel.port1, pecId, idGenerator, loaderToUse);
    return channel.port2;
  };
}
