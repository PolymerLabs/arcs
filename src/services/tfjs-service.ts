/**
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {Reference, ResourceManager as rmgr} from './resource-manager.js';
import {logFactory} from '../platform/log-web.js';
import {Services} from '../runtime/services.js';

const log = logFactory('tfjs-service');

const dispose = ({reference}) => rmgr.dispose(reference);

// TODO(alxr) Will add generic ML model service functions in #3094

Services.register('tfjs', {
  dispose,
});

