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
import {Modality} from '../../../build/runtime/modality.js';
import {ModalityHandler} from '../../../build/runtime/modality-handler.js';
import {Planificator} from '../../../build/runtime/plan/planificator.js';
import {Suggestion} from '../../../build/runtime/plan/suggestion.js';
import {SlotComposer} from '../../../build/runtime/slot-composer.js';
import {SlotDomConsumer} from '../../../build/runtime/slot-dom-consumer.js';
import {Type, ArcType} from '../../../build/runtime/type.js';
import {Manifest} from '../../../build/runtime/manifest.js';
import {ParticleExecutionContext} from '../../../build/runtime/particle-execution-context.js';
import {StorageProviderFactory} from '../../../build/runtime/storage/storage-provider-factory.js';
import {KeyManager} from '../../../build/runtime/keymgmt/manager.js';
import {RecipeResolver} from '../../../build/runtime/recipe/recipe-resolver.js';
import {firebase} from '../../../build/runtime/firebase.js';
import {XenStateMixin} from '../../../modalities/dom/components/xen/xen-state.js';
import {Template} from '../../../modalities/dom/components/xen/xen-template.js';
import {Debug/*, logFactory*/} from '../../../modalities/dom/components/xen/xen-debug.js';
import {BrowserLoader} from './browser-loader.js';
import {logFactory} from '../../../build/platform/log-web.js';

const Arcs = {
  version: '0.6',
  Arc,
  Manifest,
  Modality,
  ModalityHandler,
  Planificator,
  Suggestion,
  SlotComposer,
  SlotDomConsumer,
  Type,
  ArcType,
  BrowserLoader,
  StorageProviderFactory,
  ParticleExecutionContext,
  RecipeResolver,
  KeyManager,
  firebase,
  logFactory,
  Xen: {
    StateMixin: XenStateMixin,
    Template,
    Debug,
    logFactory
  }
};

// WebPack doesn't support `export` so make this object global

const g = (typeof window === 'undefined') ? global : window;
g.__ArcsLib__ = Arcs;

