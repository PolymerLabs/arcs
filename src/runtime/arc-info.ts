/**
 * @license
 * Copyright (c) 2021 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../platform/assert-web.js';
import {Arc, ArcOptions} from './arc.js';
import {ArcId, IdGenerator} from './id.js';
import {Manifest} from './manifest.js';
import {Recipe, Particle} from './recipe/lib-recipe.js';
import {StorageService} from './storage/storage-service.js';
import {SlotComposer} from './slot-composer.js';
import {Runtime} from './runtime.js';
import {Dictionary} from '../utils/lib-utils.js';
import {newRecipe} from './recipe/lib-recipe.js';
import {CapabilitiesResolver} from './capabilities-resolver.js';
import {VolatileStorageKey} from './storage/drivers/volatile.js';
import {StorageKey} from './storage/storage-key.js';
import {PecFactory} from './particle-execution-context.js';
import {ArcInspectorFactory} from './arc-inspector.js';
import {AbstractSlotObserver} from './slot-observer.js';
import {Modality} from './arcs-types/modality.js';
import {EntityType, ReferenceType, InterfaceType, SingletonType} from '../types/lib-types.js';
import {Capabilities} from './capabilities.js';

export type StorageKeyPrefixer = (arcId: ArcId) => StorageKey;

export type NewArcOptions = Readonly<{
  arcName?: string,
  arcId?: ArcId,
  storageKeyPrefix?: StorageKeyPrefixer
  pecFactories?: PecFactory[];
  speculative?: boolean;
  innerArc?: boolean;
  stub?: boolean;
  listenerClasses?: ArcInspectorFactory[];
  inspectorFactory?: ArcInspectorFactory;
  modality?: Modality;
  slotObserver?: AbstractSlotObserver;
  idGenerator?: IdGenerator;
}>;

export type PlanPartition = Readonly<{
  // TODO(b/182410550): plan should be mandatory, when Arc class is refactored
  // into ArcState (like) structure, and there is no need to call ArcHost when
  // an Arc with no running recipes is created.
  plan?: Recipe;
  reinstantiate?: boolean;
  arcOptions: NewArcOptions;
  arcHostId: string;
}>;

export type DeserializeArcOptions = Readonly<{
  serialization: string;
  pecFactories?: PecFactory[];
  slotComposer?: SlotComposer;
  fileName: string;
  inspectorFactory?: ArcInspectorFactory;
}>;
