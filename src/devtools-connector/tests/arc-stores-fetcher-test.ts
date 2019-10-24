/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../../platform/chai-web.js';
import {DevtoolsForTests} from '../devtools-connection.js';
import {devtoolsArcInspectorFactory} from '../devtools-arc-inspector.js';
import {FakeSlotComposer} from '../../runtime/testing/fake-slot-composer.js';
import {StubLoader} from '../../runtime/testing/stub-loader.js';
import {Manifest} from '../../runtime/manifest.js';
import {Runtime} from '../../runtime/runtime.js';
import {VolatileSingleton} from '../../runtime/storage/volatile-storage.js';

describe('ArcStoresFetcher', () => {
  before(() => DevtoolsForTests.ensureStub());
  after(() => DevtoolsForTests.reset());

  it('allows fetching a list of arc stores', async () => {
    const context = await Manifest.parse(`
      schema Foo
        Text value`);
    const runtime = new Runtime(new StubLoader({}), FakeSlotComposer, context);
    const arc = runtime.newArc('demo', 'volatile://', {inspectorFactory: devtoolsArcInspectorFactory});

    const foo = arc.context.findSchemaByName('Foo').entityClass();
    const fooStore = await arc.createStore(foo.type, 'fooStoreName', 'fooStoreId', ['awesome', 'arcs']);
    await (fooStore as VolatileSingleton).set({value: 'persistence is useful'});

    assert.isEmpty(DevtoolsForTests.channel.messages.filter(
        m => m.messageType === 'fetch-stores-result'));

    await DevtoolsForTests.channel.receive({
      arcId: arc.id.toString(),
      messageType: 'fetch-stores'
    });

    const results = DevtoolsForTests.channel.messages.filter(
        m => m.messageType === 'fetch-stores-result');
    assert.lengthOf(results, 1);

    // Location in the schema file is stored in the type and used by some tools.
    // We don't assert on it in this test.
    delete results[0].messageBody.arcStores[0].type.entitySchema.fields.value.location;

    assert.deepEqual(results[0].messageBody, {
      arcStores: [{
        id: 'fooStoreId',
        name: 'fooStoreName',
        tags: ['awesome', 'arcs'],
        storage: `volatile://${arc.id.toString()}^^volatile-0`,
        type: {
          tag: 'Entity',
          entitySchema: {
            description: {},
            fields: {
              value: {
                kind: 'schema-primitive',
                type: 'Text'
              }
            },
            names: ['Foo']
          }
        },
        description: undefined,
        value: {
          value: 'persistence is useful'
        }
      }],
      // Context stores from manifests have been moved to a temporary StorageStub implementation,
      // StorageStub does not allow for fetching value. Let's add a test for context store after
      // storage migration is done.
      contextStores: []
    });
  });

  it('sends updates on value changes', async () => {
    const loader = new StubLoader({
      'p.js': `defineParticle(({Particle}) => class P extends Particle {
        async setHandles(handles) {
          let foo = handles.get('foo');
          foo.set(new foo.entityClass({value: 'FooBar'}));
        }
      });`
    });
    const context = await Manifest.parse(`
      schema Foo
        Text value
      particle P in 'p.js'
        inout Foo foo
      recipe
        create as foo
        P
          foo = foo`);
    const runtime = new Runtime(loader, FakeSlotComposer, context);
    const arc = runtime.newArc('demo', 'volatile://', {inspectorFactory: devtoolsArcInspectorFactory});

    const recipe = arc.context.recipes[0];
    recipe.normalize();
    await arc.instantiate(recipe);

    assert.isEmpty(DevtoolsForTests.channel.messages.filter(
        m => m.messageType === 'store-value-changed'));

    await arc.idle;

    const results = DevtoolsForTests.channel.messages.filter(
        m => m.messageType === 'store-value-changed');
    assert.lengthOf(results, 1);

    const sessionId = arc.idGeneratorForTesting.currentSessionIdForTesting;
    assert.deepEqual(results[0].messageBody, {
      id: `!${sessionId}:demo:1`,
      value: {
        id: `!${sessionId}:demo:1:3`,
        rawData: {
          value: 'FooBar'
        }
      }
    });
  });
});
