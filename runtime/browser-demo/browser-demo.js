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

let Arc = require("../arc.js");
let BrowserLoader = require("../browser-loader.js");
let Resolver = require('../resolver.js');
let SlotComposer = require('../slot-composer.js');
//let Suggestinator = require("../suggestinator.js");
//let SuggestionComposer = require('../suggestion-composer.js');

let recipe = require('../recipe.js');
let systemParticles = require('../system-particles.js');
//require("./trace-setup.js");

let recipes = require('./recipes.js');
let domRoot = global.document ? document.querySelector('[particle-container]') || document.body : {};

function prepareExtensionArc() {
  let loader = new BrowserLoader('../');
  systemParticles.register(loader);
  let Person = loader.loadEntity("Person");
  let Product = loader.loadEntity("Product");
  let pecFactory = require('../worker-pec-factory').bind(null, '../');
  var slotComposer = new SlotComposer(domRoot);
  let arc = new Arc({id: 'demo', loader, pecFactory, slotComposer});
  arc.createView(Person.type.viewOf(), "peopleFromWebpage");
  arc.createView(Product.type.viewOf(), "productsFromWebpage");
  arc.createView(Person.type, "personSlot");
  arc.commit([
    new Person({name: "Claire"}),
    new Product({name: "Book About Minecraft"}),
    new Product({name: "Power Tool Set"}),
    new Product({name: "Guardians of the Galaxy Figure"})
  ]);
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

let {arc} = prepareExtensionArc();

let demoStages = [{
  recipes: [
    recipes[0],
    recipes[1],
    recipes[2]
  ]
}, {
  retain: {list:1, personSlot:1},
  recipes: [
    recipes[3]
  ]
}, {
  recipes: [
    recipes[4],
    recipes[5],
    recipes[6],
    recipes[7]
  ]
}, {
  recipes: [
    recipes[8]
  ]
}];

let stage = 0;
let demoStage;

let nextStage = () => {
  demoStage = demoStages[stage];
  if (stage > 0) {
    arc = cloneArc(arc);
  }
  stage = Math.min(++stage, demoStages.length-1);
  suggest();
};

let suggest = () => {
  let container = document.querySelector('suggestions');
  container.textContent = '';
  if (demoStage.recipes) {
    let suggestions = demoStage.recipes.map(r => r.name);
    suggestions.forEach((s, i) => {
      container.appendChild(
        Object.assign(document.createElement("suggest"), {
          index: i,
          textContent: s,
          onclick: e => chooseSuggestion(e.currentTarget.index)
        })
      );
    });
  }
};

let chooseSuggestion = index => {
  document.querySelector('[particle-container]').textContent = '';
  let r = buildRecipe(demoStage.recipes[index]);
  if (Resolver.resolve(r, arc)) {
    r.instantiate(arc);
    nextStage();
  } else {
    console.warn('Could not resolve recipe', r, arc);
  }
};

let cloneArc = arc => {
  let neo = new Arc({
    loader: arc._loader,
    id: 'demo',
    pecFactory: arc._pecFactory,
    slotManager: new SlotManager(domRoot)
  });
  let retain = demoStage.retain;
  arc.views.forEach(v => {
    if (retain && retain[v.name]) {
      console.log('+', v.name);
      neo.mapView(v);
    }
    else console.log(v.name);
  });
  return neo;
};

nextStage();

/*
let suggestionRoot = document.querySelector('suggestions');
let suggestComposer = new SuggestionComposer(suggestionRoot, slotComposer);

let results = suggestinator.suggestinate(arc);
results.then(r => {
  console.log(r);
  suggestComposer.setSuggestions(r, arc);
});
*/