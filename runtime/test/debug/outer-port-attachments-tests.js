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
import * as util from '../../ts-build/testing/test-util.js';
import {StubLoader} from '../../testing/stub-loader.js';
import {DevtoolsForTests} from '../../debug/devtools-connection.js';
import {Random} from '../../ts-build/random.js';
import {TestHelper} from '../../testing/test-helper.js';

describe('OuterPortAttachment', function() {
  before(() => DevtoolsForTests.ensureStub());
  after(() => DevtoolsForTests.reset());
  it('produces dataflow messages on devtools channel', async () => {
    Random.seedForTests();
    const testHelper = await TestHelper.create({
      manifestString: `
        schema Foo
          Text value
        particle P in 'p.js'
          inout Foo foo
        recipe
          use as foo
          P
            foo = foo`,
      loader: new StubLoader({
        'p.js': `defineParticle(({Particle}) => class P extends Particle {
          async setHandles(handles) {
            let foo = handles.get('foo');
            foo.set(new foo.entityClass({value: 'FooBar'}));
          }
        });`
      })
    });
    const arc = testHelper.arc;

    const Foo = arc._context.findSchemaByName('Foo').entityClass();
    const fooStore = await arc.createStore(Foo.type, undefined, 'fooStore');

    const recipe = arc._context.recipes[0];
    recipe.handles[0].mapToStorage(fooStore);
    recipe.normalize();
    await arc.instantiate(recipe);

    const instantiateParticleCall = DevtoolsForTests.channel.messages.find(m =>
        m.messageType === 'InstantiateParticle').messageBody;
    // IDs are stable thanks to Random.seedForTests().
    assert.deepEqual(instantiateParticleCall, {
      arcId: '!158405822139616:demo',
      speculative: false,
      id: '!158405822139616:demo:particle1',
      name: 'P',
      connections: {
        foo: {
          direction: 'inout',
          id: 'fooStore',
          storageKey: 'volatile://!158405822139616:demo^^volatile-0',
          type: 'Foo'
        },
      },
      implFile: 'p.js'
    });

    await util.assertSingletonWillChangeTo(arc, fooStore, 'value', 'FooBar');
    const dateflowSetCall = DevtoolsForTests.channel.messages.find(m =>
        m.messageType === 'dataflow' &&
        m.messageBody.operation === 'set').messageBody;

    assert.approximately(dateflowSetCall.timestamp, Date.now(), 2000);
    delete dateflowSetCall.timestamp; // This bit we don't want to assert on.

    assert.deepEqual(dateflowSetCall, {
      arcId: '!158405822139616:demo',
      speculative: false,
      operation: 'set',
      particle: {
        id: '!158405822139616:demo:particle1',
        name: 'P'
      },
      handle: {
        id: 'fooStore',
        storageKey: 'volatile://!158405822139616:demo^^volatile-0',
        type: 'Foo'
      },
      data: '{"id":"!158405822139616:demo:0:inner:0:0","rawData":{"value":"FooBar"}}',
    });
  });
});
