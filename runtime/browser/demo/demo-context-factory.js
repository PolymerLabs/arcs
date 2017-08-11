/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

const Arc = require('../../arc.js');
const Manifest = require("../../manifest.js");

let db = {
  people: [
    {
      name: "Claire"
    }
  ],
  products: [
    {
      name: "Minecraft Book",
      category: "Books",
      seller: "denile.com",
      price: "$14.50",
      shipDays: 7,
      image: "../assets/products/book.png"
    },
    {
      name: "Power Tool Set",
      category: "Tools",
      seller: "denile.com",
      price: "$59.00",
      shipDays: 42,
      image: "../assets/products/powertool.png"
    },
    {
      name: "Guardian of the Galaxy Figure",
      category: "Toys & Collectibles",
      seller: "denile.com",
      price: "$75.00",
      shipDays: 14,
      image: "../assets/products/galaxy.png"
    }
  ]
};

let wishlistDb = [
  {
    name: "Book: How to Draw",
    category: "Books",
    seller: "gutenburger.com",
    price: "$14.50",
    shipDays: 7,
    image: "../assets/products/draw-book.png"
  },
  {
    name: "Arduino Starter Pack",
    category: "",
    seller: "arduino.cc",
    //price: "$64.95"
    //shipDays: 42
    image: "../assets/products/arduino.png"
  },
  {
    name: "Field Hockey Stick",
    category: "Sports & Outdoor",
    seller: "denile.com",
    price: "$29.00",
    shipDays: 3,
    image: "../assets/products/hockeystick.png"
  }
];

async function prepareDemoContext({loader, pecFactory, slotComposer}) {
  let manifest = await Manifest.load('browser/demo/recipes.manifest', loader);
  let Person = manifest.findSchemaByName('Person').entityClass();
  let Product = manifest.findSchemaByName('Product').entityClass();;

  // uber arc
  let pageArc = new Arc({loader, id: 'page-arc'});

  // bootstrap data context
  // TODO(sjmiles): empirically, views must exist before committing Entities
  let personView = pageArc.createView(Person.type.viewOf(), 'peopleFromWebpage');
  let productView = pageArc.createView(Product.type.viewOf(), 'productsFromWebpage');
  // commit entities
  pageArc.commit(db.people.map(p => new Person(p)));
  pageArc.commit(db.products.map(p => new Product(p)));

  let personVar = pageArc.createView(Person.type, 'personFromWebpage');
  personVar.set(new Person(db.people[0]));

  // claire's wishlist arc
  let wishlistArc = new Arc({loader, id: 'claires-wishlist-arc'});
  let wishlistView = wishlistArc.createView(Product.type.viewOf(), 'claires-wishlist');
  wishlistArc.commit(wishlistDb.map(p => new Product(p)));

  // demo arc
  let arc = new Arc({id: 'demo', loader, pecFactory, slotComposer});
  arc.mapView(personView);
  arc.mapView(productView);

  // TODO: These should be part of recipe instantiation.
  arc.mapView(personVar);
  arc.mapView(wishlistView)

  let recipes = manifest.recipes;

  let context = {
    arc,
    recipes,
    people: {
      'Claire': [wishlistArc],
    },
  };

  // TODO: should related arcs be part of the planner's context (above)?
  let relatedArcs = [
    pageArc,
    wishlistArc,
  ];
  // your context objects
  return {relatedArcs, arc, Person, Product, context};
}

module.exports = prepareDemoContext;
