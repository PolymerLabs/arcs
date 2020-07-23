/**
 * @license
 * Copyright 2020 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {PlanGenerator} from '../plan-generator.js';
import {assert} from '../../platform/chai-node.js';
import {Manifest} from '../../runtime/manifest.js';
import {AllocatorRecipeResolver} from '../allocator-recipe-resolver.js';
import {Recipe} from '../../runtime/recipe/recipe.js';

describe('plan generator', () => {
  it('imports arcs.core.data when the package is different', () => {
    const generator = new PlanGenerator([], 'some.package');

    const actual = generator.fileHeader();

    assert.include(actual, 'import arcs.core.data.*');
  });
  it('does not import arcs.core.data when the package is the same', () => {
    const generator = new PlanGenerator([], 'arcs.core.data');

    const actual = generator.fileHeader();

    assert.notInclude(actual, 'import arcs.core.data.*');
  });
  it('uses the same storage key for created and mapped handle', async () => {
    const {recipes, generator} = await process(`
      particle A
        data: writes Thing {num: Number}
      particle B
        data: reads Thing {num: Number}

      @arcId('ingestion')
      recipe Ingest
        h: create 'data' @persistent
        A
          data: writes h

      recipe Retrieve
        h: map 'data'
        B
          data: reads h`);

    assert.equal(
      await generator.createStorageKey(recipes.find(r => r.name === 'Ingest').handles[0]),
      'StorageKeyParser.parse("db://66ab3cd8dbc1462e9bcfba539dfa5c852558ad64@arcs/!:ingestion/handle/data")'
    );
    assert.equal(
      await generator.createStorageKey(recipes.find(r => r.name === 'Retrieve').handles[0]),
      'StorageKeyParser.parse("db://66ab3cd8dbc1462e9bcfba539dfa5c852558ad64@arcs/!:ingestion/handle/data")'
    );
  });
  it('generated handle connections pertaining to the same handle use the same storage key', async () => {
    const {recipes, generator} = await process(`
      particle A
        data: writes Thing {num: Number}
      particle B
        data: reads Thing {num: Number}

      recipe R
        h: create
        A
          data: writes h
        B
          data: reads h`);

    const [writer, reader] = recipes[0].particles;

    assert.equal(
      await generator.createHandleConnection(writer.connections['data']),
`HandleConnection(
    R_Handle0,
    HandleMode.Write,
    SingletonType(EntityType(A_Data.SCHEMA)),
    emptyList()
)`
    );
    assert.equal(
      await generator.createHandleConnection(reader.connections['data']),
`HandleConnection(
    R_Handle0,
    HandleMode.Read,
    SingletonType(EntityType(B_Data.SCHEMA)),
    emptyList()
)`
    );
  });
  it('creates particles in the same order as the recipe and not the manifest', async () => {
    const {plan} = await process(`
   particle D in 'particle.D'
     data: reads Thing {num: Number}
   particle C in 'particle.C'
     data: writes Thing {num: Number}
   particle B in 'particle.B'
     data: reads Thing {num: Number}
   particle A in 'particle.A'
     data: writes Thing {num: Number}

   recipe R
     h1: create 'id-1' @persistent
     h2: create 'id-2' @persistent
     A
       data: writes h2
     B
       data: reads h2
     C
       data: writes h1
     D
       data: reads h1`);

    assert.include(plan, 'particle.A');
    assert.include(plan, 'particle.B');
    assert.include(plan, 'particle.C');
    assert.include(plan, 'particle.D');
    assert.isBelow(plan.indexOf('particle.A'), plan.indexOf('particle.B'));
    assert.isBelow(plan.indexOf('particle.B'), plan.indexOf('particle.C'));
    assert.isBelow(plan.indexOf('particle.C'), plan.indexOf('particle.D'));
  });
  it('can prefix namespaces for particle classes', async () => {
    const {recipes, generator} = await process(`
    meta
      namespace: arcs.core.data.testdata

    particle Writer in '.Writer'
      data: writes Thing {name: Text}

    recipe Recipe
      data: create 'some-handle' @persistent
      Writer
        data: writes data`);

    const particle = recipes[0].particles[0];

    assert.deepStrictEqual(
      await generator.createParticle(particle),
      `\
Particle(
    "Writer",
    "arcs.core.data.testdata.Writer",
    mapOf(
        "data" to HandleConnection(
            Recipe_Handle0,
            HandleMode.Write,
            SingletonType(EntityType(Writer_Data.SCHEMA)),
            listOf(Annotation("persistent", emptyMap()))
        )
    )
)`
    );
  });
  it('can prefix namespaces for particle class subpaths', async () => {
      const {recipes, generator} = await process(`
    meta
      namespace: arcs.core.data.testdata

    particle Intermediary in '.subdir.Intermediary'
      data: reads writes Thing {name: Text}

    recipe Recipe
      data: create 'some-handle' @persistent
      Intermediary
        data: writes data`);

      const particle = recipes[0].particles[0];

      assert.deepStrictEqual(
        await generator.createParticle(particle),
        `\
Particle(
    "Intermediary",
    "arcs.core.data.testdata.subdir.Intermediary",
    mapOf(
        "data" to HandleConnection(
            Recipe_Handle0,
            HandleMode.ReadWrite,
            SingletonType(EntityType(Intermediary_Data.SCHEMA)),
            listOf(Annotation("persistent", emptyMap()))
        )
    )
)`
      );
  });
  it('reuses schemas generated for particles in handle connection types', async () => {
    const {generator, recipes} = await process(`
      particle A
        data: writes [Person Friend {a: Text, b: Text, c: Text}]

      recipe R
        h: create
        A
          data: h
    `);
    const particle = recipes[0].particles[0];
    const result = await generator.createHandleConnection(particle.connections['data']);
    assert.deepStrictEqual(result, `\
HandleConnection(
    R_Handle0,
    HandleMode.Write,
    CollectionType(EntityType(A_Data.SCHEMA)),
    emptyList()
)`);
  });
  it('generates schemas for resolved type variables', async () => {
    const {generator, recipes} = await process(`
      particle A
        data: writes [Person Friend {a: Text, b: Text, c: Text}]
      particle B
        data: writes [Employer Person {a: Text, b: Text, d: Text}]
      particle C
        data: reads [~a]

      recipe R
        h: create
        A
          data: h
        B
          data: h
        C
          data: h
    `);
    const cParticle = recipes[0].particles.find(p => p.spec.name === 'C');
    const result = await generator.createHandleConnection(cParticle.connections['data']);
    assert.deepStrictEqual(result, `\
HandleConnection(
    R_Handle0,
    HandleMode.Read,
    CollectionType(
        EntityType(
            Schema(
                setOf(SchemaName("Person")),
                SchemaFields(
                    singletons = mapOf("a" to FieldType.Text, "b" to FieldType.Text),
                    collections = emptyMap()
                ),
                "f33d42dee457673f13e166b4644b0eb42f37a156",
                refinement = { _ -> true },
                query = null
            )
        )
    ),
    emptyList()
)`);
  });
  it('generates a handle of type being a union of read types', async () => {
    const {generator, recipes} = await process(`
      particle Writer
        person: writes Person Employee {name: Text, phoneNumber: Number, age: Number}
      particle Reader1
        person: reads Person {name: Text}
      particle Reader2
        person: reads Person {age: Number}

      recipe MyRecipe
        h: create
        Writer
          person: h
        Reader1
          person: h
        Reader2
          person: h
    `);

    const handleObject = await generator.createHandleVariable(recipes[0].handles[0]);

    // 'phoneNumber' field should not be included in the handle type - as it is not read.
    assert.equal(handleObject, `\
val MyRecipe_Handle0 = Handle(
    StorageKeyParser.parse("create://67835270998a62139f8b366f1cb545fb9b72a90b"),
    EntityType(
        Schema(
            setOf(SchemaName("Person")),
            SchemaFields(
                singletons = mapOf("name" to FieldType.Text, "age" to FieldType.Number),
                collections = emptyMap()
            ),
            "edabcee36cb653ff468fb77804911ddfa9303d67",
            refinement = { _ -> true },
            query = null
        )
    ),
    emptyList()
)`);
  });
  async function process(manifestString: string): Promise<{
      recipes: Recipe[],
      generator: PlanGenerator,
      plan: string
  }> {
    const manifest = await Manifest.parse(manifestString);
    const recipes = await new AllocatorRecipeResolver(manifest, 'random_salt').resolve();
    const generator = new PlanGenerator(recipes, manifest.meta.namespace || 'test.namespace');
    const plan = await generator.generate();
    return {recipes, generator, plan};
  }
});
