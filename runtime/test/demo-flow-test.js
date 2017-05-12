/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

var runtime = require("../runtime.js");
var Arc = require("../arc.js");
var Loader = require("../loader.js");
var Suggestinator = require("../suggestinator.js");
var recipe = require('../recipe.js');
var systemParticles = require('../system-particles.js');
let assert = require('chai').assert;

require("./trace-setup.js");

function prepareExtensionArc() {
  let loader = new Loader();
  let Person = loader.loadEntity("Person");
  let Product = loader.loadEntity("Product");
  var arc = new Arc({loader});
  systemParticles.register(loader);
  var personView = arc.createView(Person.type.viewOf(), "peopleFromWebpage");
  var productView = arc.createView(Product.type.viewOf(), "productsFromWebpage");
  var personSlot = arc.createView(Person.type, "personSlot");
  arc.commit([new Person({name: "Claire"}), new Product({name: "Tea Pot"}), new Product({name: "Bee Hive"}), 
              new Product({name: "Denim Jeans"})]);
  return arc;
}

class FakeSlotManager {
  constructor(pec) {
    this.pec = pec;
    this.expectQueue = [];
    this.specs = new Map();
    this.onExpectationsComplete = () => undefined;
  }

  expectGetSlot(name, slotId) {
    this.expectQueue.push({type: 'getSlot', name, slotId});
    return this;
  }

  expectRender(name) {
    this.expectQueue.push({type: 'render', name});
    return this;
  }

  thenSend(slot, event, data) {
    this.expectQueue[this.expectQueue.length - 1].then = {slot, event, data};
    return this;
  }

  expectationsCompleted() {
    if (this.expectQueue.length == 0)
      return Promise.resolve();
    return new Promise((resolve, reject) => this.onExpectationsComplete = resolve);
  }

  _sendEvent({slot, event, data}) {
    var spec = this.specs.get(slot);
    console.log(slot);
    this.pec.sendEvent(spec, {handler: event, data});
  }

  renderSlot(particleSpec, content) {
    var expectation = this.expectQueue.shift();
    assert(expectation, "Got a render but not expecting anything further.");
    assert.equal('render', expectation.type, `expecting a render, not ${expectation.type}`);
    assert.equal(particleSpec.particle.spec.name, expectation.name, 
        `expecting a render from ${expectation.name}, not ${particleSpec.particle.spec.name}`);
    if (expectation.then) {
      this._sendEvent(expectation.then);
    }
    if (this.expectQueue.length == 0)
      this.onExpectationsComplete();
  }

  registerSlot(particleSpec, slotId) {
    var expectation = this.expectQueue.shift();
    assert(expectation, "Got a getSlot but not expecting anything further");
    assert.equal('getSlot', expectation.type, `expecting a getSlot, not ${expectation.type}`);
    assert.equal(particleSpec.particle.spec.name, expectation.name,
        `expecting a getSlot from ${expectation.name}, not ${particleSpec.particle.spec.name}`);
    assert.equal(slotId, expectation.slotId,
        `expecting slotId ${expectation.slotId}, not ${slotId}`);
    this.specs.set(slotId, particleSpec);
    return Promise.resolve().then(() => {
      if (expectation.then) {
        this._sendEvent(expectation.then);
      }
      if (this.expectQueue.length == 0)
        this.onExpectationsComplete();      
    });
  }
}

describe('demo flow', function() {
  it('flows like a demo', function(done) {
    let arc = prepareExtensionArc();
    var r = new recipe.RecipeBuilder()
      .addParticle("Create")
        .connectConstraint("newList", "list")
      .addParticle("Create")
        .connectConstraint("newList", "recommended")        
      .addParticle("WishlistFor")
        .connectConstraint("wishlist", "wishlist")
        .connectConstraint("person", "person")
      .addParticle("Recommend")
        .connectConstraint("known", "list")
        .connectConstraint("population", "wishlist")
        .connectConstraint("recommendations", "recommended")
      .addParticle("SaveList")
        .connectConstraint("list", "list")
      .addParticle("Choose")
        .connectConstraint("singleton", "person")
      .addParticle("ListView")
        .connectConstraint("list", "list")
      .addParticle("Chooser")
        .connectConstraint("choices", "recommended")
        .connectConstraint("resultList", "list")
      .build();
    var suggestinator = new Suggestinator();
    suggestinator._getSuggestions = a => [r];
    var results = suggestinator.suggestinate(arc);
    results.then(async r => {
      console.log(r);
      var slotManager = new FakeSlotManager(arc.pec);
      slotManager.expectGetSlot("ListView", "root")
                 .expectGetSlot("Chooser", "action")
                 .expectRender("ListView")
                 .expectRender("ListView")
                 .expectRender("Chooser")
                 .expectRender("Chooser")
                 .expectRender("Chooser")
                 .expectRender("Chooser")
                 .expectRender("Chooser")
                 .thenSend("action", "chooseValue", {key: "1"})
                 .expectRender("ListView")
                 .expectRender("Chooser");

      arc.pec.slotManager = slotManager;
      r[0].instantiate(arc);
      await slotManager.expectationsCompleted();
      done();
    });

  });
});
