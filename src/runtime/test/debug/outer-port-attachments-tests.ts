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
import {StubLoader} from '../../testing/stub-loader.js';
import {DevtoolsForTests} from '../../debug/devtools-connection.js';
import {Random} from '../../random.js';
import {TestHelper} from '../../testing/test-helper.js';

describe('OuterPortAttachment', () => {
  before(() => DevtoolsForTests.ensureStub());
  after(() => DevtoolsForTests.reset());
  it('produces PEC Log messages on devtools channel', async () => {
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

    const foo = arc.context.findSchemaByName('Foo').entityClass();
    const fooStore = await arc.createStore(foo.type, undefined, 'fooStore');

    const recipe = arc.context.recipes[0];
    recipe.handles[0].mapToStorage(fooStore);
    recipe.normalize();
    await arc.instantiate(recipe);

    const instantiateParticleCall = DevtoolsForTests.channel.messages.find(m =>
      m.messageType === 'PecLog' && m.messageBody.name === 'InstantiateParticle').messageBody;

    // Type is a complex object to reproduce, let's skip asserting on it.
    delete instantiateParticleCall.pecMsgBody.spec.args[0].type;

    assert.deepEqual(instantiateParticleCall.pecMsgBody, {
      // IDs are stable thanks to Random.seedForTests().
      id: '!85915497922560:demo:particle1',
      identifier: '!85915497922560:demo:particle1',
      handles: {
        foo: 'fooStore'
      },
      spec: {
        name: 'P',
        description: {},
        implFile: 'p.js',
        modality: ['dom'],
        slots: [],
        verbs: [],
        args: [{
          dependentConnections: [],
          direction: 'inout',
          isOptional: false,
          name: 'foo'
        }]
      }
    });
  });
});
