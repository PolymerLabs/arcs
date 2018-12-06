/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Arc} from '../../../build/runtime/arc.js';
import {Planificator} from '../../../build/runtime/plan/planificator.js';
import {SlotComposer} from '../../../build/runtime/slot-composer.js';
import {SlotDomConsumer} from '../../../build/runtime/slot-dom-consumer.js';
import {Type} from '../../../build/runtime/type.js';
import {Manifest} from '../../../build/runtime/manifest.js';
import {ParticleExecutionContext} from '../../../build/runtime/particle-execution-context.js';
import {StorageProviderFactory} from '../../../build/runtime/storage/storage-provider-factory.js';
import {KeyManager} from '../../../build/runtime/keymgmt/manager.js';
import {RecipeResolver} from '../../../build/runtime/recipe/recipe-resolver.js';
import {firebase} from '../../../build/runtime/firebase.js';
import {BrowserLoader} from './browser-loader.js';

const Arcs = {
  version: '0.6',
  Arc,
  Manifest,
  Planificator,
  SlotComposer,
  SlotDomConsumer,
  Type,
  BrowserLoader,
  StorageProviderFactory,
  ParticleExecutionContext,
  RecipeResolver,
  KeyManager,
  firebase
};

// WebPack doesn't support `export` so make this object global

const g = (typeof window === 'undefined') ? global : window;
g.__ArcsLib__ = Arcs;

