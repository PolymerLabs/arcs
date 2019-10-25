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
        foo: consume

      particle Q in 'B.js'
        root: consume
          foo: provide

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
        s: in S
        foo: consume

      particle R in 'C.js'
        s: out S

      particle Q in 'B.js'
        root: consume
          foo: provide

      recipe &verb
        P.s: out R.s

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
        s: in S
        foo: consume

      particle R in 'C.js'
        s: out S

      particle Q in 'B.js'
        s: in S
        root: consume
          foo: provide

      particle T in 'D.js'
        s: out S

      recipe &verb
        P.s: out R.s

      recipe
        Q.s: out T.s
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
        collection: in [~a]
        descriptions: out [Description]
        modality dom
        modality domTouch
        master: consume #root
          action: provide Slot {handle: collection}
          preamble: provide
          postamble: provide
          item: provide [Slot {handle: collection}]
          annotation: provide [Slot {handle: collection}]

      particle ShowProduct in 'source/ShowProduct.js'
        product: in Product
        modality dom
        modality domTouch
        item: consume?

      particle AlsoOn in 'source/AlsoOn.js'
        product: in Thing
        choices: in [Thing]
        annotation: consume?

      interface HostedParticleInterface
        in ~a *
        consume

      particle Multiplexer in 'source/Multiplexer.js'
        hostedParticle: host HostedParticleInterface
        list: in [~a]
        annotation: consume [Slot]

      particle Chooser in 'source/Chooser.js'
        choices: in [~a]
        resultList: inout [~a]
        action: consume
          annotation: provide [Slot {handle: choices}]

      particle Recommend in 'source/Recommend.js'
        known: in [Product]
        population: in [Product]
        recommendations: out [Product]

      interface HostedParticleInterface2
        in ~a *
        in [~a] *
        consume

      particle Multiplexer2 in 'source/Multiplexer.js'
        hostedParticle: host HostedParticleInterface2
        list: in [~a]
        others: in [~a]
        annotation: consume [Slot]

      recipe &showList
        ShowCollection.collection: out Multiplexer.list
        ShowCollection
          master: consume
            item: provide itemSlot
        Multiplexer
          hostedParticle: any ShowProduct
          annotation: consume itemSlot

      recipe
        Chooser.choices: out Recommend.recommendations
        Chooser.resultList: out ShowCollection.collection
        Chooser.resultList: out Recommend.known
        Chooser.resultList: out Multiplexer2.list
        Chooser.choices: out Multiplexer2.others
        wishlist: map #wishlist
        shortlist: copy #shortlist
        Recommend
          population: in wishlist
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
        o: out S {}
      particle B
        i: in S {}
      recipe
        A: out B
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
        o: out S {}
        i: in S {}
      particle B
        i: in S {}
        i2: in T {}
      recipe
        A: out B
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
        o: out S {}
        i: in T {}
      particle B
        i: in S {}
        o: out T {}
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

