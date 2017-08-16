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
  let context = await Manifest.load('browser/demo/recipes.manifest', loader);

  // demo arc
  let arc = new Arc({id: 'demo', pecFactory, slotComposer, context});
  return {arc};
}

module.exports = prepareDemoContext;
