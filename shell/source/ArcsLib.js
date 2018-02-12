/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import Arc from '../../../arcs/runtime/arc.js';
import Description from '../../../arcs/runtime/description.js';
import Manifest from '../../../arcs/runtime/manifest.js';
import Planner from '../../../arcs/runtime/planner.js';
import SlotComposer from '../../../arcs/runtime/slot-composer.js';
import Type from '../../../arcs/runtime/type.js';
import BrowserLoader from './browser-cdn-loader.js';
import Tracing from '../../../arcs/tracelib/trace.js';
import scheduler from '../../../arcs/runtime/scheduler.js';

//Tracing.enable();

window.Arcs = {
  version: '0.3',
  Arc,
  Description,
  Manifest,
  Planner,
  SlotComposer,
  Type,
  BrowserLoader,
  Tracing,
  scheduler
};
