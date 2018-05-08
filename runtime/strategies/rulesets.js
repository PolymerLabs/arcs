// Copyright (c) 2018 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import {Ruleset} from '../../strategizer/strategizer.js';
import {ConvertConstraintsToConnections} from './convert-constraints-to-connections.js';
import {AssignRemoteHandles} from './assign-remote-handles.js';
import {CopyRemoteHandles} from './copy-remote-handles.js';
import {AssignHandlesByTagAndType} from './assign-handles-by-tag-and-type.js';
import {InitPopulation} from './init-population.js';
import {MapSlots} from './map-slots.js';
import {MatchParticleByVerb} from './match-particle-by-verb.js';
import {MatchRecipeByVerb} from './match-recipe-by-verb.js';
import {AddUseHandles} from './add-use-handles.js';
import {CreateDescriptionHandle} from './create-description-handle.js';
import {InitSearch} from './init-search.js';
import {SearchTokensToParticles} from './search-tokens-to-particles.js';
import {FallbackFate} from './fallback-fate.js';
import {GroupHandleConnections} from './group-handle-connections.js';
import {MatchFreeHandlesToConnections} from './match-free-handles-to-connections.js';
import {CreateHandles} from './create-handles.js';
import {ResolveRecipe} from './resolve-recipe.js';

export const Empty = new Ruleset.Builder().build();

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
    CreateHandles,
    AddUseHandles,
    AssignRemoteHandles,
    CopyRemoteHandles,
    AssignHandlesByTagAndType,
    MatchFreeHandlesToConnections,
    FallbackFate,
  ],
  MapSlots,
  CreateDescriptionHandle,
  ResolveRecipe
).build();

export const ExperimentalLinear = new Ruleset.Builder().order(
  InitPopulation,
  InitSearch,
  SearchTokensToParticles,
  MatchRecipeByVerb,
  MatchParticleByVerb,
  ConvertConstraintsToConnections,
  GroupHandleConnections,
  MatchFreeHandlesToConnections,
  CreateHandles,
  AddUseHandles,
  FallbackFate,
  AssignRemoteHandles,
  CopyRemoteHandles,
  AssignHandlesByTagAndType,
  MapSlots,
  CreateDescriptionHandle,
  ResolveRecipe
).build();
