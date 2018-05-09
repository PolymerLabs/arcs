/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Arc} from '../../runtime/arc.js';
import {Description} from '../../runtime/description.js';
import {Manifest} from '../../runtime/manifest.js';
import {Planificator} from '../../runtime/planificator.js';
import {Planner} from '../../runtime/planner.js';
import {SlotComposer} from '../../runtime/slot-composer.js';
import {DomSlot} from '../../runtime/dom-slot.js';
import {Type} from '../../runtime/type.js';
import {BrowserLoader} from './browser-loader.js';
import {Tracing} from '../../tracelib/trace.js';
import {Scheduler} from '../../runtime/scheduler.js';

//Tracing.enable();

const Arcs = {
  version: '0.3',
  Arc,
  Description,
  Manifest,
  Planificator,
  Planner,
  SlotComposer,
  DomSlot,
  Type,
  BrowserLoader,
  Tracing,
  Scheduler
};

// TODO(sjmiles): can't export because WebPack won't make a built version with a module export
// Instead we fall back to populating a global (possibly already created in app-shell/lib/arcs.js).
// export default Arcs;

window.Arcs = window.Arcs ? Object.assign(window.Arcs, Arcs) : Arcs;

