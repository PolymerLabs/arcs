/**
 * @license
 * Copyright 2020 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Manifest} from '../../runtime/manifest.js';
import {assert} from '../../platform/chai-node.js';
import {
  findLongRunningArcId,
  isLongRunning,
  AllocatorRecipeResolver,
  AllocatorRecipeResolverError
} from '../allocator-recipe-resolver.js';
import {assertThrowsAsync} from '../../testing/test-util.js';
import {Flags} from '../../runtime/flags.js';
import {Runtime} from '../../runtime/runtime.js';
import {VolatileStorageKey} from '../../runtime/storage/drivers/volatile.js';
import {PersistentDatabaseStorageKey} from '../../runtime/storage/database-storage-key.js';
import {CreatableStorageKey} from '../../runtime/storage/creatable-storage-key.js';
import {TestVolatileMemoryProvider} from '../../runtime/testing/test-volatile-memory-provider.js';

const randomSalt = 'random_salt';

describe('allocator recipe resolver', () => {
  afterEach(() => Runtime.resetDrivers());
  it('detects long running arc', async () => {
    const manifest = (await Manifest.parse(`
        recipe Zero
        @arcId('myLongRunningArc')
        recipe One
    `));
    assert.lengthOf(manifest.recipes, 2);
    const resolver = new AllocatorRecipeResolver(manifest, randomSalt);
    assert.isFalse(isLongRunning(manifest.recipes[0]));
    assert.isNull(findLongRunningArcId(manifest.recipes[0]));
    assert.equal(findLongRunningArcId(manifest.recipes[1]), 'myLongRunningArc');
    assert.isTrue(isLongRunning(manifest.recipes[1]));
  });
  it('resolves mapping a handle from a long running arc into another long running arc', Flags.withDefaultReferenceMode(async () => {
    const manifest = await Manifest.parse(`\
  particle Reader
    data: reads Thing {name: Text}
  particle Writer
    data: writes Thing {name: Text}

  @arcId('writeArcId')
  recipe WritingRecipe
    thing: create 'my-handle-id' @persistent
    Writer
      data: writes thing

  @arcId('readArcId')
  recipe ReadingRecipe
    data: map 'my-handle-id'
    Reader
      data: reads data`);

    const resolver = new AllocatorRecipeResolver(manifest, randomSalt);
    const recipes = await resolver.resolve();
    assert.lengthOf(recipes, 2);
    const writingRecipe = recipes.find(r => r.name === 'WritingRecipe');
    const readingRecipe = recipes.find(r => r.name === 'ReadingRecipe');
    assert.equal(writingRecipe.handles[0].storageKey.toString(),
                 readingRecipe.handles[0].storageKey.toString());
    assert.equal(writingRecipe.handles[0].type.resolvedType().toString(), 'Thing {name: Text}');
    assert.equal(readingRecipe.handles[0].type.resolvedType().toString(), 'Thing {name: Text}');
    assert.isTrue(recipes.every(r => r.handleConnections.every(conn => conn.type.isResolved())));
  }));
  it('fails to resolve mapping a handle from a short running arc into another short running arc', Flags.withDefaultReferenceMode(async () => {
    const manifest = await Manifest.parse(`\
  particle Reader
    data: reads Thing {name: Text}

  particle Writer
     data: writes Thing {name: Text}

  recipe WritingRecipe
    thing: create 'my-handle-id' @persistent
    Writer
      data: writes thing

  recipe ReadingRecipe
    data: map 'my-handle-id'
    Reader
      data: reads data`);

    const resolver = new AllocatorRecipeResolver(manifest, randomSalt);
    await assertThrowsAsync(
      async () => resolver.resolve(),
      AllocatorRecipeResolverError,
      `No matching stores found for handle 'my-handle-id' in recipe ReadingRecipe.`
    );
  }));
  it('fails to resolve mapping a handle from a short running arc into a long running arc', Flags.withDefaultReferenceMode(async () => {
    const manifest = await Manifest.parse(`\
  particle Reader
    data: reads Thing {name: Text}

  particle Writer
     data: writes Thing {name: Text}

  recipe WritingRecipe
    thing: create 'my-handle-id' @persistent
    Writer
      data: writes thing

  @arcId('readArcId')
  recipe ReadingRecipe
    data: map 'my-handle-id'
    Reader
      data: reads data`);

    const resolver = new AllocatorRecipeResolver(manifest, randomSalt);
    await assertThrowsAsync(
      async () => resolver.resolve(),
      AllocatorRecipeResolverError,
      `No matching stores found for handle 'my-handle-id' in recipe ReadingRecipe.`
    );
  }));
  it('resolves mapping a handle from a long running arc into a short running arc', Flags.withDefaultReferenceMode(async () => {
    const manifest = await Manifest.parse(`\
  particle Reader
    data: reads Thing {name: Text}

  particle Writer
     data: writes Thing {name: Text}

  @arcId('writeArcId')
  recipe WritingRecipe
    thing: create 'my-handle-id' @persistent
    Writer
      data: writes thing

  recipe ReadingRecipe
    data: map 'my-handle-id'
    Reader
      data: reads data`);

    const resolver = new AllocatorRecipeResolver(manifest, randomSalt);
    const recipes = await resolver.resolve();
    assert.lengthOf(recipes, 2);
    const writingRecipe = recipes.find(r => r.name === 'WritingRecipe');
    const readingRecipe = recipes.find(r => r.name === 'ReadingRecipe');
    assert.equal(writingRecipe.handles[0].storageKey.toString(),
                 readingRecipe.handles[0].storageKey.toString());
    assert.equal(writingRecipe.handles[0].type.resolvedType().toString(), 'Thing {name: Text}');
    assert.equal(readingRecipe.handles[0].type.resolvedType().toString(), 'Thing {name: Text}');
    assert.isTrue(recipes.every(r => r.handleConnections.every(conn => conn.type.isResolved())));

  }));
  it('fails if the type read is broader than the type written', Flags.withDefaultReferenceMode(async () => {
    const manifest = await Manifest.parse(`\
  particle Reader
    data: reads Thing {name: Text, age: Number}

  particle Writer
     data: writes Thing {name: Text}

  @arcId('writeArcId')
  recipe WritingRecipe
    thing: create 'my-handle-id' @persistent
    Writer
      data: writes thing

  @arcId('readArcId')
  recipe ReadingRecipe
    data: map 'my-handle-id'
    Reader
      data: reads data`);

    const resolver = new AllocatorRecipeResolver(manifest, randomSalt);
    // TODO: specify the correct error to be thrown
    await assertThrowsAsync(resolver.resolve);
  }));
  it('resolves if the type written is be broader than type read', Flags.withDefaultReferenceMode(async () => {
    const manifest = await Manifest.parse(`\
  particle Writer
    data: writes Product Thing {name: Text, price: Number}
  particle Reader
    data: reads Thing {name: Text}

  @arcId('writeArcId')
  recipe WritingRecipe
    thing: create 'my-handle-id' @persistent
    Writer
      data: writes thing

  recipe ReadingRecipe
    data: map 'my-handle-id'
    Reader
      data: reads data`);

    const resolver = new AllocatorRecipeResolver(manifest, randomSalt);
    const recipes = await resolver.resolve();
    assert.lengthOf(recipes, 2);
    const writingRecipe = recipes.find(recipe => recipe.name === 'WritingRecipe');
    const readingRecipe = recipes.find(r => r.name === 'ReadingRecipe');
    assert.equal(writingRecipe.handles[0].storageKey.toString(),
                 readingRecipe.handles[0].storageKey.toString());
    assert.isTrue(recipes.every(r => r.handleConnections.every(conn => conn.type.isResolved())));
    assert.equal(writingRecipe.handles[0].type.resolvedType().toString(), 'Thing {name: Text}');
    assert.equal(writingRecipe.handleConnections[0].type.resolvedType().toString(),
        'Product Thing {name: Text, price: Number}');
    assert.equal(readingRecipe.handles[0].type.resolvedType().toString(), 'Thing {name: Text}');
    assert.equal(readingRecipe.handleConnections[0].type.resolvedType().toString(),
        'Thing {name: Text}');
  }));
  it('fails to resolve when a ingestion recipe has no arcId', async () => {
    const manifest = await Manifest.parse(`\
  particle Reader
    data: reads Thing {name: Text}

  particle Writer
     data: writes Thing {name: Text}

  recipe WritingRecipe
    thing: create 'my-handle-id' @persistent
    Writer
      data: writes thing

  @arcId('readArcId')
  recipe ReadingRecipe
    data: map 'my-handle-id'
    Reader
      data: reads data`);

    const resolver = new AllocatorRecipeResolver(manifest, randomSalt);
    await assertThrowsAsync(
      async () => resolver.resolve(),
      AllocatorRecipeResolverError,
      `No matching stores found for handle 'my-handle-id' in recipe ReadingRecipe.`
    );
  });
  it('fails to resolve when an ingestion recipe uses a create handle with no Id', async () => {
    const manifest = await Manifest.parse(`\
  particle Reader
    data: reads Thing {name: Text}

  particle Writer
     data: writes Thing {name: Text}

  @arcId('writeArcId')
  recipe WritingRecipe
    thing: create @persistent
    Writer
      data: writes thing

  @arcId('readArcId')
  recipe ReadingRecipe
    data: map 'my-handle-id'
    Reader
      data: reads data`);
    const resolver = new AllocatorRecipeResolver(manifest, randomSalt);
    await assertThrowsAsync(
      async () => resolver.resolve(),
      AllocatorRecipeResolverError,
      `No matching stores found for handle 'my-handle-id' in recipe ReadingRecipe.`
    );
  });
  it('fails to resolve recipes that have an ambiguous mapping to handles', async () => {
    const manifest = await Manifest.parse(`\
  particle Reader
    data: reads Thing {name: Text}

  particle Writer
     data: writes Thing {name: Text}

  @arcId('writeArcId')
  recipe WritingRecipe
    thing: create 'my-handle-id' @persistent
    Writer
      data: writes thing

  @arcId('writeArcId2')
  recipe WritingRecipe2
    thing: create 'my-handle-id' @persistent
    Writer
      data: writes thing

  @arcId('readArcId')
  recipe ReadingRecipe
    data: map 'my-handle-id'
    Reader
      data: reads data`);

    const resolver = new AllocatorRecipeResolver(manifest, randomSalt);
    await assertThrowsAsync(
      async () => resolver.resolve(),
      AllocatorRecipeResolverError,
      `More than one handle created with id 'my-handle-id'.`
    );
  });
  it('does not create storage keys for create handles with no IDs', async () => {
    const manifest = await Manifest.parse(`\
  particle Writer
     data: writes Thing {name: Text}

  @arcId('writeArcId')
  recipe WritingRecipe
    thing: create 'my-handle-id' @persistent
    thing2: create @persistent
    Writer
      data: writes thing
    Writer
      data: writes thing2`);

    const resolver = new AllocatorRecipeResolver(manifest, randomSalt);
    const recipe = (await resolver.resolve())[0];
    const myHandleId = recipe.handles.find(h => h.id === 'my-handle-id');
    assert.equal(myHandleId.storageKey.protocol, PersistentDatabaseStorageKey.protocol);
    const noIdHandle = recipe.handles.find(h => !h.id);
    assert.equal(noIdHandle.storageKey.protocol, CreatableStorageKey.protocol);
  });
  it('resolves queryable create handles', async () => {
    const manifest = await Manifest.parse(`\
  particle Writer
     data: writes Thing {name: Text}

  @arcId('writeArcId')
  recipe WritingRecipe
    thing: create 'my-handle-id' @persistent @queryable
    Writer
      data: writes thing`);

    const resolver = new AllocatorRecipeResolver(manifest, randomSalt);
    const handle = (await resolver.resolve())[0].handles[0];
    assert(handle.storageKey.protocol, PersistentDatabaseStorageKey.protocol);
    assert.equal(handle.type.resolvedType().toString(), 'Thing {}');
  });
  it('resolves writes of collections of entities', async () => {
    const manifest = await Manifest.parse(`\
  particle Writer
     data: writes [Thing {name: Text}]

  @arcId('writeArcId')
  recipe WritingRecipe
    thing: create 'my-handle-id' @persistent
    Writer
      data: thing`);

    const resolver = new AllocatorRecipeResolver(manifest, randomSalt);
    const recipes = await resolver.resolve();
    assert.lengthOf(recipes, 1);
    const handle = recipes[0].handles[0];
    assert.equal(handle.storageKey.protocol, PersistentDatabaseStorageKey.protocol);
    assert.isTrue(handle.type.isResolved());
    assert.equal(handle.type.resolvedType().toString(), '[Thing {}]');
    assert.lengthOf(handle.connections, 1);
    assert.equal(handle.connections[0].type.resolvedType().toString(), '[Thing {name: Text}]');
  });
  it('fails if there is no matching writing handle found', async () => {
    const manifest = await Manifest.parse(`\
    particle Reader
      data: reads Thing {name: Text}

    recipe ReadingRecipe
      data: map 'my-handle-id'
      Reader
        data: reads data`);
      const resolver = new AllocatorRecipeResolver(manifest, randomSalt);
      await assertThrowsAsync(
        async () => resolver.resolve(),
        AllocatorRecipeResolverError,
        `No matching stores found for handle 'my-handle-id' in recipe ReadingRecipe.`
      );
  });
  it('fails to resolve when user maps to a volatile create handle', Flags.withDefaultReferenceMode(async () => {
    const manifest = await Manifest.parse(`\
  particle Reader
    data: reads Thing {name: Text}

  particle Writer
     data: writes Thing {name: Text}

  @arcId('writeArcId')
  recipe WritingRecipe
    thing: create 'my-handle-id'
    Writer
      data: writes thing

  recipe ReadingRecipe
    data: map 'my-handle-id'
    Reader
      data: reads data`);

    const resolver = new AllocatorRecipeResolver(manifest, randomSalt);
    await assertThrowsAsync(
      async () => resolver.resolve(),
      AllocatorRecipeResolverError,
      `No matching stores found for handle 'my-handle-id' in recipe ReadingRecipe.`);
  }));
  it('resolves joining mapped handles and reading tuples of data', Flags.withDefaultReferenceMode(async () => {
    const manifest = await Manifest.parse(`\
  particle Writer
    products: writes [Product {name: Text}]
    manufacturers: writes [Manufacturer {address: Text}]

  particle Reader
    data: reads [(
      Product {name: Text},
      Manufacturer {address: Text}
    )]

  @arcId('write-data-for-join')
  recipe WriteData
    products: create 'products' @persistent
    manufacturers: create 'manufacturers' @persistent
    Writer
      products: products
      manufacturers: manufacturers

  recipe ReadJoin
    products: map 'products'
    manufacturers: map 'manufacturers'
    data: join (products, manufacturers)

    Reader
      data: data`);

    const resolver = new AllocatorRecipeResolver(manifest, randomSalt);
    for (const recipe of (await resolver.resolve())) {
      for (const handle of recipe.handles) {
        if (handle.fate === 'join') continue;
        assert.isTrue(!!handle.storageKey, `Missing storage key of handle ${handle.id} in recipe ${recipe.name}`);
        assert.isTrue(handle.type.isResolved(), `Unresolved handle ${handle.id} in recipe ${recipe.name}`);
        assert.isTrue(handle.connections.every(conn => conn.type.isResolved()));
      }
    }
  }));
  it('assigns creatable storage keys', Flags.withDefaultReferenceMode(async () => {
    const manifest = await Manifest.parse(`\
  particle Reader
    data: reads Thing {name: Text}

  particle Writer
     data: writes Thing {name: Text}

  recipe
    thing: create
    Writer
      data: thing
    Reader
      data: thing`);

    const resolver = new AllocatorRecipeResolver(manifest, randomSalt);
    const [recipe] = await resolver.resolve();
    assert.equal(
      recipe.handles[0].storageKey.toString(),
      'create://67835270998a62139f8b366f1cb545fb9b72a90b'
    );
  }));
  it('creates a creatable storage keys with hadle capabilities', async () => {
    const manifest = await Manifest.parse(`
   particle A
     data: writes Thing {num: Number}

   recipe R
     h0: create @persistent
     h1: create #test
     h2: create #test2 @tiedToArc @queryable
     h3: create #test2 @tiedToRuntime @queryable
     h4: create #test2 @queryable
     h5: create #test2 @ttl('1d')
     A
       data: writes h0
     A
       data: writes h1
     A
       data: writes h2
     A
       data: writes h3
     A
       data: writes h4
     A
       data: writes h5
    `);

    const resolver = new AllocatorRecipeResolver(manifest, randomSalt);
    const [recipe] = await resolver.resolve();

    assert.isTrue(recipe.handles.every(h => h.storageKey.protocol === 'create'));
    assert.deepEqual(recipe.handles.map(h => h.annotations.map(a => a.toString())), [
      ['@persistent'],
      [],
      ['@tiedToArc', '@queryable'],
      ['@tiedToRuntime', '@queryable'],
      ['@queryable'],
      ['@ttl(value: \'1d\')']
    ]);
  });
  it('resolves the type for a generic read from a mapped store', async () => {
    const manifest = await Manifest.parse(`
      particle Writer
        data: writes [Thing {name: Text}]

      particle Reader
        data: reads [~a]

      @arcId('writeArcId')
      recipe WritingRecipe
        thing: create 'my-handle-id' @persistent
        Writer
          data: writes thing

      recipe ReadingRecipe
        data: map 'my-handle-id'
        Reader
          data: reads data`);

    const resolver = new AllocatorRecipeResolver(manifest, randomSalt);
    const recipes = await resolver.resolve();
    const readingRecipe = recipes.find(r => r.name === 'ReadingRecipe');
    const readingConnection = readingRecipe.particles[0].connections['data'];
    assert.isTrue(readingConnection.type.isResolved());
    assert.equal(readingConnection.type.resolvedType().toString(), '[* {}]');
    assert.equal(readingConnection.handle.type.resolvedType().toString(), '[Thing {}]');

    const writingRecipe = recipes.find(r => r.name === 'WritingRecipe');
    const writingConnection = writingRecipe.particles[0].connections['data'];
    assert.isTrue(writingConnection.type.isResolved());
    assert.equal(writingConnection.type.resolvedType().toString(), '[Thing {name: Text}]');
    assert.equal(writingConnection.handle.type.resolvedType().toString(), '[Thing {}]');
  });
  it('resolves the type for a generic read from a store in the same recipe', async () => {
    const manifest = await Manifest.parse(`
      particle Writer
        data: writes [Thing {name: Text}]
      particle Reader
        data: reads [~a]
      @arcId('writeArcId')
      recipe WritingRecipe
        thing: create 'my-handle-id' @persistent
        Writer
          data: writes thing
        Reader
          data: reads thing`);

    const resolver = new AllocatorRecipeResolver(manifest, randomSalt);
    const recipe = (await resolver.resolve())[0];
    const readingConnection = recipe.particles.find(p => p.name === 'Reader').connections['data'];
    assert.isTrue(readingConnection.type.isResolved());
    assert.equal(readingConnection.type.resolvedType().toString(), '[Thing {}]');
    assert.equal(readingConnection.handle.type.resolvedType().toString(), '[Thing {}]');

    const writingConnection = recipe.particles.find(p => p.name === 'Writer').connections['data'];
    assert.isTrue(writingConnection.type.isResolved());
    assert.equal(writingConnection.type.resolvedType().toString(), '[Thing {name: Text}]');
    assert.equal(writingConnection.handle.type.resolvedType().toString(), '[Thing {}]');
  });
  it('resolves the type for a generic with star read from a mapped store', async () => {
    const manifest = await Manifest.parse(`
      particle Writer
        data: writes [Thing {name: Text}]

      particle Reader
        data: reads [~a with {name: Text}]

      @arcId('writeArcId')
      recipe WritingRecipe
        thing: create 'my-handle-id' @persistent
        Writer
          data: writes thing

      recipe ReadingRecipe
        data: map 'my-handle-id'
        Reader
          data: reads data`);

    const resolver = new AllocatorRecipeResolver(manifest, randomSalt);
    const recipes = await resolver.resolve();
    const readingRecipe = recipes.find(r => r.name === 'ReadingRecipe');
    const readingConnection = readingRecipe.particles[0].connections['data'];
    assert.isTrue(readingConnection.type.isResolved());
    assert.equal(readingConnection.type.resolvedType().toString(), '[* {name: Text}]');
  });
  it('fails resolving recipe reader handle type bigger that writer', async () => {
    const manifest = await Manifest.parse(`
      particle Writer
        thing: writes [Thing {a: Text}]
      @arcId('writerArcId')
      recipe WriterRecipe
        thing: create 'my-things' @persistent
        Writer
          thing: thing
      particle Reader
        thing: reads [Thing {a: Text, b: Text}]
      recipe ReaderRecipe
        thing: map 'my-things'
        Reader
          thing: thing
    `);
    const resolver = new AllocatorRecipeResolver(manifest, randomSalt);
    await assertThrowsAsync(
      async () => resolver.resolve(),
      `Cannot restrict type ranges of [undefined - Thing {a: Text}] and [Thing {a: Text, b: Text} - undefined]`);
  });
  it('fails to resolve recipe handle with fate copy', async () => {
    const manifest = await Manifest.parse(`
      store ThingsStore of [Thing {name: Text}] 'my-things' in ThingsJson
      resource ThingsJson
        start
        [{}]
      particle Reader
        data: reads [Thing {name: Text}]
      recipe ReaderRecipe
        thing: copy 'my-things'
        Reader
          data: thing`, {memoryProvider: new TestVolatileMemoryProvider()});
    const resolver = new AllocatorRecipeResolver(manifest, randomSalt);
    await assertThrowsAsync(
      async () => resolver.resolve(),
      AllocatorRecipeResolverError,
      `Recipe ReaderRecipe has a handle with unsupported 'copy' fate.`);
  });
  it('resolves mapped manifest store', async () => {
    const manifest = await Manifest.parse(`
      store ThingsStore of [Thing {name: Text}] 'my-things' in ThingsJson
      resource ThingsJson
        start
        [{}]

      particle Reader
        data: reads [Thing {name: Text}]

      @arcId('readerArcId')
      recipe ReaderRecipe
        thing: map 'my-things'
        Reader
          data: thing

      recipe EphemeralReaderRecipe
        thing: map 'my-things'
        Reader
          data: thing`, {memoryProvider: new TestVolatileMemoryProvider()});
    const resolver = new AllocatorRecipeResolver(manifest, randomSalt);
    const recipes = await resolver.resolve();
    assert.lengthOf(recipes, 2);
    assert.isTrue(recipes.every(r => r.handles[0].storageKey === manifest.stores[0].storageKey));
  });
});
describe('allocator recipe resolver - ingress restricting', () => {
  afterEach(() => Runtime.resetDrivers());
  const particleSpec = `
particle Writer
  thing: writes Thing {a: Text, b: Text, c: Text, d: Text, e: Text}
particle ReaderA
  thing: reads Thing {a: Text}
particle ReaderAC
  thing: reads Thing {a: Text, c: Text}
particle ReaderAD
  thing: reads Thing {a: Text, d: Text}
particle ReaderB
  thing: reads Thing {b: Text}`;
  const particleSpecWithCollection = `
particle Writer
  thing: writes [Thing {a: Text, b: Text, c: Text, d: Text, e: Text}]
particle ReaderA
  thing: reads [Thing {a: Text}]
particle ReaderAC
  thing: reads [Thing {a: Text, c: Text}]
particle ReaderAD
  thing: reads [Thing {a: Text, d: Text}]
particle ReaderB
  thing: reads [Thing {b: Text}]`;
  const particleSpecWithReferences = `
particle Writer
  thing: writes &Thing {a: Text, b: Text, c: Text, d: Text, e: Text}
particle ReaderA
  thing: reads &Thing {a: Text}
particle ReaderAC
  thing: reads &Thing {a: Text, c: Text}
particle ReaderAD
  thing: reads &Thing {a: Text, d: Text}
particle ReaderB
  thing: reads &Thing {b: Text}`;
  const particleSpecWithReferencesCollections = `
particle Writer
  thing: writes [&Thing {a: Text, b: Text, c: Text, d: Text, e: Text}]
particle ReaderA
  thing: reads [&Thing {a: Text}]
particle ReaderAC
  thing: reads [&Thing {a: Text, c: Text}]
particle ReaderAD
  thing: reads [&Thing {a: Text, d: Text}]
particle ReaderB
  thing: reads [&Thing {b: Text}]`;
  const particleSpecWithLists = `
particle Writer
  thing: writes Thing {a: List<Text>, b: List<Text>, c: List<Text>, d: List<Text>, e: List<Text>}
particle ReaderA
  thing: reads Thing {a: List<Text>}
particle ReaderAC
  thing: reads Thing {a: List<Text>, c: List<Text>}
particle ReaderAD
  thing: reads Thing {a: List<Text>, d: List<Text>}
particle ReaderB
  thing: reads Thing {b: List<Text>}`;
  const particleSpecWithInlines = `
particle Writer
  thing: writes Thing {foo: inline Foo {a: Text, b: Text, c: Text, d: Text, e: Text}, bar: Text}
particle ReaderA
  thing: reads Thing {foo: inline Foo {a: Text}}
particle ReaderAC
  thing: reads Thing {foo: inline Foo {a: Text, c: Text}}
particle ReaderAD
  thing: reads Thing {foo: inline Foo {a: Text, d: Text}, bar: Text}
particle ReaderB
  thing: reads Thing {foo: inline Foo {b: Text}}`;
  const particleSpecWithListOfInlines = `
particle Writer
  thing: writes Thing {foo: List<inline Foo {a: Text, b: Text, c: Text, d: Text, e: Text}>}
particle ReaderA
  thing: reads Thing {foo: List<inline Foo {a: Text}>}
particle ReaderAC
  thing: reads Thing {foo: List<inline Foo {a: Text, c: Text}>}
particle ReaderAD
  thing: reads Thing {foo: List<inline Foo {a: Text, d: Text}>}
particle ReaderB
  thing: reads Thing {foo: List<inline Foo {b: Text}>}`;
  const particleSpecWithTuples = `
particle Writer
  thing: writes Thing {a: (Text, Number), b: [(Text, Number)], c: List<(Text, Number)>, d: (Text, Number), e: (Text, Number)}
particle ReaderA
  thing: reads Thing {a: (Text, Number)}
particle ReaderAC
  thing: reads Thing {a: (Text, Number), c: List<(Text, Number)>}
particle ReaderAD
  thing: reads Thing {a: (Text, Number), d: (Text, Number)}
particle ReaderB
  thing: reads Thing {b: [(Text, Number)]}`;

  const verifyWritingRecipe = async (manifestStr: string, expectedSchema: string) => {
    const manifest = await Manifest.parse(manifestStr);
    const resolver = new AllocatorRecipeResolver(manifest, randomSalt);
    const recipes = await resolver.resolve();
    const writingRecipe = recipes.find(recipe => recipe.name === 'WritingRecipe');
    assert.equal(writingRecipe.handles[0].type.resolvedType().toString(), expectedSchema);
    Runtime.resetDrivers();
  };

  it('restricts writer fields by one writer-reader recipe', async () => {
    const recipe = `
@arcId('writeArcId')
recipe WritingRecipe
  thing: create 'my-handle-id' @persistent
  Writer
    thing: writes thing
  ReaderA
    thing: reads thing
  ReaderB
    thing: reads thing
    `;
    await verifyWritingRecipe(`
      ${particleSpec}
      ${recipe}
    `, 'Thing {a: Text, b: Text}');
    await verifyWritingRecipe(`
      ${particleSpecWithCollection}
      ${recipe}
    `, '[Thing {a: Text, b: Text}]');
    await verifyWritingRecipe(`
      ${particleSpecWithReferences}
      ${recipe}
    `, '&Thing {a: Text, b: Text}');
    await verifyWritingRecipe(`
      ${particleSpecWithReferencesCollections}
      ${recipe}
    `, '[&Thing {a: Text, b: Text}]');
    await verifyWritingRecipe(`
      ${particleSpecWithInlines}
      ${recipe}
    `, 'Thing {foo: inline Foo {a: Text, b: Text}}');
    await verifyWritingRecipe(`
      ${particleSpecWithLists}
      ${recipe}
    `, 'Thing {a: List<Text>, b: List<Text>}');
    await verifyWritingRecipe(`
      ${particleSpecWithListOfInlines}
      ${recipe}
    `, 'Thing {foo: List<inline Foo {a: Text, b: Text}>}');
    await verifyWritingRecipe(`
      ${particleSpecWithTuples}
      ${recipe}
    `, 'Thing {a: (Text, Number), b: [(Text, Number)]}');
  });

  it('restricts writer fields by reader recipe with one particle one field', async () => {
    const recipe = `
@arcId('writeArcId')
recipe WritingRecipe
  thing: create 'my-handle-id' @persistent
  Writer
    thing: writes thing

recipe ReadingRecipeB
  thing: map 'my-handle-id'
  ReaderA
    thing: reads thing
    `;
    await verifyWritingRecipe(`
      ${particleSpec}
      ${recipe}
    `, 'Thing {a: Text}');
    await verifyWritingRecipe(`
      ${particleSpecWithCollection}
      ${recipe}
    `, '[Thing {a: Text}]');
    await verifyWritingRecipe(`
      ${particleSpecWithReferences}
      ${recipe}
      `, '&Thing {a: Text}');
    await verifyWritingRecipe(`
      ${particleSpecWithReferencesCollections}
      ${recipe}
    `, '[&Thing {a: Text}]');
    await verifyWritingRecipe(`
      ${particleSpecWithInlines}
      ${recipe}
    `, 'Thing {foo: inline Foo {a: Text}}');
    await verifyWritingRecipe(`
      ${particleSpecWithLists}
      ${recipe}
    `, 'Thing {a: List<Text>}');
    await verifyWritingRecipe(`
      ${particleSpecWithListOfInlines}
      ${recipe}
    `, 'Thing {foo: List<inline Foo {a: Text}>}');
    await verifyWritingRecipe(`
      ${particleSpecWithTuples}
      ${recipe}
    `, 'Thing {a: (Text, Number)}');
  });

  it('restricts writer fields by reader recipe with two particles', async () => {
    const recipe = `
@arcId('writeArcId')
recipe WritingRecipe
  thing: create 'my-handle-id' @persistent
  Writer
    thing: writes thing

recipe ReadingRecipeB
  thing: map 'my-handle-id'
  ReaderA
    thing: reads thing
  ReaderB
    thing: reads thing
    `;
    await verifyWritingRecipe(`
      ${particleSpec}
      ${recipe}
    `, 'Thing {a: Text, b: Text}');
    await verifyWritingRecipe(`
      ${particleSpecWithCollection}
      ${recipe}
    `, '[Thing {a: Text, b: Text}]');
    await verifyWritingRecipe(`
      ${particleSpecWithReferences}
      ${recipe}
      `, '&Thing {a: Text, b: Text}');
    await verifyWritingRecipe(`
      ${particleSpecWithReferencesCollections}
      ${recipe}
    `, '[&Thing {a: Text, b: Text}]');
    await verifyWritingRecipe(`
      ${particleSpecWithInlines}
      ${recipe}
    `, 'Thing {foo: inline Foo {a: Text, b: Text}}');
    await verifyWritingRecipe(`
      ${particleSpecWithLists}
      ${recipe}
    `, 'Thing {a: List<Text>, b: List<Text>}');
    await verifyWritingRecipe(`
      ${particleSpecWithListOfInlines}
      ${recipe}
    `, 'Thing {foo: List<inline Foo {a: Text, b: Text}>}');
    await verifyWritingRecipe(`
      ${particleSpecWithTuples}
      ${recipe}
    `, 'Thing {a: (Text, Number), b: [(Text, Number)]}');

  });

  it('restricts writer fields by long-running reader recipe with two particles', async () => {
    const recipe = `
@arcId('writeArcId')
recipe WritingRecipe
  thing: create 'my-handle-id' @persistent
  Writer
    thing: writes thing

@arcId('readArcId')
recipe ReadingRecipeB
  thing: map 'my-handle-id'
  ReaderA
    thing: reads thing
  ReaderB
    thing: reads thing
    `;
    await verifyWritingRecipe(`
      ${particleSpec}
      ${recipe}
    `, 'Thing {a: Text, b: Text}');
    await verifyWritingRecipe(`
      ${particleSpecWithCollection}
      ${recipe}
    `, '[Thing {a: Text, b: Text}]');
    await verifyWritingRecipe(`
      ${particleSpecWithReferences}
      ${recipe}
      `, '&Thing {a: Text, b: Text}');
    await verifyWritingRecipe(`
      ${particleSpecWithReferencesCollections}
      ${recipe}
    `, '[&Thing {a: Text, b: Text}]');
    await verifyWritingRecipe(`
      ${particleSpecWithInlines}
      ${recipe}
    `, 'Thing {foo: inline Foo {a: Text, b: Text}}');
    await verifyWritingRecipe(`
      ${particleSpecWithLists}
      ${recipe}
    `, 'Thing {a: List<Text>, b: List<Text>}');
    await verifyWritingRecipe(`
      ${particleSpecWithListOfInlines}
      ${recipe}
    `, 'Thing {foo: List<inline Foo {a: Text, b: Text}>}');
    await verifyWritingRecipe(`
      ${particleSpecWithTuples}
      ${recipe}
    `, 'Thing {a: (Text, Number), b: [(Text, Number)]}');
  });

  it('restricts writer fields by same single field reader particles', async () => {
    const recipe = `
@arcId('writeArcId')
recipe WritingRecipe
  thing: create 'my-handle-id' @persistent
  Writer
    thing: writes thing

@arcId('readBArcId')
recipe ReadingRecipeB1
  thing: map 'my-handle-id'
  ReaderB
    thing: reads thing

recipe ReadingRecipeB2
  thing: map 'my-handle-id'
  ReaderB
    thing: reads thing
    `;
    await verifyWritingRecipe(`
      ${particleSpec}
      ${recipe}
    `, 'Thing {b: Text}');
    await verifyWritingRecipe(`
      ${particleSpecWithCollection}
      ${recipe}
    `, '[Thing {b: Text}]');
    await verifyWritingRecipe(`
      ${particleSpecWithReferences}
      ${recipe}
      `, '&Thing {b: Text}');
    await verifyWritingRecipe(`
      ${particleSpecWithReferencesCollections}
      ${recipe}
    `, '[&Thing {b: Text}]');
    await verifyWritingRecipe(`
      ${particleSpecWithInlines}
      ${recipe}
    `, 'Thing {foo: inline Foo {b: Text}}');
    await verifyWritingRecipe(`
      ${particleSpecWithLists}
      ${recipe}
    `, 'Thing {b: List<Text>}');
    await verifyWritingRecipe(`
      ${particleSpecWithListOfInlines}
      ${recipe}
    `, 'Thing {foo: List<inline Foo {b: Text}>}');
    await verifyWritingRecipe(`
      ${particleSpecWithTuples}
      ${recipe}
    `, 'Thing {b: [(Text, Number)]}');
  });

  it('restricts writer fields by reader particles in both - writer recipe and separate recipe', async () => {
    const recipe = `
@arcId('writeArcId')
recipe WritingRecipe
  thing: create 'my-handle-id' @persistent
  Writer
    thing: writes thing
  ReaderAC
    thing: reads thing

recipe ReadingRecipeB
  thing: map 'my-handle-id'
  ReaderB
    thing: reads thing
    `;
    await verifyWritingRecipe(`
      ${particleSpec}
      ${recipe}
    `, 'Thing {a: Text, c: Text, b: Text}');
    await verifyWritingRecipe(`
      ${particleSpecWithCollection}
      ${recipe}
    `, '[Thing {a: Text, c: Text, b: Text}]');
    await verifyWritingRecipe(`
      ${particleSpecWithReferences}
      ${recipe}
      `, '&Thing {a: Text, c: Text, b: Text}');
    await verifyWritingRecipe(`
      ${particleSpecWithReferencesCollections}
      ${recipe}
    `, '[&Thing {a: Text, c: Text, b: Text}]');
    await verifyWritingRecipe(`
      ${particleSpecWithInlines}
      ${recipe}
    `, 'Thing {foo: inline Foo {a: Text, c: Text, b: Text}}');
    await verifyWritingRecipe(`
      ${particleSpecWithLists}
      ${recipe}
    `, 'Thing {a: List<Text>, c: List<Text>, b: List<Text>}');
    await verifyWritingRecipe(`
      ${particleSpecWithListOfInlines}
      ${recipe}
    `, 'Thing {foo: List<inline Foo {a: Text, c: Text, b: Text}>}');
    await verifyWritingRecipe(`
      ${particleSpecWithTuples}
      ${recipe}
    `, 'Thing {a: (Text, Number), c: List<(Text, Number)>, b: [(Text, Number)]}');
  });

  it('restricts writer fields by reader particles in both - long running and ephemeral recipes', async () => {
    const recipe = `
@arcId('writeArcId')
recipe WritingRecipe
  thing: create 'my-handle-id' @persistent
  Writer
    thing: writes thing

@arcId('readArcId')
recipe ReadingRecipeA
  thing: map 'my-handle-id'
  ReaderA
    thing: reads thing

recipe ReadingRecipeB
  thing: map 'my-handle-id'
  ReaderB
    thing: reads thing
    `;
    await verifyWritingRecipe(`
      ${particleSpec}
      ${recipe}
    `, 'Thing {a: Text, b: Text}');
    await verifyWritingRecipe(`
      ${particleSpecWithCollection}
      ${recipe}
    `, '[Thing {a: Text, b: Text}]');
    await verifyWritingRecipe(`
      ${particleSpecWithReferences}
      ${recipe}
      `, '&Thing {a: Text, b: Text}');
    await verifyWritingRecipe(`
      ${particleSpecWithReferencesCollections}
      ${recipe}
    `, '[&Thing {a: Text, b: Text}]');
    await verifyWritingRecipe(`
      ${particleSpecWithInlines}
      ${recipe}
    `, 'Thing {foo: inline Foo {a: Text, b: Text}}');
    await verifyWritingRecipe(`
      ${particleSpecWithLists}
      ${recipe}
    `, 'Thing {a: List<Text>, b: List<Text>}');
    await verifyWritingRecipe(`
      ${particleSpecWithListOfInlines}
      ${recipe}
    `, 'Thing {foo: List<inline Foo {a: Text, b: Text}>}');
    await verifyWritingRecipe(`
      ${particleSpecWithTuples}
      ${recipe}
    `, 'Thing {a: (Text, Number), b: [(Text, Number)]}');
  });

  it('restricts writer fields by multi-field reader particles', async () => {
    const recipe = `
@arcId('writeArcId')
recipe WritingRecipe
  thing: create 'my-handle-id' @persistent
  Writer
    thing: writes thing

@arcId('readArcId')
recipe ReadingRecipeA
  thing: map 'my-handle-id'
  ReaderAC
    thing: reads thing

recipe ReadingRecipeB
  thing: map 'my-handle-id'
  ReaderB
    thing: reads thing

recipe ReadingRecipeAD
  thing: map 'my-handle-id'
  ReaderAD
    thing: reads thing
    `;
    await verifyWritingRecipe(`
      ${particleSpec}
      ${recipe}
    `, 'Thing {a: Text, c: Text, b: Text, d: Text}');
    await verifyWritingRecipe(`
      ${particleSpecWithCollection}
      ${recipe}
    `, '[Thing {a: Text, c: Text, b: Text, d: Text}]');
    await verifyWritingRecipe(`
      ${particleSpecWithReferences}
      ${recipe}
    `, '&Thing {a: Text, c: Text, b: Text, d: Text}');
    await verifyWritingRecipe(`
      ${particleSpecWithReferencesCollections}
      ${recipe}
    `, '[&Thing {a: Text, c: Text, b: Text, d: Text}]');
    await verifyWritingRecipe(`
      ${particleSpecWithInlines}
      ${recipe}
    `, 'Thing {foo: inline Foo {a: Text, c: Text, b: Text, d: Text}, bar: Text}');
    await verifyWritingRecipe(`
      ${particleSpecWithLists}
      ${recipe}
    `, 'Thing {a: List<Text>, c: List<Text>, b: List<Text>, d: List<Text>}');
    await verifyWritingRecipe(`
      ${particleSpecWithListOfInlines}
      ${recipe}
    `, 'Thing {foo: List<inline Foo {a: Text, c: Text, b: Text, d: Text}>}');
    await verifyWritingRecipe(`
      ${particleSpecWithTuples}
      ${recipe}
    `, 'Thing {a: (Text, Number), c: List<(Text, Number)>, b: [(Text, Number)], d: (Text, Number)}');
  });
  it('restricts handle types according to policies', async () => {
    const schemaString = `
schema Thing
  a: Text
  b: Text
  c: Text
  d: Text
  e: Text`;
    const policiesManifestStr = `
${schemaString}
policy Policy0 {
  @allowedRetention(medium: 'Ram', encryption: false)
  @maxAge('10d')
  from Thing access { a }
}
policy Policy1 {
  @allowedRetention(medium: 'Ram', encryption: true)
  @maxAge('5d')
  from Thing access { b, c }
}`;
    const manifest = await Manifest.parse(`
${schemaString}
particle Writer
  things: writes [Thing {a, b, c, d}]
particle Reader
  things: reads [Thing {a, b}]
recipe ThingWriter
  handle0: create 'my-things' @ttl('3d') @inMemory @encrypted
  Writer
    things: handle0
  Reader
    things: handle0`);
    const policiesManifest = await Manifest.parse(policiesManifestStr);
    const resolver = new AllocatorRecipeResolver(manifest, randomSalt, policiesManifest);
    const recipes = await resolver.resolve();
    const writer = recipes[0].particles.find(p => p.name === 'Writer');
    assert.deepEqual(Object.keys(writer.connections['things'].type.getEntitySchema().fields), ['a', 'b', 'c', 'd']);
    const reader = recipes[0].particles.find(p => p.name === 'Reader');
    assert.deepEqual(Object.keys(reader.connections['things'].type.getEntitySchema().fields), ['a', 'b']);
    const handle = recipes[0].handles[0];
    assert.deepEqual(Object.keys(handle.type.getEntitySchema().fields), ['a', 'b']);
    assert.equal(handle.getTtl().toDebugString(), '3d');
    assert.isTrue(handle.capabilities.isEncrypted());
  });

  it('restricts handle types with inline entities according to policies', async () => {
    const schemaString = `
schema Location
  coarse: Text
  fine: Text

schema ThingDesc
  name: Text
  desc: Text
  weight: Number
  location: inline Location

schema AnotherDesc
  name: Text
  secret: Text

schema Thing
  a: inline ThingDesc
  b: List<inline AnotherDesc>
  c: Text
  d: Text
  e: Text`;
    const policiesManifestStr = `
${schemaString}
policy Policy0 {
  @allowedRetention(medium: 'Ram', encryption: false)
  @maxAge('10d')
  from Thing access {
    a {
      name,
      desc
    }
  }
}
policy Policy1 {
  @allowedRetention(medium: 'Ram', encryption: true)
  @maxAge('5d')
  from Thing access {
    a {
      weight
    }
    b {
      name
    },
    c
  }
}
policy Policy2 {
  @allowedRetention(medium: 'Ram', encryption: true)
  @maxAge('5d')
  from Thing access {
    a {
      location { coarse }
    }
  }
}`;
    const manifest = await Manifest.parse(`
${schemaString}
particle Writer
  things: writes [Thing {a, b, c, d}]
particle Reader
  things: reads [Thing {a: inline ThingDesc {name, weight, location: inline Location {coarse}}, b: List<inline AnotherDesc {name}>}]
recipe ThingWriter
  handle0: create 'my-things' @ttl('3d') @inMemory @encrypted
  Writer
    things: handle0
  Reader
    things: handle0`);
    const policiesManifest = await Manifest.parse(policiesManifestStr);
    const resolver = new AllocatorRecipeResolver(manifest, randomSalt, policiesManifest);
    const recipes = await resolver.resolve();
    const writer = recipes[0].particles.find(p => p.name === 'Writer');
    const writerFields = writer.connections['things'].type.getEntitySchema().fields;
    assert.deepEqual(Object.keys(writerFields), ['a', 'b', 'c', 'd']);
    // Check that writer type has all the fields mentioned.
    const writerAFields = writerFields['a'].getEntityType().getEntitySchema().fields;
    assert.deepEqual(
      Object.keys(writerAFields),
      ['name', 'desc', 'weight', 'location']);
    assert.deepEqual(
      Object.keys(writerAFields['location'].getEntityType().getEntitySchema().fields),
      ['coarse', 'fine']
    );
    assert.deepEqual(
      Object.keys(writerFields['b'].getEntityType().getEntitySchema().fields),
      ['name', 'secret']);
    const reader = recipes[0].particles.find(p => p.name === 'Reader');
    assert.deepEqual(Object.keys(reader.connections['things'].type.getEntitySchema().fields), ['a', 'b']);
    const handle = recipes[0].handles[0];
    // CHeck that the handle fields are only those that are allowed by policy.
    const handleFields = handle.type.getEntitySchema().fields;
    assert.deepEqual(Object.keys(handleFields), ['a', 'b']);
    const handleAFields = handleFields['a'].getEntityType().getEntitySchema().fields;
    // TODO(b/168040363): Field `desc` should be written, but it won't be unless there
    // are phantom readers.
    assert.deepEqual(
      Object.keys(handleAFields),
      ['name', 'weight', 'location']);
    assert.deepEqual(
      Object.keys(handleAFields['location'].getEntityType().getEntitySchema().fields),
      ['coarse']
    );
    assert.deepEqual(
      Object.keys(handleFields['b'].getEntityType().getEntitySchema().fields),
      ['name']);
    assert.equal(handle.getTtl().toDebugString(), '3d');
    assert.isTrue(handle.capabilities.isEncrypted());
  });

});
