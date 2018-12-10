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
import {Planificator} from '../../plan/planificator.js';
import {TestHelper} from '../../testing/test-helper.js';

describe('planificator', function() {
  it('constructs suggestion and search storage keys for fb arc', async () => {
    const helper = await TestHelper.create();
    const arc = helper.arc;
    arc.storageKey = 'firebase://arcs-storage.firebaseio.com/AIzaSyBme42moeI-2k8WgXh-6YK_wYyjEXo4Oz8/0_6_0/testuser--LT97ssVNw_ttCZtjlMT';

    const verifySuggestion = (storageKeyBase) => {
      const key = Planificator._constructSuggestionKey(arc, 'testuser', storageKeyBase);
      assert(key, `Cannot construct key for '${storageKeyBase}' planificator storage key base`);
      assert(key.protocol,
            `Invalid protocol in key for '${storageKeyBase}' planificator storage key base`);
      assert(key.location,
            `Invalid location in key for '${storageKeyBase}' planificator storage key base`);
    };

    verifySuggestion();
    verifySuggestion('volatile://!123:demo^^');
    verifySuggestion('firebase://arcs-test.firebaseio.com/123-456-7890-abcdef/1_2_3');
    verifySuggestion('pouchdb://local/testdb/');

    assert.isTrue(Planificator._constructSearchKey(arc, 'testuser').toString().length > 0);
  });

  // TODO: add tests for Pouch and volatile arcs.
});
