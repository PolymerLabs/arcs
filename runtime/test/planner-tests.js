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

let Arc = require('../arc.js');
let Loader = require('../loader.js');
let Planner = require('../planner.js');
let assert = require('chai').assert;

let systemParticles = require('../system-particles.js');
var loader = new Loader();
systemParticles.register(loader);
let Person = loader.loadEntity("Person");
let Product = loader.loadEntity("Product");

describe('Planner', function() {

  it('make a plan', async () => {
    var a = new Arc({id: "test-plan-arc", loader});
    var p = new Planner();
    var population = await(p.plan(a));
    assert.equal(5, population.length);
  });

  it('make a plan with views', async () => {
    var a = new Arc({id: "test-plan-arc", loader});
    var personView = a.createView(Person.type.viewOf(), "aperson");
    var productView = a.createView(Product.type.viewOf(), "products");

    var p = new Planner();
    var population = await(p.plan(a));
    assert.equal(6, population.length);
    console.log(population.length);
    for (var p of population) {
      console.log(p.result.toString());
    }
  });
});
