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
let SlotManager = require('../slot-manager.js');
//let Suggestinator = require("../suggestinator.js");

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
  var slotManager = new SlotManager(domRoot);
  let arc = new Arc({id: 'demo', loader, pecFactory, slotManager});
  arc.createView(Person.type.viewOf(), "peopleFromWebpage");
  arc.createView(Product.type.viewOf(), "productsFromWebpage");
  arc.createView(Person.type, "personSlot");
  arc.commit([
    new Person({name: "Claire"}), 
    new Product({name: "Book About Minecraft"}), 
    new Product({name: "Power Tool Set"}),
    new Product({name: "Guardians of the Galaxy Figure"})
  ]);
  return arc;
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

let arc = prepareExtensionArc();

let demoRecipes = [[
  recipes[0],
  recipes[1],
  recipes[2]
],[
  recipes[3]
],[
  recipes[4],
  recipes[5],
  recipes[6],
  recipes[7]
],[
  recipes[8]
]];

let contextRecipes;

let suggest = (stage) => {
  stage = Math.min(stage, demoRecipes.length-1);
  let container = document.querySelector('suggestions');
  container.textContent = '';
  contextRecipes = demoRecipes[stage];
  if (contextRecipes) {
    let suggestions = contextRecipes.map(r => r.name);
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

let stage = 0;
suggest(stage++);

let chooseSuggestion = index => {
  document.querySelector('[particle-container]').textContent = '';
  arc = cloneArc(arc); //arc.clone(); //prepareExtensionArc();
  let r = buildRecipe(contextRecipes[index]);
  if (Resolver.resolve(r, arc)) {
    r.instantiate(arc);
    suggest(stage++);
  } 
};

let cloneArc = arc => {
  return (function() {
    let arc = new Arc({loader: this._loader, id: this.generateID(), pecFactory: this._pecFactory, slotManager: new SlotManager(domRoot)});
    let viewMap = new Map();
    this.views.forEach(v => viewMap.set(v, v.clone()));
    //arc.particles = this.particles.map(p => p.clone(viewMap));
    for (let v of viewMap.values())
      arc.registerView(v);
    arc._viewMap = viewMap;
    return arc;
  }).call(arc);
}