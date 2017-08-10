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
//require("./trace-setup.js");

function prepareDemoContext({loader, pecFactory, slotComposer}) {
  // uber arc
  let pageArc = new Arc({loader, id: "pageArc"});
  // bootstrap data context
  let Person = loader.loadEntity("Person");
  let Product = loader.loadEntity("Product");
  let personView = pageArc.createView(Person.type.viewOf(), "peopleFromWebpage");
  let productView = pageArc.createView(Product.type.viewOf(), "productsFromWebpage");
  pageArc.commit([
    new Person({name: "Claire"}),
    new Product({name: "Tea Pot"}),
    new Product({name: "Bee Hive"}),
    new Product({name: "Denim Jeans"})
  ]);
  // TODO(sjmiles): boilerplate? not needed until we are rendering particles (arc not pageArc?)
  // demo arc
  let arc = new Arc({id: 'demo', loader, pecFactory, slotComposer});
  arc.mapView(personView);
  arc.mapView(productView);
  /*let personSlot =*/ arc.createView(Person.type, "personSlot");
  // context objects
  return {pageArc, arc, Person, Product};
}

module.exports = prepareDemoContext;