/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

let Arc = require('../../arc.js');
let systemParticles = require('../../system-particles.js');
//require('./trace-setup.js');

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

function prepareDemoContext({loader, pecFactory, slotComposer}) {
  // uber arc
  let pageArc = new Arc({loader, id: 'pageArc'});
  // bootstrap data context
  let Person = loader.loadEntity('Person');
  let Product = loader.loadEntity('Product');
  // TODO(sjmiles): empirically, views must exist before committing Entities
  let personView = pageArc.createView(Person.type.viewOf(), 'peopleFromWebpage');
  let productView = pageArc.createView(Product.type.viewOf(), 'productsFromWebpage');
  // commit entities
  pageArc.commit(db.people.map(p => new Person(p)));
  pageArc.commit(db.products.map(p => new Product(p)));

  // claire's wishlist arc
  let wishlistArc = new Arc({loader, id: 'claires-wishlist'});
  let wishlistView = pageArc.createView(Product.type.viewOf(), 'claires-wishlist');
  wishlistArc.commit(wishlistDb.map(p => new Product(p)));

  // demo arc
  let arc = new Arc({id: 'demo', loader, pecFactory, slotComposer});
  arc.createView(Person.type, 'personSlot');
  arc.mapView(personView);
  arc.mapView(productView);
  // TODO(sjmiles): boilerplate? not needed until we are rendering particles (arc not pageArc)?
  systemParticles.register(loader);
  let context = {
    arc,
    people: {
      'Claire': [wishlistArc],
    },
  };
  // your context objects
  return {pageArc, arc, Person, Product, context};
}

module.exports = prepareDemoContext;
