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
let Resolver = require('../../resolver.js');
let SlotComposer = require('../../slot-composer.js');
//let Suggestinator = require("../suggestinator.js");
let recipe = require('../../recipe.js');
let systemParticles = require('../../system-particles.js');
//require("./trace-setup.js");

let recipes = require('./recipes.js');
let domRoot = global.document ? document.querySelector('[particle-container]') || document.body : {};

function prepareExtensionArc() {
  let loader = new BrowserLoader('../../');
  systemParticles.register(loader);
  let Person = loader.loadEntity("Person");
  let Product = loader.loadEntity("Product");
  let pecFactory = require('../worker-pec-factory.js').bind(null, '../../');
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

let createSuggestionDom = ((suggestion, index) => {
  let html = `
   <x3d-box z="-5" y="3" x="${index*2-2}">
      <x3d-material color="${new THREE.Color(`hsl(${60*index},100%,50%)`).getHex()}"></x3d-material>
      <x3d-physijs></x3d-physijs>
    </x3d-box>
  `;
  return Object.assign(document.createElement("suggest"), {
    index,
    innerHTML: html,
    onclick: e => chooseSuggestion(e.currentTarget.index)
  });
});

let createSuggestionVr = (s, i) => {
  let template = document.querySelector('template');
  let scene = document.querySelector('a-scene');
  let frag = document.importNode(template.content, true);
  let box = frag.children[0];
  box.setAttribute('square', `text:${s}`);
  box.setAttribute('position', `${Math.random()*6-3} 2.5 ${Math.random()*0.2-2.3}`);
  box.addEventListener('click', e => {
    box.body.applyImpulse(
      /* impulse */        new CANNON.Vec3(0, 1, -5),
      /* world position */ new CANNON.Vec3().copy(box.getComputedAttribute('position'))
    );
  });
  setTimeout(() => {
    scene.appendChild(frag);
  }, 1000*(i+1));
  //return box;
};

let createSuggestion = (s, i) => {
  createSuggestionVr(s, i);
  return createSuggestionDom(s, i);
};

let suggest = stage => {
  stage = Math.min(stage, demoRecipes.length-1);
  let container = document.querySelector('suggestions');
  container.textContent = '';
  demoRecipes[stage].map(r => r.name).forEach((s,i) => container.appendChild(createSuggestion(s,i)));
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
    let arc = new Arc({loader: this._loader, id: this.generateID(), pecFactory: this._pecFactory, slotComposer: new SlotComposer(domRoot)});
    let viewMap = new Map();
    this.views.forEach(v => viewMap.set(v, v.clone()));
    //arc.particles = this.particles.map(p => p.clone(viewMap));
    for (let v of viewMap.values())
      arc.registerView(v);
    arc._viewMap = viewMap;
    return arc;
  }).call(arc);
};