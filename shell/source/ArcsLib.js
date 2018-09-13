/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Runtime} from '../../runtime/ts-build/runtime.js';

// The following will be pulled into Runtime.
import {Arc} from '../../runtime/arc.js';
import {Planificator} from '../../runtime/planificator.js';
import {SlotComposer} from '../../runtime/slot-composer.js';
import {Type} from '../../runtime/ts-build/type.js';


import {BrowserLoader} from './browser-loader.js';
import {Tracing} from '../../tracelib/trace.js';

// Keep in sync with runtime/ts/storage/firebase-storage.ts
import firebase from 'firebase/app';
import 'firebase/database';
import 'firebase/storage';


//Tracing.enable();

const Arcs = {
  version: '0.3',
  Arc,
  Runtime,
  Planificator,
  SlotComposer,
  Type,
  BrowserLoader,
  Tracing,
};

// TODO(sjmiles): can't export because WebPack won't make a built version with a module export
// Instead we fall back to populating a global (possibly already created in app-shell/lib/arcs.js).
// export default Arcs;

window.Arcs = window.Arcs ? Object.assign(window.Arcs, Arcs) : Arcs;
window.firebase = firebase;

