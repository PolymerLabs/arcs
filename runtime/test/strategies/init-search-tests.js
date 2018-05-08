/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
'use strict';

import {Arc} from '../../arc.js';
import {InitSearch} from '../../strategies/init-search.js';
import {assert} from '../chai-web.js';

describe('InitSearch', async () => {
  it('initializes the search recipe', async () => {
    let arc = new Arc({id: 'test-plan-arc', context: {}});
    arc._search = 'search';
    let initSearch = new InitSearch(arc);
    let inputParams = {generated: [], generation: 0};
    let results = await initSearch.generate(inputParams);
    assert.equal(results.length, 1);
    assert.equal(results[0].score, 0);
  });
});
