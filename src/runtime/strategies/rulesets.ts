// Copyright (c) 2018 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import {Ruleset} from '../../planning/strategizer.js';
import {ConvertConstraintsToConnections} from './convert-constraints-to-connections.js';
import {AssignHandles} from './assign-handles.js';
import {InitPopulation} from './init-population.js';
import {MapSlots} from './map-slots.js';
import {MatchParticleByVerb} from './match-particle-by-verb.js';
import {MatchRecipeByVerb} from './match-recipe-by-verb.js';
import {AddMissingHandles} from './add-missing-handles.js';
import {CreateDescriptionHandle} from './create-description-handle.js';
import {InitSearch} from './init-search.js';
import {SearchTokensToParticles} from './search-tokens-to-particles.js';
import {GroupHandleConnections} from './group-handle-connections.js';
import {MatchFreeHandlesToConnections} from './match-free-handles-to-connections.js';
import {ResolveRecipe} from './resolve-recipe.js';

// tslint:disable-next-line: variable-name
export const Empty = new Ruleset.Builder().build();

// tslint:disable-next-line: variable-name
export const ExperimentalPhased = new Ruleset.Builder().order(
  [
    InitPopulation,
    InitSearch
  ],
  SearchTokensToParticles,
  [
    MatchRecipeByVerb,
    MatchParticleByVerb
  ],
  ConvertConstraintsToConnections,
  GroupHandleConnections,
  [
    AddMissingHandles,
    AssignHandles,
    MatchFreeHandlesToConnections,
  ],
  MapSlots,
  CreateDescriptionHandle,
  ResolveRecipe
).build();

// tslint:disable-next-line: variable-name
export const ExperimentalLinear = new Ruleset.Builder().order(
  InitPopulation,
  InitSearch,
  SearchTokensToParticles,
  MatchRecipeByVerb,
  MatchParticleByVerb,
  ConvertConstraintsToConnections,
  GroupHandleConnections,
  MatchFreeHandlesToConnections,
  AddMissingHandles,
  AssignHandles,
  MapSlots,
  CreateDescriptionHandle,
  ResolveRecipe
).build();
