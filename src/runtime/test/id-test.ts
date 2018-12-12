/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Id} from '../id.js';
import {Random} from '../random.js';
import {assert} from '../../platform/assert-web.js';

describe('Id', () => {
  it('parses id from string representation', async () => {
    Random.seedForTests();

    const initialId = Id.newSessionId().fromString('test');

    assert.equal('!85915497922560:test', initialId.toString(),
        'Both Session ID and the component should be part of the serialized ID');
    assert.equal('!85915497922560:test:0', initialId.createId().toString(),
        'Session ID should remain the same in the newly created sub-ID');

    const deserializedInNewSession = Id.newSessionId().fromString(initialId.toString());
    
    assert.equal('!85915497922560:test', deserializedInNewSession.toString(),
        'Original session ID should be present in the serialized form of a deserialized ID');
    assert.equal('!255961043304448:test:0', deserializedInNewSession.createId().toString(),
        'Sub-ID created inside a new session should be serialized with a new Session ID');
  });
});
