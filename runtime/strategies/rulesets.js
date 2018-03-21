// Copyright (c) 2018 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import {Ruleset} from '../../strategizer/strategizer.js';
import ConvertConstraintsToConnections from './convert-constraints-to-connections.js';
import AssignRemoteViews from './assign-remote-views.js';
import CopyRemoteViews from './copy-remote-views.js';
import AssignViewsByTagAndType from './assign-views-by-tag-and-type.js';
import InitPopulation from './init-population.js';
import MapSlots from './map-slots.js';
import MatchParticleByVerb from './match-particle-by-verb.js';
import MatchRecipeByVerb from './match-recipe-by-verb.js';
import NameUnnamedConnections from './name-unnamed-connections.js';
import AddUseViews from './add-use-views.js';
import CreateDescriptionHandle from './create-description-handle.js';
import InitSearch from './init-search.js';
import SearchTokensToParticles from './search-tokens-to-particles.js';
import FallbackFate from './fallback-fate.js';
import GroupHandleConnections from './group-handle-connections.js';
import CombinedStrategy from './combined-strategy.js';
import MatchFreeHandlesToConnections from './match-free-handles-to-connections.js';
import CreateViews from './create-views.js';
import ResolveRecipe from './resolve-recipe.js';

export const Empty = new Ruleset.Builder().build();

export const ExperimentalPhased = new Ruleset.Builder().order(
  [
    InitPopulation,
    InitSearch
  ], [
    MatchRecipeByVerb,
    MatchParticleByVerb
  ],
  ConvertConstraintsToConnections,
  [
    CreateViews,
    AddUseViews,
    AssignRemoteViews,
    CopyRemoteViews,
    AssignViewsByTagAndType,
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
  MatchRecipeByVerb,
  MatchParticleByVerb,
  ConvertConstraintsToConnections,
  MatchFreeHandlesToConnections,
  CreateViews,
  AddUseViews,
  FallbackFate,
  AssignRemoteViews,
  CopyRemoteViews,
  AssignViewsByTagAndType,
  MapSlots,
  CreateDescriptionHandle,
  ResolveRecipe
).build();
