/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import Manifest from '../manifest.js';
import parser from "../build/manifest-parser.js";
import {assert} from './chai-web.js';

async function assertRecipeParses(input, result) {
  // Strip common leading whitespace.
  //result = result.replace(new Regex(`()^|\n)${result.match(/^ */)[0]}`), '$1'),
  let target = (await Manifest.parse(result)).recipes[0].toString();
  assert.deepEqual((await Manifest.parse(input)).recipes[0].toString(), target);
}

describe('manifest', function() {
  it('can parse a manifest containing a recipe', async () => {
    let manifest = await Manifest.parse(`
      schema S
      particle SomeParticle in 'some-particle.js'
        work(out S someParam)

      recipe SomeRecipe
        map #someView
        create #newView as view0
        SomeParticle
          someParam -> #tag`);
    let verify = (manifest) => {
      let recipe = manifest.recipes[0];
      assert(recipe);
      assert.equal(recipe.particles.length, 1);
      assert.equal(recipe.views.length, 2);
      assert.equal(recipe.views[0].fate, "map");
      assert.equal(recipe.views[1].fate, "create");
      assert.equal(recipe.viewConnections.length, 1);
      assert.sameMembers(recipe.viewConnections[0].tags, ['#tag']);
    };
    verify(manifest);
    verify(await Manifest.parse(manifest.toString(), {}));
  });
  it('can parse a manifest containing a particle specification', async () => {
    let manifest = await Manifest.parse(`
      schema Product
      schema Person
      particle TestParticle in 'testParticle.js'
        TestParticle(in [Product] list, out Person person)
        affordance dom
        affordance dom-touch
        must consume root
          formFactor big
          provide action
            view list
            formFactor big
          provide preamble
            formFactor medium
          provide annotation
        consume other
          provide set of myProvidedSetCell
        consume set of mySetCell
        description \`hello world \${list}\`
          list \`my special list\`
      particle NoArgsParticle in 'noArgsParticle.js'
        NoArgsParticle()
    `);
    let verify = (manifest) => {
      assert.equal(manifest.particles.length, 2);
    };
    verify(manifest);
    verify(await Manifest.parse(manifest.toString(), {}));
  });
  it('can parse a manifest containing a schema', async () => {
    let manifest = await Manifest.parse(`
      schema Bar
        normative
          Text value`);
    let verify = (manifest) => assert.equal(manifest.schemas.Bar.normative.value, 'Text');
    verify(manifest);
    verify(await Manifest.parse(manifest.toString(), {}));
  });
  it('can parse a manifest containing an extended schema', async () => {
    let manifest = await Manifest.parse(`
      schema Foo
        normative
          Text value
      schema Bar extends Foo`);
    let verify = (manifest) => assert.equal(manifest.schemas.Bar.normative.value, 'Text');
    verify(manifest);
    verify(await Manifest.parse(manifest.toString(), {}));
  });
  it('can resolve recipes with connections between particles', async () => {
    let manifest = await Manifest.parse(`
      schema S
      particle P1
        P1(out S x, in S y)
      particle P2
        P2(out S y)

      recipe Connected
        P1
          x -> P2
        P2
          y -> P1.y`);
    let verify = (manifest) => {
      let recipe = manifest.recipes[0];
      assert(recipe);
      assert.equal(recipe.views.length, 2);
      assert.equal(recipe.viewConnections.length, 4);
    };
    verify(manifest);
    verify(await Manifest.parse(manifest.toString(), {}));
  });
  it('supports recipes specified with bidirectional connections', async () => {
    let manifest = await Manifest.parse(`
      schema S
      particle P1
        P1(out S x)
      particle P2
        P2(out S x)

      recipe Bidirectional
        P1
          x -> P2.x
        P2
          x -> P1.x`);
    let verify = (manifest) => {
      let recipe = manifest.recipes[0];
      assert(recipe);
      assert.equal(recipe.views.length, 1);
      assert.equal(recipe.viewConnections.length, 2);
      assert.equal(recipe.toString(), `recipe
  ? as view0
  P1 as particle0
    x -> view0
  P2 as particle1
    x -> view0`);
    };
    verify(manifest);
    verify(await Manifest.parse(manifest.toString(), {}));
  });
  it('supports recipes with constraints', async () => {
    let manifest = await Manifest.parse(`
      particle A
      particle B

      recipe Constrained
        A.a -> B.b`);
    let verify =  (manifest) => {
      let recipe = manifest.recipes[0];
      assert(recipe);
      assert.equal(recipe._connectionConstraints.length, 1);
      var constraint = recipe._connectionConstraints[0];
      assert.equal(constraint.fromParticle.name, 'A');
      assert.equal(constraint.fromConnection, 'a');
      assert.equal(constraint.toParticle.name, 'B');
      assert.equal(constraint.toConnection, 'b');
    };
    verify(manifest);
    verify(await Manifest.parse(manifest.toString(), {}));
  });
  it('supports recipes with local names', async () => {
    let manifest = await Manifest.parse(`
      schema S
      particle P1
        P1(out S x, out S y)
      particle P2
        P2(out S x, out S y)

      recipe
        ? #things as thingView
        P1 as p1
          x -> thingView
        P2
          x -> thingView
          y -> p1.y`,
      `particle P1
      particle P2

      recipe
        ? #things as thingView
        ? as view0
        P1 as p1
          x -> thingView
          y = view0
        P2 as particle0
          x -> thingView
          y -> view0`);
    let deserializedManifest = (await Manifest.parse(manifest.toString(), {}));
  });
  // TODO: move these tests to new-recipe tests.
  it('can normalize simple recipes', async () => {
    let manifest = await Manifest.parse(`
      schema S
      particle P1
        P1(out S x)
      particle P2

      recipe
        ? as v1
        P1
          x -> v1
        P2
      recipe
        ? as someView
        P2
        P1
          x -> someView
        `, {});
    let [recipe1, recipe2] = manifest.recipes;
    assert.notEqual(recipe1.toString(), recipe2.toString());
    assert.notEqual(await recipe1.digest(), await recipe2.digest());
    recipe1.normalize();
    recipe2.normalize();
    assert.deepEqual(recipe1.toString(), recipe2.toString());
    assert.equal(await recipe1.digest(), await recipe2.digest());

    let deserializedManifest = await Manifest.parse(manifest.toString(), {});
  });
  it('can normalize recipes with interdependent ordering of views and particles', async () => {
    let manifest = await Manifest.parse(`
      schema S
      particle P1
        P1(out S x)

      recipe
        use as v1
        use as v2
        P1
          x -> v1
        P1
          x -> v2
      recipe
        use as v1
        use as v2
        P1
          x -> v2
        P1
          x -> v1`);
    let [recipe1, recipe2] = manifest.recipes;
    assert.notEqual(recipe1.toString(), recipe2.toString());
    recipe1.normalize();
    recipe2.normalize();
    assert.deepEqual(recipe1.toString(), recipe2.toString());
  });
  it('can resolve recipe particles defined in the same manifest', async () => {
    let manifest = await Manifest.parse(`
      schema Something
      schema Someother
      particle Thing in 'thing.js'
        Thing(in [Something] someThings, out [Someother] someOthers)
      recipe
        Thing`);
    let verify = (manifest) => assert(manifest.recipes[0].particles[0].spec);
    verify(manifest);
    verify(await Manifest.parse(manifest.toString(), {}));
  });
  it('throws an error when a particle has no appropriate body definition', async () => {
    try {
      let manifest = await Manifest.parse(`
        schema Thixthpenthe
        particle Thing in 'thing.js'`);
      assert(false);
    } catch (e) {
      assert.equal(e.message, "no valid body defined for this particle");
    }
  });
  it('throws an error when a particle has invalid description', async () => {
    try {
      let manifest = await Manifest.parse(`
        schema Foo
        particle Thing in 'thing.js'
          Thing(in Foo foo)
          description \`Does thing\`
            bar \`my-bar\``);
      assert(false);
    } catch (e) {
      assert.equal(e.message, "Unexpected description for bar");
    }
  });
  it('can load a manifest via a loader', async () => {
    let registry = {};
    let loader = {
      loadResource() {
        return 'recipe';
      },
      path(fileName) {
        return fileName;
      },
      join(path, file) {
        return `${path}/${file}`;
      },
    };
    let manifest = await Manifest.load('some-path', loader, {registry});
    assert(manifest.recipes[0]);
    assert.equal(manifest, registry['some-path']);
  });
  it('can load a manifest with imports', async () => {
    let registry = {};
    let loader = {
      loadResource(path) {
        return {
          a: `import 'b'`,
          b: `recipe`,
        }[path];
      },
      path(fileName) {
        return fileName;
      },
      join(_, file) {
        return file;
      },
    }
    let manifest = await Manifest.load('a', loader, {registry});
    assert.equal(registry.a, manifest);
    assert.equal(manifest.imports[0], registry.b);
  });
  it('can resolve recipe particles imported from another manifest', async () => {
    let registry = {};
    let loader = {
      loadResource(path) {
        return {
          a: `
              import 'b'
              recipe
                ParticleB
                `,
          b: `
              schema Thing
              particle ParticleB in 'b.js'
                ParticleB(in Thing thing)`
        }[path];
      },
      path(fileName) {
        return fileName;
      },
      join(_, file) {
        return file;
      },
    };
    let manifest = await Manifest.load('a', loader, {registry});
    assert.equal(manifest.recipes[0].particles[0].spec, registry.b.findParticleByName('ParticleB'));
  });
  it('can parse a schema extending a schema in another manifest', async () => {
    let registry = {};
    let loader = {
      loadResource(path) {
        return {
          a: `
              import 'b'
              schema Bar extends Foo`,
          b: `
              schema Foo
                normative
                  Text value`
        }[path];
      },
      path(fileName) {
        return fileName;
      },
      join(_, file) {
        return file;
      },
    };
    let manifest = await Manifest.load('a', loader, {registry});
    assert.equal(manifest.schemas.Bar.normative.value, 'Text');
  });
  it('can find all imported recipes', async () => {
    let loader = {
      loadResource(path) {
        return {
          a: `
              import 'b'
              import 'c'
              recipe`,
          b: `
              import 'c'
              recipe`,
          c: `recipe`,
        }[path];
      },
      path(fileName) {
        return fileName;
      },
      join(_, file) {
        return file;
      },
    };
    let manifest = await Manifest.load('a', loader);
    assert.equal(manifest.recipes.length, 3)
  });
  it('can parse a schema with union typing', async () => {
    let manifest = await Manifest.parse(`
      schema Foo
        optional
          (Text or URL) value
        optional
          Text test`);
    let verify = (manifest) => assert.deepEqual(manifest.schemas.Foo.optional.value, ['Text', 'URL']);
    verify(manifest);
    verify(await Manifest.parse(manifest.toString()));
  });
  it('can parse a manifest containing a recipe with slots', async () => {
    let manifest = await Manifest.parse(`
      schema Thing
      particle SomeParticle in 'some-particle.js'
        SomeParticle(in Thing someParam)
        consume mySlot
          formFactor big
          provide otherSlot
            view someParam
          provide oneMoreSlot
            formFactor small

      particle OtherParticle
        OtherParticle(out Thing aParam)
        consume mySlot
        consume oneMoreSlot

      recipe SomeRecipe
        ? #someView1 as myView
        slot 'slotIDs:A' as slot0
        SomeParticle
          someParam <- myView
          consume mySlot as slot0
            provide otherSlot as slot2
            provide oneMoreSlot as slot1
        OtherParticle
          aParam -> myView
          consume mySlot as slot0
          consume oneMoreSlot as slot1
    `);
    let verify = (manifest) => {
      let recipe = manifest.recipes[0];
      assert(recipe);
      recipe.normalize();

      assert.equal(recipe.particles.length, 2);
      assert.equal(recipe.views.length, 1);
      assert.equal(recipe.viewConnections.length, 2);
      assert.equal(recipe.slots.length, 3);
      assert.equal(recipe.slotConnections.length, 3);
      assert.equal(Object.keys(recipe.particles[0].consumedSlotConnections).length, 2);
      assert.equal(Object.keys(recipe.particles[1].consumedSlotConnections).length, 1);
      let mySlot = recipe.particles[1].consumedSlotConnections['mySlot'];
      assert.isDefined(mySlot.targetSlot);
      assert.equal(Object.keys(mySlot.providedSlots).length, 2);
      assert.equal(mySlot.providedSlots["oneMoreSlot"], recipe.particles[0].consumedSlotConnections['oneMoreSlot'].targetSlot);
    };
    verify(manifest);
    verify(await Manifest.parse(manifest.toString()));
  });
  it('relies on the loader to combine paths', async () => {
    let registry = {};
    let loader = {
      loadResource(path) {
        return {
          'somewhere/a': `import 'path/b'`,
          'somewhere/a path/b': `recipe`,
        }[path];
      },
      path(fileName) {
        return fileName;
      },
      join(path, file) {
        return `${path} ${file}`;
      },
    };
    let manifest = await Manifest.load('somewhere/a', loader, {registry});
    assert(registry['somewhere/a path/b']);
  });
  it('loads entities from json files', async () => {
    let manifestSource = `
        schema Thing
        view View0 of [Thing] in 'entities.json'`;
    let entitySource = JSON.stringify([
      {someProp: 'someValue'},
      {
        $id: 'entity-id',
        someProp: 'someValue2'
      },
    ]);
    let loader = {
      loadResource(path) {
        return {
          'the.manifest': manifestSource,
          'entities.json': entitySource,
        }[path];
      },
      path(fileName) {
        return fileName;
      },
      join(path, file) {
        return file;
      },
    };
    let manifest = await Manifest.load('the.manifest', loader);
    let view = manifest.findViewByName('View0');
    assert(view);
    assert.deepEqual(view.toList(), [
      {
        id: 'manifest:the.manifest::0',
        rawData: {someProp: 'someValue'},
      }, {
        id: 'entity-id',
        rawData: {someProp: 'someValue2'},
      }
    ]);
  });

  it('resolves view names to ids', async () => {
    let manifestSource = `
        schema Thing
        view View0 of [Thing] in 'entities.json'
        recipe
          map View0 as myView`;
    let entitySource = JSON.stringify([]);
    let loader = {
      loadResource(path) {
        return {
          'the.manifest': manifestSource,
          'entities.json': entitySource,
        }[path];
      },
      path(fileName) {
        return fileName;
      },
      join(path, file) {
        return file;
      },
    };
    let manifest = await Manifest.load('the.manifest', loader);
    let recipe = manifest.recipes[0];
    assert.deepEqual(recipe.toString(), 'recipe\n  map \'manifest:the.manifest:view0\' as myView');
  });
  it('has prettyish syntax errors', async () => {
    try {
      await Manifest.parse('recipe ?', {fileName: 'bad-file'});
      assert(false);
    } catch (e) {
      assert.deepEqual(e.message, `Parse error in 'bad-file' line 1.
Expected " ", "#", "\\n", "\\r", [ ], [A-Z], or [a-z] but "?" found.
  recipe ?
         ^`);
    }
  });

  it('errors when the manifest connects a particle incorrectly', async () => {
    let manifestSource = `
        schema Thing
        particle TestParticle in 'tp.js'
          TestParticle(in Thing iny, out Thing outy, inout Thing inouty)
        recipe
          create as x
          TestParticle
            iny -> x
            outy -> x
            inouty -> x`;
    let loader = {
      loadResource(path) {
        return manifestSource;
      },
      path(fileName) {
        return fileName;
      },
      join(path, file) {
        return file;
      },
    };
    try {
      await Manifest.load('...', loader);
      assert.fail();
    } catch (e) {
      assert.match(e.message, /'->' not compatible with 'in' param of 'TestParticle'/);
    }
  });

  it('errors when the manifest referencs a missing particle param', async () => {
    let manifestSource = `
        schema Thing
        particle TestParticle in 'tp.js'
          TestParticle(in Thing a)
        recipe
          create as x
          TestParticle
            a = x
            b = x`
    let loader = {
      loadResource(path) {
        return manifestSource;
      },
      path(fileName) {
        return fileName;
      },
      join(path, file) {
        return file;
      },
    };
    try {
      await Manifest.load('...', loader);
      assert.fail();
    } catch (e) {
      assert.match(e.message, /param 'b' is not defined by 'TestParticle'/);
    }
  });

  it('resolves manifest with recipe with search', async () => {
    // TODO: support search tokens in manifest-parser.peg
    let manifestSource = `
      recipe
        search \`Hello dear world\``;
    let recipe = (await Manifest.parse(manifestSource)).recipes[0];
    assert.isNotNull(recipe.search);
    assert.equal('Hello dear world', recipe.search.phrase);
    assert.deepEqual(['hello', 'dear', 'world'], recipe.search.unresolvedTokens);
    assert.deepEqual([], recipe.search.resolvedTokens);
    assert.isTrue(recipe.search.isValid());
    recipe.normalize();
    assert.isFalse(recipe.search.isResolved());
    assert.isFalse(recipe.isResolved());
    assert.equal(recipe.toString(), `recipe
  search \`Hello dear world\`
    tokens \`dear\` \`hello\` \`world\``);

    recipe = (await Manifest.parse(manifestSource)).recipes[0];
    // resolve some tokens.
    recipe.search.resolveToken('hello');
    recipe.search.resolveToken('world');
    assert.equal('Hello dear world', recipe.search.phrase);
    assert.deepEqual(['dear'], recipe.search.unresolvedTokens);
    assert.deepEqual(['hello', 'world'], recipe.search.resolvedTokens);
    assert.equal(recipe.toString(), `recipe
  search \`Hello dear world\`
    tokens \`dear\` # \`hello\` \`world\``);

    // resolve all tokens.
    recipe.search.resolveToken('dear');
    recipe.normalize();
    assert.equal('Hello dear world', recipe.search.phrase);
    assert.deepEqual([], recipe.search.unresolvedTokens);
    assert.deepEqual(['dear', 'hello', 'world'], recipe.search.resolvedTokens);
    assert.isTrue(recipe.search.isResolved());
    assert.isTrue(recipe.isResolved());
    assert.equal(recipe.toString(), `recipe
  search \`Hello dear world\`
    tokens # \`dear\` \`hello\` \`world\``);
  });
  it('merge recipes with search strings', async () => {
    let recipe1 = (await Manifest.parse(`recipe
  search \`Hello world\``)).recipes[0];
    let recipe2 = (await Manifest.parse(`recipe
  search \`good morning\`
    tokens \`morning\` # \`good\``)).recipes[0];

    recipe2.mergeInto(recipe1);
    assert.equal('Hello world good morning', recipe1.search.phrase);
    assert.deepEqual(['hello', 'world', 'morning'], recipe1.search.unresolvedTokens);
    assert.deepEqual(['good'], recipe1.search.resolvedTokens);
  });
  it('can parse a manifest containing views', async () => {
    let loader = {
      loadResource() {
        return '[]';
      },
      path(fileName) {
        return fileName;
      },
      join(path, file) {
        return `${path}/${file}`;
      },
    };

    let manifest = await Manifest.parse(`
  schema Product
  view ClairesWishlist of [Product] #wishlist in 'wishlist.json'
    description \`Claire's wishlist\``, {loader});
    let verify = (manifest) => {
      assert.equal(manifest.views.length, 1);
      assert.deepEqual(['#wishlist'], manifest._viewTags.get(manifest.views[0]));
    };
    verify(manifest);
    verify(await Manifest.parse(manifest.toString(), {loader}));
  });
  it('can parse a manifest containing shapes', async () => {
    let manifest = await Manifest.parse(`
      schema Foo
      shape Shape
        AnyThing(in Foo foo)
      particle ShapeParticle
        ShapeParticle(host Shape shape)
      recipe
        create as view0
        ShapeParticle
          shape = view0`);
    assert(manifest.findShapeByName('Shape'));
    assert(manifest.recipes[0].normalize());
  });
  it('can resolve optional handles', async () => {
    let manifest = await Manifest.parse(`
      schema Something
      particle Thing in 'thing.js'
        Thing(in [Something] inThing, out [Something]? maybeOutThings)
      recipe
        create as view0 # [Something]
        Thing
          inThing <- view0`);
    let verify = (manifest) => {
      assert.isFalse(manifest.particles[0].connections[0].isOptional);
      assert.isTrue(manifest.particles[0].connections[1].isOptional);

      let recipe = manifest.recipes[0];
      recipe.normalize();
      assert.isTrue(recipe.isResolved());
    }
    verify(manifest);
    verify(await Manifest.parse(manifest.toString(), {}));
  });
});
