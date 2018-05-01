/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {assert} from './chai-web.js';
import Manifest from '../manifest.js';
import ConvertConstraintsToConnections from '../strategies/convert-constraints-to-connections.js';
import InitPopulation from '../strategies/init-population.js';
import MapSlots from '../strategies/map-slots.js';
import ResolveRecipe from '../strategies/resolve-recipe.js';
import MatchParticleByVerb from '../strategies/match-particle-by-verb.js';
import MatchRecipeByVerb from '../strategies/match-recipe-by-verb.js';
import SearchTokensToParticles from '../strategies/search-tokens-to-particles.js';
import GroupHandleConnections from '../strategies/group-handle-connections.js';
import CombinedStrategy from '../strategies/combined-strategy.js';
import CreateDescriptionHandle from '../strategies/create-description-handle.js';
import FallbackFate from '../strategies/fallback-fate.js';
import StrategyTestHelper from './strategies/strategy-test-helper.js';

let {createTestArc, onlyResult, theResults} = StrategyTestHelper;

describe('A Strategy Sequence', function() {
  it('resolves a verb substitution and slot mapping', async () => {
    let manifest = await Manifest.parse(`  
      particle P in 'A.js'
        consume foo

      particle Q in 'B.js'
        consume root
          provide foo

      recipe verb
        P
      
      recipe
        particle can verb
        Q
    `);

    let recipe = manifest.recipes[1];
    let arc = createTestArc('test-plan-arc', manifest, 'dom');

    recipe = await onlyResult(arc, MatchRecipeByVerb, recipe);
    recipe = await onlyResult(arc, ResolveRecipe, recipe);

    assert.isTrue(recipe.isResolved());
  });

  it('resolves a verb substitution, constraint resolution, and slot mapping', async () => {
    let manifest = await Manifest.parse(`
      schema S

      particle P in 'A.js'
        in S s
        consume foo

      particle R in 'C.js'
        out S s

      particle Q in 'B.js'
        consume root
          provide foo

      recipe verb
        P.s -> R.s
      
      recipe
        particle can verb
        Q
    `);

    let recipe = manifest.recipes[1];
    let arc = createTestArc('test-plan-arc', manifest, 'dom');

    recipe = await onlyResult(arc, MatchRecipeByVerb, recipe);
    recipe = await onlyResult(arc, ConvertConstraintsToConnections, recipe);
    recipe = await onlyResult(arc, ResolveRecipe, recipe);

    assert.isTrue(recipe.isResolved());
  });

  it('resolves a verb substitution, constraint resolution, and slot mapping', async () => {
    let manifest = await Manifest.parse(`
      schema S

      particle P in 'A.js'
        in S s
        consume foo

      particle R in 'C.js'
        out S s

      particle Q in 'B.js'
        in S s
        consume root
          provide foo

      particle T in 'D.js'
        out S s

      recipe verb
        P.s -> R.s
      
      recipe
        Q.s -> T.s
        particle can verb
        
    `);

    let recipe = manifest.recipes[1];
    let arc = createTestArc('test-plan-arc', manifest, 'dom');

    recipe = await onlyResult(arc, MatchRecipeByVerb, recipe);
    recipe = await onlyResult(arc, ConvertConstraintsToConnections, recipe);
    recipe = await onlyResult(arc, ResolveRecipe, recipe);

    assert.isTrue(recipe.isResolved());
  });

  it('resolves a complex verb use case', async () => {
    let manifest = await Manifest.parse(`
      schema Thing
      schema Product extends Thing
      schema Description
  
      particle ShowCollection in 'source/ShowCollection.js'
        in [~a] collection
        out [Description] descriptions
        affordance dom
        affordance dom-touch
        consume master #root
          provide action
            view collection
          provide preamble
          provide postamble
          provide set of item
            view collection
          provide set of annotation
            view collection
      
      particle ShowProduct in 'source/ShowProduct.js'
        in Product product
        affordance dom
        affordance dom-touch
        consume item
  
      particle AlsoOn in 'source/AlsoOn.js'
        in Thing product
        in [Thing] choices
        consume annotation
  
      shape HostedParticleShape
        HostedParticleShape(in ~a)
        consume
  
      particle Multiplexer in 'source/Multiplexer.js'
        host HostedParticleShape hostedParticle
        in [~a] list
        consume set of annotation
  
      particle Chooser in 'source/Chooser.js'
        in [~a] choices
        inout [~a] resultList
        consume action
          provide set of annotation
            view choices
  
      particle Recommend in 'source/Recommend.js'
        in [Product] known
        in [Product] population
        out [Product] recommendations
  
      shape HostedParticleShape2
        HostedParticleShape2(in ~a, in [~a])
        consume
        
      particle Multiplexer2 in 'source/Multiplexer.js'
        host HostedParticleShape2 hostedParticle
        in [~a] list
        in [~a] others
        consume set of annotation
  
      recipe showList
        ShowCollection.collection -> Multiplexer.list
        ShowCollection
          consume master
            provide item as itemSlot
        Multiplexer
          hostedParticle = ShowProduct
          consume annotation as itemSlot
   
      recipe
        Chooser.choices -> Recommend.recommendations
        Chooser.resultList -> ShowCollection.collection
        Chooser.resultList -> Recommend.known
        Chooser.resultList -> Multiplexer2.list
        Chooser.choices -> Multiplexer2.others
        map #wishlist as wishlist
        copy #shortlist as shortlist
        Recommend
          population <- wishlist
        particle can showList
        Multiplexer2
          hostedParticle = AlsoOn    
      
    `);

    let recipe = manifest.recipes[1];
    let arc = createTestArc('test-plan-arc', manifest, 'dom');

    let recipes;

    recipe = await onlyResult(arc, MatchRecipeByVerb, recipe);
    recipes = await theResults(arc, ConvertConstraintsToConnections, recipe);
    assert.equal(recipes.length, 2);
    recipe = await onlyResult(arc, ResolveRecipe, recipes[1]);
  });
});
