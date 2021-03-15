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
import {Loader} from '../../platform/loader.js';
import {DevtoolsForTests} from '../devtools-connection.js';
import {devtoolsArcInspectorFactory} from '../devtools-arc-inspector.js';
import {Manifest} from '../../runtime/manifest.js';
import {Runtime} from '../../runtime/runtime.js';
import {SingletonType} from '../../types/lib-types.js';
import {storageKeyPrefixForTest} from '../../runtime/testing/handle-for-test.js';
import {Entity} from '../../runtime/entity.js';
import {ActiveSingletonEntityStore, handleForStoreInfo} from '../../runtime/storage/storage.js';
import {deleteFieldRecursively} from '../../utils/lib-utils.js';

describe('ArcStoresFetcher', () => {
  beforeEach(() => DevtoolsForTests.ensureStub());
  afterEach(() => DevtoolsForTests.reset());

  it('allows fetching a list of arc stores', async () => {
    const context = await Manifest.parse(`
      schema Foo
        value: Text`);
    const runtime = new Runtime({context});
    const arc = runtime.getArcById(runtime.allocator.newArc({arcName: 'demo', storageKeyPrefix: storageKeyPrefixForTest(), inspectorFactory: devtoolsArcInspectorFactory}));

    const foo = Entity.createEntityClass(arc.context.findSchemaByName('Foo'), null);
    const fooStore = await arc.createStore(new SingletonType(foo.type), 'fooStoreName', 'fooStoreId', ['awesome', 'arcs']);
    const fooHandle = await handleForStoreInfo(fooStore, arc);
    const fooEntity = new foo({value: 'persistence is useful'});
    await fooHandle.set(fooEntity);

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
    deleteFieldRecursively(results, 'location');

    const sessionId = arc.idGenerator.currentSessionIdForTesting;
    const entityId = '!' + sessionId + ':fooStoreId:2';
    const creationTimestamp = Entity.creationTimestamp(fooEntity);

    assert.deepEqual(results[0].messageBody, {
      arcStores: [{
        id: 'fooStoreId',
        name: 'fooStoreName',
        tags: ['awesome', 'arcs'],
        storage: fooStore.storageKey,
        type: {
          innerType: {
            tag: 'Entity',
            entitySchema: {
              _annotations: [],
              description: {},
              fields: {
                value: {
                  annotations: [],
                  kind: 'schema-primitive',
                  refinement: null,
                  type: 'Text'
                }
              },
              hashStr: '9c9e5edf9fc9f476d1347c7fea2288cee3a2fdc7',
              names: ['Foo'],
              refinement: null,
            },
          },
          tag: 'Singleton',
        },
        description: undefined,
        value: {id: entityId, creationTimestamp: creationTimestamp.getTime(), rawData: {value: 'persistence is useful'}}
      }],
      // Context stores from manifests have been moved to a temporary StorageStub implementation,
      // StorageStub does not allow for fetching value. Let's add a test for context store after
      // storage migration is done.
      contextStores: []
    });
  });

  it('sends updates on value changes', async () => {
    const loader = new Loader(null, {
      'p.js': `defineParticle(({Particle}) => class P extends Particle {
        async setHandles(handles) {
          let foo = handles.get('foo');
          foo.set(new foo.entityClass({value: 'FooBar'}));
        }
      });`
    });
    const context = await Manifest.parse(`
      schema Foo
        value: Text
      particle P in 'p.js'
        foo: reads writes Foo
      recipe
        foo: create *
        P
          foo: foo`);
    const runtime = new Runtime({loader, context});
    const arc = runtime.getArcById(await runtime.allocator.startArc({
      arcName: 'demo',
      storageKeyPrefix: storageKeyPrefixForTest(),
      inspectorFactory: devtoolsArcInspectorFactory
    }));

    assert.isEmpty(DevtoolsForTests.channel.messages.filter(
        m => m.messageType === 'store-value-changed'));

    await arc.idle;

    const results = DevtoolsForTests.channel.messages.filter(
        m => m.messageType === 'store-value-changed');
    assert.lengthOf(results, 1);

    const sessionId = arc.idGenerator.currentSessionIdForTesting;
    const storeInfo = arc.findStoreById(arc.activeRecipe.handles[0].id);
    const store = await arc.getActiveStore(storeInfo) as ActiveSingletonEntityStore;
    // TODO(mmandlis): there should be a better way!
    const creationTimestamp = Object.values((await store.serializeContents()).values)[0]['value']['creationTimestamp'];
    assert.deepEqual(results[0].messageBody, {
      id: `!${sessionId}:demo:1`,
      value: {
        id: `!${sessionId}:demo:1:3`,
        creationTimestamp,
        rawData: {
          value: 'FooBar'
        }
      }
    });
  });
});
