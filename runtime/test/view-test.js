/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
 "use strict";

var runtime = require("../runtime.js");
var Arc = require("../arc.js");
let assert = require('chai').assert;
const SlotComposer = require('../slot-composer.js');

let view = require('../view.js');
let viewlet = require('../viewlet.js');

let loader = new (require('../loader'));
const slotComposer = new SlotComposer({});
const Bar = runtime.testing.testEntityClass('Bar');

describe('View', function() {

  it('clear singleton view', async () => {
    let arc = new Arc({loader, slotComposer});
    let barView = arc.createView(Bar.type);
    barView.set(new Bar({value: 'a Bar'}));
    barView.clear();
    assert.equal(barView.get(), undefined);
  });

  it('remove entry from view', async () => {
    let arc = new Arc({loader, slotComposer});
    let barView = arc.createView(Bar.type.viewOf());
    let bar = new Bar({id: 0, value: 'a Bar'});
    barView.store(bar);
    barView.remove(bar.id);
    assert.equal(barView.toList().length, 0);
  });
});
