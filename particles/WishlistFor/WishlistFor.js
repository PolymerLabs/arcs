// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

"use strict";

defineParticle(({Particle}) => {

  let products = [
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

  return class WishlistFor extends Particle {
    setViews(views) {
      // TODO: Don't let this stay here.
      const Product = views.get('wishlist').entityClass;
      this.logDebug("person", views.get("person"));
      var wishlist = views.get('wishlist');
      products.map(p => wishlist.store(new Product(p)));
      this.logDebug("wishlist", wishlist);
      this.relevance = 8;
    }
  };
});
