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
import {DevtoolsForTests} from '../../../devtools-connector/devtools-connection.js';
import {StubLoader} from '../../testing/stub-loader.js';
import {TestHelper} from '../../testing/test-helper.js';
import {Arc} from '../../arc.js';

describe('OuterPortAttachment', () => {
  before(() => DevtoolsForTests.ensureStub());
  after(() => DevtoolsForTests.reset());
  it('produces PEC Log messages on devtools channel', async () => {
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
    const arc = testHelper.arc as Arc;

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

    const sessionId = arc.idGeneratorForTesting.currentSessionIdForTesting;

    assert.deepEqual(instantiateParticleCall.pecMsgBody, {
      id: `!${sessionId}:demo:particle1`,
      identifier: `!${sessionId}:demo:particle1`,
      stores: {
        foo: 'fooStore'
      },
      spec: {
        name: 'P',
        description: {},
        implFile: 'p.js',
        modality: ['dom'],
        slotConnections: [],
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
