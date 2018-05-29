/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Manifest} from '../../manifest.js';
import {assert} from '../chai-web.js';
import * as util from '../../testing/test-util.js';
import {Arc} from '../../arc.js';
import {MessageChannel} from '../../message-channel.js';
import {InnerPEC} from '../../inner-PEC.js';
import {StubLoader} from '../../testing/stub-loader.js';
import {getDevtoolsChannel} from '../../debug/devtools-channel-provider.js';
import {Random} from '../../random.js';
import {TestHelper} from '../../testing/test-helper.js';

describe('OuterPortAttachment', function() {
  it('produces dataflow messages on devtools channel', async () => {
    Random.seedForTests();
    let devtoolsChannelStub = getDevtoolsChannel({useStub: true});
    const testHelper = new TestHelper({
      loader: new StubLoader({
        'manifest': `
          schema Foo
            Text value
          particle P in 'p.js'
            inout Foo foo
          recipe
            use as foo
            P
              foo = foo`,
        'p.js': `defineParticle(({Particle}) => class P extends Particle {
          async setHandles(handles) {
            let foo = handles.get('foo');
            foo.set(new foo.entityClass({value: 'FooBar'}));
          }
        });`
      })
    });
    await testHelper.loadManifest('manifest');
    const arc = testHelper.arc;
    arc.initDebug();

    const Foo = arc._context.findSchemaByName('Foo').entityClass();
    const fooStore = await arc.createStore(Foo.type, undefined, 'fooStore');

    const recipe = arc._context.recipes[0];
    recipe.handles[0].mapToStorage(fooStore);
    recipe.normalize();
    await arc.instantiate(recipe);

    let instantiateParticleCall = devtoolsChannelStub.messages.find(m =>
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
          storageKey: 'in-memory://!158405822139616:demo^^in-memory-0',
          type: 'Foo'
        },
      },
      implFile: 'p.js'
    });

    await util.assertSingletonWillChangeTo(fooStore, Foo, 'FooBar');
    let dateflowSetCall = devtoolsChannelStub.messages.find(m =>
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
        storageKey: 'in-memory://!158405822139616:demo^^in-memory-0',
        type: 'Foo'
      },
      data: '{"id":"!158405822139616:demo:0:inner:0","rawData":{"value":"FooBar"}}',
    });
  });
});
