/**
 * @license
 * Copyright (c) 2020 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {EndPoint} from './connection-constraint.js';
import {Handle} from './handle.js';
import {HandleConnection, Slot, TypeVariableInfo} from '../type.js';
import {Particle} from './particle.js';
import {Schema} from '../schema.js';
import {SlotConnection} from './slot-connection.js';

export type RecipeComponent = Particle | Handle | HandleConnection | Slot | SlotConnection | EndPoint;
export type CloneMap = Map<RecipeComponent, RecipeComponent>;
export type VariableMap = Map<TypeVariableInfo|Schema, TypeVariableInfo|Schema>;

export type IsResolvedOptions = {showUnresolved?: boolean, details?: string[]}; // TODO(lindner): standardize details
export type IsValidOptions = {errors?: Map</*Recipe | */RecipeComponent, string>};
export type ToStringOptions = {showUnresolved?: boolean, hideFields?: boolean, details?: string[]};
