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
import {SingletonType} from '../../runtime/type.js';
import {singletonHandleForTest, storageKeyPrefixForTest} from '../../runtime/testing/handle-for-test.js';

import {Entity} from '../../runtime/entity.js';
import {Flags} from '../../runtime/flags.js';

describe('ArcStoresFetcher', () => {
  before(() => DevtoolsForTests.ensureStub());
  after(() => DevtoolsForTests.reset());

  it('allows fetching a list of arc stores', Flags.withDefaultReferenceMode(async () => {
    const context = await Manifest.parse(`
      schema Foo
        value: Text`);
    const runtime = new Runtime({context});
    const arc = runtime.newArc('demo', storageKeyPrefixForTest(), {inspectorFactory: devtoolsArcInspectorFactory});

    const foo = Entity.createEntityClass(arc.context.findSchemaByName('Foo'), null);
    const fooStore = await arc.createStore(new SingletonType(foo.type), 'fooStoreName', 'fooStoreId', ['awesome', 'arcs']);
    const fooHandle = await singletonHandleForTest(arc, fooStore);
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
    delete results[0].messageBody.arcStores[0].type.innerType.entitySchema.fields.value.location;

    assert.lengthOf(results[0].messageBody.arcStores, 3);
    // TODO: add contextStores to the test.
    assert.lengthOf(results[0].messageBody.contextStores, 0);

    const sessionId = arc.idGenerator.currentSessionIdForTesting;
    const entityId = '!' + sessionId + ':demo:test-proxy4:5';
    const creationTimestamp = Entity.creationTimestamp(fooEntity);

    const arcStoreFoo = {
      id: 'fooStoreId',
      name: 'fooStoreName',
      tags: ['awesome', 'arcs'],
      storage: fooStore.storageKey,
      type: {
        innerType: {
          tag: 'Entity',
          entitySchema: {
            description: {},
            fields: {
              value: {
                kind: 'schema-primitive',
                refinement: null,
                type: 'Text'
              }
            },
            hashStr: '1c9b8f8d51ff6e11235ac13bf0c5ca74c88537e0',
            names: ['Foo'],
            refinement: null,
          },
        },
        tag: 'Singleton',
      },
      description: undefined,
      value: {id: entityId, creationTimestamp, rawData: {value: 'persistence is useful'}}
    };

    assert.deepEqual(results[0].messageBody.arcStores[0], arcStoreFoo);
    assert.equal(results[0].messageBody.arcStores[1].name, 'fooStoreName_referenceContainer');
    assert.equal(results[0].messageBody.arcStores[2].name, 'fooStoreName_backingStore');
  }));

  it('sends updates on value changes', Flags.withDefaultReferenceMode(async () => {
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
    const arc = runtime.newArc('demo', storageKeyPrefixForTest(), {
      inspectorFactory: devtoolsArcInspectorFactory
    });

    const recipe = arc.context.recipes[0];
    recipe.normalize();
    await arc.instantiate(recipe);

    assert.isEmpty(DevtoolsForTests.channel.messages.filter(
        m => m.messageType === 'store-value-changed'));

    await arc.idle;

    const results = DevtoolsForTests.channel.messages.filter(
        m => m.messageType === 'store-value-changed');
    assert.lengthOf(results, 2);

    const sessionId = arc.idGenerator.currentSessionIdForTesting;
<<<<<<< HEAD
    const store = await arc.findStoreById(arc.activeRecipe.handles[0].id).activate();
    // TODO(mmandlis): there should be a better way!
    const creationTimestamp = Object.values((await store.serializeContents()).values)[0]['value']['creationTimestamp'];
    assert.deepEqual(results[0].messageBody, {
      id: `!${sessionId}:demo:1`,
      value: {
        id: `!${sessionId}:demo:1:3`,
        creationTimestamp,
=======
    assert.sameMembers(Object.keys(results[0].messageBody), ['id', 'value']);
    assert.sameMembers(Object.keys(results[0].messageBody['value']), ['id', 'storageKey', 'version']);
    assert.deepEqual(results[1].messageBody, {
      id: `!${sessionId}:demo:1`,
      value: {
        id: `!${sessionId}:demo:1:5`,
>>>>>>> fix some tests using reference mode stores
        rawData: {
          value: 'FooBar'
        }
      }
    });
  }));
});
