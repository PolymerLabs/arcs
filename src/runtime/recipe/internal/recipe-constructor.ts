/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {Recipe} from './recipe.js';
import {Handle} from './recipe-interface.js';
import {HandleEndPoint, ParticleEndPoint, TagEndPoint} from './connection-constraint.js';
import {ParticleSpec} from '../../arcs-types/particle-spec.js';

// TODO(shanestephens): This should be a RecipeBuilder
export const newRecipe = (name?: string) => new Recipe(name);
export const newHandleEndPoint = (handle: Handle) => new HandleEndPoint(handle);
export const newParticleEndPoint = (particle: ParticleSpec, connection: string) => new ParticleEndPoint(particle, connection);
export const newTagEndPoint = (tags: string[]) => new TagEndPoint(tags);
