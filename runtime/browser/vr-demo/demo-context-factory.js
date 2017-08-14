/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

let Arc = require("../../arc.js");
const Manifest = require("../../manifest.js");

async function prepareDemoContext({loader, pecFactory, slotComposer}) {
  let manifest = await Manifest.load('browser/vr-demo/recipes.manifest', loader);
  // TODO: remove all Person views, once particle with no view connection intantiation is supported.
  let Person = manifest.findSchemaByName('Person').entityClass();

  // uber arc
  let pageArc = new Arc({loader, id: 'page-arc'});

  // bootstrap data context
  // TODO(sjmiles): empirically, views must exist before committing Entities
  let personView = pageArc.createView(Person.type.viewOf(), 'peopleFromWebpage');
  // commit entities
  pageArc.commit(db.people.map(p => new Person(p)));

  let personVar = pageArc.createView(Person.type, 'personFromWebpage');
  personVar.set(new Person(db.people[0]));

  // demo arc
  let arc = new Arc({id: 'demo', loader, pecFactory, slotComposer});
  arc.mapView(personView);
  // // TODO: These should be part of recipe instantiation.
  arc.mapView(personVar);

  let recipes = manifest.recipes;

  let context = {
    arc,
    recipes,
    // TODO: Remove this. Only needed for the findParticleByName strategy.
    particleFinder: manifest,
  };

  // TODO: should related arcs be part of the planner's context (above)?
  let relatedArcs = [
    pageArc,
  ];
  // your context objects
  return {relatedArcs, arc, context};
}

module.exports = prepareDemoContext;
