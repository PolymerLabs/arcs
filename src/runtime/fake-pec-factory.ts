// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

'use strict';

import {ParticleExecutionContext} from './particle-execution-context.js';
import {MessagePort, MessageChannel} from './message-channel.js';
import {Loader} from './loader.js';
import {StubLoader} from '../testing/stub-loader.js';

// TODO: Make this generic so that it can also be used in-browser, or add a
// separate in-process browser pec-factory.
export function FakePecFactory(loader: Loader): (id: string) => MessagePort {
  return (id: string) => {
    const channel = new MessageChannel();
    // Each PEC should get its own loader. Only a StubLoader knows how to be cloned,
    // so its either a clone of a Stub or a new Loader.
    const loaderToUse = loader instanceof StubLoader ? (loader as StubLoader).clone() : new Loader();
    const pec = new ParticleExecutionContext(channel.port1, `${id}:inner`, loaderToUse);
    return channel.port2;
  };
}
