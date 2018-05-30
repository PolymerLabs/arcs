/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {assert} from '../chai-web.js';
import {Manifest} from '../../manifest.js';
import {ConvertConstraintsToConnections} from '../../strategies/convert-constraints-to-connections.js';
import {GroupHandleConnections} from '../../strategies/group-handle-connections.js';
import {ResolveRecipe} from '../../strategies/resolve-recipe.js';
import {MatchRecipeByVerb} from '../../strategies/match-recipe-by-verb.js';
import {StrategyTestHelper} from './strategy-test-helper.js';
import {CreateHandles} from '../../strategies/create-handles.js';
import {CreateHandleGroup} from '../../strategies/create-handle-group.js';

let {createTestArc, onlyResult, noResult, theResults} = StrategyTestHelper;

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
            handle collection
          provide preamble
          provide postamble
          provide set of item
            handle collection
          provide set of annotation
            handle collection
      
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
        in ~a *
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
            handle choices
  
      particle Recommend in 'source/Recommend.js'
        in [Product] known
        in [Product] population
        out [Product] recommendations
  
      shape HostedParticleShape2
        in ~a *
        in [~a] *
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

  it('connects particles together when there\'s only one possible connection', async () => {
    let manifest = await Manifest.parse(`
      particle A
        out S {} o
      particle B
        in S {} i
      recipe
        A -> B
    `);

    let recipe = manifest.recipes[0];
    let arc = createTestArc('test-plan-arc', manifest, 'dom');

    recipe = await onlyResult(arc, ConvertConstraintsToConnections, recipe);
    recipe = await onlyResult(arc, CreateHandleGroup, recipe);
    recipe = await onlyResult(arc, ResolveRecipe, recipe);
    assert.isTrue(recipe.isResolved());
  });

    it(`connects particles together when there's extra things that can't connect`, async () => {
    let manifest = await Manifest.parse(`
      particle A
        out S {} o
        in S {} i
      particle B
        in S {} i
        in T {} i2
      recipe
        A -> B
    `);

    let recipe = manifest.recipes[0];
    let arc = createTestArc('test-plan-arc', manifest, 'dom');

    recipe = await onlyResult(arc, ConvertConstraintsToConnections, recipe);
    await noResult(arc, ResolveRecipe, recipe);

    recipe = await onlyResult(arc, CreateHandleGroup, recipe);
    recipe = await onlyResult(arc, ResolveRecipe, recipe);
    assert.equal(recipe.obligations.length, 0);
  });

  it('connects particles together with multiple connections', async () => {
    let manifest = await Manifest.parse(`
      particle A
        out S {} o
        in T {} i
      particle B
        in S {} i
        out T {} o
      recipe
        A = B
    `);

    let recipe = manifest.recipes[0];
    let arc = createTestArc('test-plan-arc', manifest, 'dom');

    recipe = await onlyResult(arc, ConvertConstraintsToConnections, recipe);
    recipe = await onlyResult(arc, CreateHandleGroup, recipe);
    recipe = await onlyResult(arc, CreateHandleGroup, recipe);
    recipe = await onlyResult(arc, ResolveRecipe, recipe);    
    assert.isTrue(recipe.isResolved());
  });
});

