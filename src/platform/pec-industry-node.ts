/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {ParticleExecutionContext} from '../runtime/particle-execution-context.js';
import {MessageChannel} from '../runtime/message-channel.js';
import {Id, IdGenerator} from '../runtime/id.js';
import {StorageKeyParser} from '../runtime/storage/storage-key-parser.js';

export const pecIndustry = loader => {
  return (pecId: Id, idGenerator: IdGenerator, storageKeyParser: StorageKeyParser) => {
    const channel = new MessageChannel();
    const _throwAway = new ParticleExecutionContext(channel.port1, pecId, idGenerator, storageKeyParser, loader);
    return channel.port2;
  };
};
