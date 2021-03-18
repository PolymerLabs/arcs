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
import {Flags} from '../../runtime/flags.js';
import {SingletonType} from '../../types/lib-types.js';

describe('DevtoolsArcInspector', () => {
  before(() => DevtoolsForTests.ensureStub());
  after(() => DevtoolsForTests.reset());
  it('produces PEC Log messages on devtools channel', Flags.withDefaultReferenceMode(async () => {
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
    const arc = runtime.getArcById(await runtime.allocator.startArc({arcName: 'demo', storageKeyPrefix: storageKeyPrefixForTest(), inspectorFactory: devtoolsArcInspectorFactory}));

    const foo = Entity.createEntityClass(arc.context.findSchemaByName('Foo'), null);
    const fooStore = await arc.createStore(new SingletonType(foo.type), undefined, 'fooStore');

    const recipe = arc.context.recipes[0];
    recipe.handles[0].mapToStorage(fooStore);
    await runtime.allocator.runPlanInArc(arc.id, recipe);

    const instantiateParticleCall = DevtoolsForTests.channel.messages.find(m =>
      m.messageType === 'PecLog' && m.messageBody.name === 'InstantiateParticle').messageBody;

    // Type on the particle spec is a complex object to reproduce, let's skip asserting on it.
    const pecMsgBody = JSON.parse(JSON.stringify(instantiateParticleCall.pecMsgBody));
    delete pecMsgBody.spec.args[0].type;

    const sessionId = arc.idGenerator.currentSessionIdForTesting;

    assert.deepEqual(pecMsgBody, {
      id: `!${sessionId}:demo:particle3`,
      identifier: `!${sessionId}:demo:particle3`,
      reinstantiate: false,
      storeMuxers: {},
      stores: {
        foo: 'fooStore'
      },
      spec: {
        name: 'P',
        description: null,
        external: false,
        implFile: 'p.js',
        modality: ['dom'],
        slotConnections: [],
        verbs: [],
        trustClaims: [],
        trustChecks: [],
        annotations: [],
        args: [{
          annotations: [],
          dependentConnections: [],
          direction: 'reads writes',
          isOptional: false,
          expression: null,
          name: 'foo',
          relaxed: false
        }]
      }
    });
  }));
});
