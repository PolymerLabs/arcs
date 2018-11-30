/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Arc} from '../../../runtime/ts-build/arc.js';
import {Planificator} from '../../../runtime/ts-build/plan/planificator.js';
import {SlotComposer} from '../../../runtime/ts-build/slot-composer.js';
import {SlotDomConsumer} from '../../../runtime/ts-build/slot-dom-consumer.js';
import {Type} from '../../../runtime/ts-build/type.js';
import {Manifest} from '../../../runtime/ts-build/manifest.js';
import {ParticleExecutionContext} from '../../../runtime/ts-build/particle-execution-context.js';
import {StorageProviderFactory} from '../../../runtime/ts-build/storage/storage-provider-factory.js';
import {KeyManager} from '../../../runtime/ts-build/keymgmt/manager.js';
import {RecipeResolver} from '../../../runtime/ts-build/recipe/recipe-resolver.js';
import {firebase} from '../../../runtime/firebase.js';
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

