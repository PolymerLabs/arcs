'use strict';

import {assert} from '../../platform/chai-web.js';
import {given} from '../aop.js';


describe('given decorator', () => {

  it('decorates a function with a trivial runnable.', async () => {
    let mutable = 'start ';

    const doFirst = () => mutable += 'doFirst ';
    const worker = () => mutable += 'worker';

    const decorator = given(doFirst);

    const decorated = decorator(worker);

    await decorated();

    assert.equal(mutable, 'start doFirst worker', 'should allow me to request preconditions');
  });
});
