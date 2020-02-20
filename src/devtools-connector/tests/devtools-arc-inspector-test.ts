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
import {Loader} from '../../platform/loader.js';
import {Manifest} from '../../runtime/manifest.js';
import {Runtime} from '../../runtime/runtime.js';
import {storageKeyPrefixForTest} from '../../runtime/testing/handle-for-test.js';

import {Entity} from '../../runtime/entity.js';

describe('DevtoolsArcInspector', () => {
  before(() => DevtoolsForTests.ensureStub());
  after(() => DevtoolsForTests.reset());
  it('produces PEC Log messages on devtools channel', async () => {
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
        foo: use *
        P
          foo: foo`);
    const runtime = new Runtime({loader, context});
    const arc = runtime.newArc('demo', storageKeyPrefixForTest(), {inspectorFactory: devtoolsArcInspectorFactory});

    const foo = Entity.createEntityClass(arc.context.findSchemaByName('Foo'), null);
    const fooStore = await arc.createStore(foo.type, undefined, 'fooStore');

    const recipe = arc.context.recipes[0];
    recipe.handles[0].mapToStorage(fooStore);
    recipe.normalize();
    await arc.instantiate(recipe);

    const instantiateParticleCall = DevtoolsForTests.channel.messages.find(m =>
      m.messageType === 'PecLog' && m.messageBody.name === 'InstantiateParticle').messageBody;

    // Type on the particle spec is a complex object to reproduce, let's skip asserting on it.
    const pecMsgBody = JSON.parse(JSON.stringify(instantiateParticleCall.pecMsgBody));
    delete pecMsgBody.spec.args[0].type;

    const sessionId = arc.idGeneratorForTesting.currentSessionIdForTesting;

    assert.deepEqual(pecMsgBody, {
      id: `!${sessionId}:demo:particle1`,
      identifier: `!${sessionId}:demo:particle1`,
      reinstantiate: false,
      stores: {
        foo: 'fooStore'
      },
      spec: {
        name: 'P',
        description: {},
        external: false,
        implFile: 'p.js',
        modality: ['dom'],
        slotConnections: [],
        verbs: [],
        trustClaims: [],
        trustChecks: [],
        args: [{
          dependentConnections: [],
          direction: 'reads writes',
          isOptional: false,
          name: 'foo'
        }]
      }
    });
  });
});
