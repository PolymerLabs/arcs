/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {assert} from '../../../platform/chai-web.js';
import {Manifest} from '../../../runtime/manifest.js';
import {ConvertConstraintsToConnections} from '../../strategies/convert-constraints-to-connections.js';
import {CreateHandleGroup} from '../../strategies/create-handle-group.js';
import {MatchRecipeByVerb} from '../../strategies/match-recipe-by-verb.js';
import {ResolveRecipe} from '../../strategies/resolve-recipe.js';
import {StrategyTestHelper} from '../../testing/strategy-test-helper.js';
import {Flags} from '../../../runtime/flags.js';

const {createTestArc, onlyResult, noResult, theResults} = StrategyTestHelper;

describe('A Strategy Sequence', () => {
  it('SLANDLES SYNTAX resolves a verb substitution and slot mapping', Flags.withPostSlandlesSyntax(async () => {
    const manifest = await Manifest.parse(`
      particle P in 'A.js'
        foo: consumes

      particle Q in 'B.js'
        root: consumes
          foo: provides

      recipe &verb
        P

      recipe
        &verb
        Q
    `);

    let recipe = manifest.recipes[1];
    const arc = createTestArc(manifest);

    recipe = await onlyResult(arc, MatchRecipeByVerb, recipe);
    // In this example, the first run of the ResolveRecipe strategy will map potential
    // consume slot connections to remote slots, which exposes the corresponding provide
    // slots. The second run of the ResolveRecipe strategy will map potential consume
    // slots to these recently created provided slots.
    recipe = await onlyResult(arc, ResolveRecipe, recipe);
    recipe = await onlyResult(arc, ResolveRecipe, recipe);

    assert.isTrue(recipe.isResolved());
  }));

  it('resolves a verb substitution and slot mapping', Flags.withPreSlandlesSyntax(async () => {
    const manifest = await Manifest.parse(`
      particle P in 'A.js'
        consume foo

      particle Q in 'B.js'
        consume root
          provide foo

      recipe &verb
        P

      recipe
        &verb
        Q
    `);

    let recipe = manifest.recipes[1];
    const arc = createTestArc(manifest);

    recipe = await onlyResult(arc, MatchRecipeByVerb, recipe);
    // In this example, the first run of the ResolveRecipe strategy will map potential
    // consume slot connections to remote slots, which exposes the corresponding provide
    // slots. The second run of the ResolveRecipe strategy will map potential consume
    // slots to these recently created provided slots.
    recipe = await onlyResult(arc, ResolveRecipe, recipe);
    recipe = await onlyResult(arc, ResolveRecipe, recipe);

    assert.isTrue(recipe.isResolved());
  }));

  it('SLANDLES SYNTAX resolves a verb substitution, constraint resolution, and slot mapping', Flags.withPostSlandlesSyntax(async () => {
    const manifest = await Manifest.parse(`
      schema S

      particle P in 'A.js'
        s: reads S
        foo: consumes

      particle R in 'C.js'
        s: writes S

      particle Q in 'B.js'
        root: consumes
          foo: provides

      recipe &verb
        P.s: writes R.s

      recipe
        &verb
        Q
    `);

    let recipe = manifest.recipes[1];
    const arc = createTestArc(manifest);

    recipe = await onlyResult(arc, MatchRecipeByVerb, recipe);
    recipe = await onlyResult(arc, ConvertConstraintsToConnections, recipe);
    recipe = await onlyResult(arc, ResolveRecipe, recipe);
    recipe = await onlyResult(arc, ResolveRecipe, recipe);

    assert.isTrue(recipe.isResolved());
  }));

  it('resolves a verb substitution, constraint resolution, and slot mapping', Flags.withPreSlandlesSyntax(async () => {
    const manifest = await Manifest.parse(`
      schema S

      particle P in 'A.js'
        in S s
        consume foo

      particle R in 'C.js'
        out S s

      particle Q in 'B.js'
        consume root
          provide foo

      recipe &verb
        P.s -> R.s

      recipe
        &verb
        Q
    `);

    let recipe = manifest.recipes[1];
    const arc = createTestArc(manifest);

    recipe = await onlyResult(arc, MatchRecipeByVerb, recipe);
    recipe = await onlyResult(arc, ConvertConstraintsToConnections, recipe);
    recipe = await onlyResult(arc, ResolveRecipe, recipe);
    recipe = await onlyResult(arc, ResolveRecipe, recipe);

    assert.isTrue(recipe.isResolved());
  }));

  it('SLANDLES SYNTAX resolves a verb substitution, constraint resolution, and slot mapping', Flags.withPostSlandlesSyntax(async () => {
    const manifest = await Manifest.parse(`
      schema S

      particle P in 'A.js'
        s: reads S
        foo: consumes

      particle R in 'C.js'
        s: writes S

      particle Q in 'B.js'
        s: reads S
        root: consumes
          foo: provides

      particle T in 'D.js'
        s: writes S

      recipe &verb
        P.s: writes R.s

      recipe
        Q.s: writes T.s
        &verb

    `);

    let recipe = manifest.recipes[1];
    const arc = createTestArc(manifest);

    recipe = await onlyResult(arc, MatchRecipeByVerb, recipe);
    recipe = await onlyResult(arc, ConvertConstraintsToConnections, recipe);
    recipe = await onlyResult(arc, ResolveRecipe, recipe);
    recipe = await onlyResult(arc, ResolveRecipe, recipe);

    assert.isTrue(recipe.isResolved());
  }));

  it('resolves a verb substitution, constraint resolution, and slot mapping', Flags.withPreSlandlesSyntax(async () => {
    const manifest = await Manifest.parse(`
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

      recipe &verb
        P.s -> R.s

      recipe
        Q.s -> T.s
        &verb

    `);

    let recipe = manifest.recipes[1];
    const arc = createTestArc(manifest);

    recipe = await onlyResult(arc, MatchRecipeByVerb, recipe);
    recipe = await onlyResult(arc, ConvertConstraintsToConnections, recipe);
    recipe = await onlyResult(arc, ResolveRecipe, recipe);
    recipe = await onlyResult(arc, ResolveRecipe, recipe);

    assert.isTrue(recipe.isResolved());
  }));

  it('SLANDLES SYNTAX resolves a complex verb use case', Flags.withPostSlandlesSyntax(async () => {
    const manifest = await Manifest.parse(`
      schema Thing
      schema Product extends Thing
      schema Description

      particle ShowCollection in 'source/ShowCollection.js'
        collection: reads [~a]
        descriptions: writes [Description]
        modality dom
        modality domTouch
        master: consumes? #root
          action: provides Slot {handle: collection}
          preamble: provides
          postamble: provides
          item: provides [Slot {handle: collection}]
          annotation: provides [Slot {handle: collection}]

      particle ShowProduct in 'source/ShowProduct.js'
        product: reads Product
        modality dom
        modality domTouch
        item: consumes?

      particle AlsoOn in 'source/AlsoOn.js'
        product: reads Thing
        choices: reads [Thing]
        annotation: consumes?

      interface HostedParticleInterface
        reads ~a
        consumes?

      particle Multiplexer in 'source/SlandleSyntaxMultiplexer.js'
        hostedParticle: hosts HostedParticleInterface
        list: reads [~a]
        annotation: consumes? [Slot]

      particle Chooser in 'source/Chooser.js'
        choices: reads [~a]
        resultList: reads writes [~a]
        action: consumes?
          annotation: provides [Slot {handle: choices}]

      particle Recommend in 'source/Recommend.js'
        known: reads [Product]
        population: reads [Product]
        recommendations: writes [Product]

      interface HostedParticleInterface2
        reads ~a
        reads [~a]
        consumes?

      particle Multiplexer2 in 'source/SlandleSyntaxMultiplexer.js'
        hostedParticle: hosts HostedParticleInterface2
        list: reads [~a]
        others: reads [~a]
        annotation: consumes? [Slot]

      recipe &showList
        ShowCollection.collection: writes Multiplexer.list
        ShowCollection
          master: consumes
            item: provides itemSlot
        Multiplexer
          hostedParticle: hosts ShowProduct
          annotation: consumes itemSlot

      recipe
        Chooser.choices: writes Recommend.recommendations
        Chooser.resultList: writes ShowCollection.collection
        Chooser.resultList: writes Recommend.known
        Chooser.resultList: writes Multiplexer2.list
        Chooser.choices: writes Multiplexer2.others
        wishlist: map #wishlist
        shortlist: copy #shortlist
        Recommend
          population: reads wishlist
        &showList
        Multiplexer2
          hostedParticle: any AlsoOn
    `);

    let recipe = manifest.recipes[1];
    const arc = createTestArc(manifest);

    recipe = await onlyResult(arc, MatchRecipeByVerb, recipe);
    const recipes = await theResults(arc, ConvertConstraintsToConnections, recipe);
    assert.lengthOf(recipes, 2);
    recipe = await onlyResult(arc, ResolveRecipe, recipes[1]);
  }));

  it('resolves a complex verb use case', Flags.withPreSlandlesSyntax(async () => {
    const manifest = await Manifest.parse(`
      schema Thing
      schema Product extends Thing
      schema Description

      particle ShowCollection in 'source/ShowCollection.js'
        in [~a] collection
        out [Description] descriptions
        modality dom
        modality domTouch
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
        modality dom
        modality domTouch
        consume item

      particle AlsoOn in 'source/AlsoOn.js'
        in Thing product
        in [Thing] choices
        consume annotation

      interface HostedParticleInterface
        in ~a *
        consume

      particle Multiplexer in 'source/Multiplexer.js'
        host HostedParticleInterface hostedParticle
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

      interface HostedParticleInterface2
        in ~a *
        in [~a] *
        consume

      particle Multiplexer2 in 'source/Multiplexer.js'
        host HostedParticleInterface2 hostedParticle
        in [~a] list
        in [~a] others
        consume set of annotation

      recipe &showList
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
        &showList
        Multiplexer2
          hostedParticle = AlsoOn

    `);

    let recipe = manifest.recipes[1];
    const arc = createTestArc(manifest);

    recipe = await onlyResult(arc, MatchRecipeByVerb, recipe);
    const recipes = await theResults(arc, ConvertConstraintsToConnections, recipe);
    assert.lengthOf(recipes, 2);
    recipe = await onlyResult(arc, ResolveRecipe, recipes[1]);
  }));

  it('SLANDLES SYNTAX connects particles together when there\'s only one possible connection', Flags.withPostSlandlesSyntax(async () => {
    const manifest = await Manifest.parse(`
      particle A
        o: writes S {}
      particle B
        i: reads S {}
      recipe
        A: writes B
    `);

    let recipe = manifest.recipes[0];
    const arc = createTestArc(manifest);

    recipe = await onlyResult(arc, ConvertConstraintsToConnections, recipe);
    recipe = await onlyResult(arc, CreateHandleGroup, recipe);
    recipe = await onlyResult(arc, ResolveRecipe, recipe);
    assert.isTrue(recipe.isResolved());
  }));

  it('connects particles together when there\'s only one possible connection', Flags.withPreSlandlesSyntax(async () => {
    const manifest = await Manifest.parse(`
      particle A
        out S {} o
      particle B
        in S {} i
      recipe
        A -> B
    `);

    let recipe = manifest.recipes[0];
    const arc = createTestArc(manifest);

    recipe = await onlyResult(arc, ConvertConstraintsToConnections, recipe);
    recipe = await onlyResult(arc, CreateHandleGroup, recipe);
    recipe = await onlyResult(arc, ResolveRecipe, recipe);
    assert.isTrue(recipe.isResolved());
  }));

    it(`SLANDLES SYNTAX connects particles together when there's extra things that can't connect`, Flags.withPostSlandlesSyntax(async () => {
    const manifest = await Manifest.parse(`
      particle A
        o: writes S {}
        i: reads S {}
      particle B
        i: reads S {}
        i2: reads T {}
      recipe
        A: writes B
    `);

    let recipe = manifest.recipes[0];
    const arc = createTestArc(manifest);

    recipe = await onlyResult(arc, ConvertConstraintsToConnections, recipe);
    await noResult(arc, ResolveRecipe, recipe);

    recipe = await onlyResult(arc, CreateHandleGroup, recipe);
    recipe = await onlyResult(arc, ResolveRecipe, recipe);
    assert.isEmpty(recipe.obligations);
  }));

    it(`connects particles together when there's extra things that can't connect`, Flags.withPreSlandlesSyntax(async () => {
    const manifest = await Manifest.parse(`
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
    const arc = createTestArc(manifest);

    recipe = await onlyResult(arc, ConvertConstraintsToConnections, recipe);
    await noResult(arc, ResolveRecipe, recipe);

    recipe = await onlyResult(arc, CreateHandleGroup, recipe);
    recipe = await onlyResult(arc, ResolveRecipe, recipe);
    assert.isEmpty(recipe.obligations);
  }));

  it('SLANDLES SYNTAX connects particles together with multiple connections', Flags.withPostSlandlesSyntax(async () => {
    const manifest = await Manifest.parse(`
      particle A
        o: writes S {}
        i: reads T {}
      particle B
        i: reads S {}
        o: writes T {}
      recipe
        A: any B
    `);

    let recipe = manifest.recipes[0];
    const arc = createTestArc(manifest);

    recipe = await onlyResult(arc, ConvertConstraintsToConnections, recipe);
    recipe = await onlyResult(arc, CreateHandleGroup, recipe);
    recipe = await onlyResult(arc, CreateHandleGroup, recipe);
    recipe = await onlyResult(arc, ResolveRecipe, recipe);
    assert.isTrue(recipe.isResolved());
  }));
  it('connects particles together with multiple connections', Flags.withPreSlandlesSyntax(async () => {
    const manifest = await Manifest.parse(`
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
    const arc = createTestArc(manifest);

    recipe = await onlyResult(arc, ConvertConstraintsToConnections, recipe);
    recipe = await onlyResult(arc, CreateHandleGroup, recipe);
    recipe = await onlyResult(arc, CreateHandleGroup, recipe);
    recipe = await onlyResult(arc, ResolveRecipe, recipe);
    assert.isTrue(recipe.isResolved());
  }));
});

