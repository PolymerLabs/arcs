/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

//let runtime = require("../runtime.js");

let Arc = require("../../arc.js");
let BrowserLoader = require("../../browser-loader.js");
let SlotComposer = require('../../slot-composer.js');
//let Suggestinator = require("../../suggestinator.js");
//let SuggestionComposer = require('../../suggestion-composer.js');

//require("./trace-setup.js");

//let recipes = require('./recipes.js');
let particleRoot = global.document ? document.querySelector('[particle-container]') || document.body : {};

let loader = new BrowserLoader('../../');

let Person = loader.loadEntity("Person");
let Product = loader.loadEntity("Product");

let pecFactory = require('../worker-pec-factory.js').bind(null, '../../');

function prepareExtensionArc() {
  let slotComposer = new SlotComposer(particleRoot);
  let arc = new Arc({id: 'demo', loader, pecFactory, slotComposer});
  //
  arc.createView(Person.type.viewOf(), "peopleFromWebpage");
  arc.createView(Product.type.viewOf(), "productsFromWebpage");
  arc.createView(Person.type, "personSlot");
  arc.commit([
    new Person({name: "Claire"}),
    new Product({name: "Book About Minecraft"}),
    new Product({name: "Power Tool Set"}),
    new Product({name: "Guardians of the Galaxy Figure"})
  ]);
  //
  return {arc, slotComposer};
}

let buildRecipe = info => {
  let rb = new recipe.RecipeBuilder();
  info.particles.forEach(pi => {
    let p = rb.addParticle(pi.name);
    Object.keys(pi.constrain).forEach(k => {
      p.connectConstraint(k, pi.constrain[k]);
    });
  });
  return rb.build();
};

//

let {arc} = prepareExtensionArc();

let demoParticle = {
  name: "ShowProducts",
  constrain: {
    "list": "list"
  }
};

let renderParticle = () => {
  particleRoot.textContent = '';
  // TODO: build a new-recipe.
  let r = buildRecipe({
    particles: [
      demoParticle
    ]
  });
  // TODO: should not need to be resolved now.
  if (Resolver.resolve(r, arc)) {
    arc.instantiate(r);
  }
};

renderParticle();
